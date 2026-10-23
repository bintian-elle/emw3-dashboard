import copy
import unittest
from anc_bridge.dashboard.testing_input import compact_testing_payload, plan_testing_payloads, shape

class TestingInputTests(unittest.TestCase):
    def test_exact_duplicate_only_and_frozen_input_unchanged(self):
        data = {'spend': 12.3, 'ads': [{'name': 'Ad', 'clicks': 4}]}
        original = {'periods': [{'tests': [{'data': data}]}], 'creative_catalog': {'same': copy.deepcopy(data), 'different_period': {**data, 'spend': 99}}}
        before = copy.deepcopy(original)
        result = compact_testing_payload(original)
        self.assertEqual(original, before)
        self.assertNotIn('same', result['creative_catalog'])
        self.assertEqual(result['creative_catalog_references']['same'], 'periods[0].tests[0].data')
        self.assertEqual(result['creative_catalog']['different_period']['spend'], 99)
        self.assertEqual(result['periods'], original['periods'])

    def test_large_batch_partitions_without_dropping_periods_or_history(self):
        periods = [{'period': {'label': str(i)}, 'tests': [{'data': list(range(16000))}]} for i in range(2)]
        payload = {'periods': periods, 'creative_catalog': {'history': [1, 2, 3]}}
        self.assertGreater(shape(payload)[0], 30000)
        parts = plan_testing_payloads(payload)
        self.assertEqual([p['periods'][0] for p in parts], periods)
        self.assertTrue(all(shape(p)[0] <= 30000 for p in parts))
        self.assertTrue(all(p['creative_catalog']['history'] == [1, 2, 3] for p in parts))

    def test_single_oversized_period_is_rejected_explicitly(self):
        with self.assertRaisesRegex(ValueError, 'testing_period_complexity'):
            plan_testing_payloads({'periods': [{'tests': [{'data': list(range(31000))}]}]})

    def test_depth_guard_preserved(self):
        nested = 0
        for _ in range(22):
            nested = [nested]
        with self.assertRaisesRegex(ValueError, 'payload_complexity'):
            plan_testing_payloads({'periods': nested})

class ProviderPartitionTests(unittest.IsolatedAsyncioTestCase):
    async def test_partitioned_results_are_merged_in_original_order(self):
        import json
        from types import SimpleNamespace
        from unittest.mock import AsyncMock, patch
        from anc_bridge.dashboard import provider
        class Request(SimpleNamespace):
            def model_copy(self, update):
                return Request(**{**vars(self), **update})
        periods = [{'period': {'label': str(i)}, 'tests': [{'data': list(range(16000))}]} for i in range(2)]
        request = Request(mode='testing_readout', analysis_payload={'periods': periods}, insight_prompt='Original requirements')
        async def output(scoped, *args):
            label = scoped.analysis_payload['periods'][0]['period']['label']
            return json.dumps({'schema_version': '1.0', 'run_mode': 'period_readout_batch', 'period_readouts': [
                {'schema_version': '1.0', 'run_mode': 'period_readout', 'period': {'label': 'Week-to-date', 'start': '2026-10-20', 'end': '2026-10-22'},
                 'comparison': None, 'overview': {'executive_summary': label, 'key_findings': [], 'recommended_actions': [], 'data_gaps': []}, 'tests': []}]})
        p = provider.NativeProvider('/tmp', '/tmp')
        with patch.object(p, '_generate_once', AsyncMock(side_effect=output)) as run:
            result = json.loads(await p._generate(request, None, lambda *args: None))
        self.assertEqual([r['overview']['executive_summary'] for r in result['period_readouts']], ['0', '1'])
        self.assertEqual(run.await_count, 2)
        self.assertTrue(all('ONLY' in call.args[0].insight_prompt for call in run.call_args_list))

    def test_other_modes_keep_original_complexity_limit(self):
        from anc_bridge.dashboard.contracts import JobRequest
        from pydantic import ValidationError
        with self.assertRaisesRegex(ValidationError, 'payload_complexity'):
            JobRequest.model_validate({'request_id': 'test-1', 'mode': 'question', 'question': 'What?', 'language': 'en',
                                      'period': {'start': '2026-10-01', 'end': '2026-10-22'}, 'comparison': None,
                                      'preset_label': 'Test', 'comparison_label': 'None', 'analysis_payload': {'data': list(range(31000))}})
