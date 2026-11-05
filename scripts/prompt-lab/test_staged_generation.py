import asyncio
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from unittest import mock
from pathlib import Path
from staged_generation import generation_plan, stage_input, merge_reports


def report(scope, marker):
    return {'report_id': 'pmax', **{lang: {'presentation': {
        'schema_version': 'insight-presentation-v3', 'title': marker, 'summary': marker,
        'sections': [{'id': 'one', 'title': marker}],
        'blocks': [{'id': marker, 'scope': scope, 'section_id': 'one', 'html': marker}]},
        'campaigns': [] if scope == 'channel' else [{'test_id': scope, 'summary': marker, 'detail_markdown': marker}]}
        for lang in ('en', 'zh')}}


class StagedGenerationTests(unittest.TestCase):
    def setUp(self):
        self.job = {'mode': 'analysis', 'versions': {'readability': {}}, 'frozen_input': {
            'visual_context': {}, 'campaigns': ['A', 'B'], 'tests': [{'test_id': 'A'}, {'test_id': 'B'}]}}

    def test_campaigns_precede_channel_and_overview_is_separate(self):
        self.assertEqual(generation_plan(self.job), [('campaign', 'A'), ('campaign', 'B'), ('channel', None)])
        self.job['frozen_input']['campaigns'] = []
        self.assertEqual(generation_plan(self.job), [('single', None)])

    def test_channel_receives_unmodified_completed_campaign_results(self):
        first, second = report('A', 'first'), report('B', 'second')
        stage = stage_input(self.job, 'channel', None, [first, second])
        self.assertEqual(stage['frozen_input']['completed_campaign_reports'], [first, second])
        self.assertNotIn('completed_campaign_reports', self.job['frozen_input'])

    def test_merge_preserves_ai_blocks_and_campaign_details(self):
        first, second, channel = report('A', 'first'), report('B', 'second'), report('channel', 'channel')
        result = merge_reports(channel, [first, second])
        self.assertEqual(result['en']['presentation']['blocks'], channel['en']['presentation']['blocks'] + first['en']['presentation']['blocks'] + second['en']['presentation']['blocks'])
        self.assertEqual([c['test_id'] for c in result['zh']['campaigns']], ['A', 'B'])
        self.assertEqual(channel['en']['campaigns'], [])

    def test_orchestrator_passes_completed_campaigns_to_channel_and_resumes(self):
        bridge = types.ModuleType('anc_bridge')
        sdk = types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex = sdk.native_config = sdk.NativeControlResult = object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        calls = []
        async def fake_run(root, parent=None):
            job = json.loads((root / 'input.json').read_text())
            stage = job['_generation_stage']
            calls.append(stage['kind'] + ':' + str(stage['campaign']))
            if stage['kind'] == 'channel':
                self.assertEqual([x['en']['campaigns'][0]['test_id'] for x in job['frozen_input']['completed_campaign_reports']], ['A', 'B'])
            value = report(stage['campaign'] if stage['kind'] == 'campaign' else 'channel', calls[-1])
            module.save(root / 'result.json', value)
        module.run = fake_run
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            asyncio.run(module.run_staged(root, self.job))
            self.assertEqual(calls, ['campaign:A', 'campaign:B', 'channel:None'])
            value = json.loads((root / 'result.json').read_text())
            self.assertEqual([x['test_id'] for x in value['en']['campaigns']], ['A', 'B'])
            asyncio.run(module.run_staged(root, self.job))
            self.assertEqual(len(calls), 3)


if __name__ == '__main__':
    unittest.main()
