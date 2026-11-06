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
import staged_generation


def report(scope, marker):
    return {'report_id': 'pmax', **{lang: {'presentation': {
        'schema_version': 'insight-presentation-v3', 'title': marker, 'summary': marker,
        'sections': [{'id': 'one', 'title': marker}],
        'blocks': [{'id': marker, 'scope': scope, 'section_id': 'one', 'html': marker}]},
        'campaigns': [] if scope == 'channel' else [{'test_id': scope, 'summary': marker, 'detail_markdown': marker}]}
        for lang in ('en', 'zh')}}


class StagedGenerationTests(unittest.TestCase):
    def test_visual_analysis_sends_only_selected_prompt_contents(self):
        job = {'mode': 'analysis', 'period': {'channel': 'google-pmax'},
               'versions': {'google-pmax': {'content': 'CHANNEL'}, 'readability': {'content': 'READABILITY'}, 'master': {'content': 'OLD'}},
               'frozen_input': {'visual_context': {}, 'campaigns': ['A']}, '_generation_stage': {'kind': 'campaign', 'campaign': 'A'}}
        self.assertEqual(staged_generation.visual_analysis_instructions(job), 'CHANNEL\n\nREADABILITY')
    def test_analysis_uses_only_channel_and_readability_even_with_old_trial_versions(self):
        versions = {key: {'content': key} for key in ('master', 'manual', 'google-pmax', 'meta', 'readability')}
        self.assertEqual(staged_generation.analysis_prompt_contents(versions, 'google-pmax'), ['google-pmax', 'readability'])

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
        async def fake_run(root, parent=None, parallel=False):
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

    def test_campaigns_run_concurrently_and_channel_waits_for_all(self):
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex = sdk.native_config = sdk.NativeControlResult = object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_parallel_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

        async def exercise(root):
            started, finished = [], []
            both_started = asyncio.Event()
            async def fake_run(folder, parent=None, parallel=False):
                job = json.loads((folder / 'input.json').read_text())
                stage = job['_generation_stage']; name = stage['campaign']
                if stage['kind'] == 'campaign':
                    self.assertTrue(parallel)
                    started.append(name)
                    if len(started) == 2: both_started.set()
                    await asyncio.wait_for(both_started.wait(), timeout=0.3)
                    finished.append(name)
                    module.save(folder / 'result.json', report(name, name))
                else:
                    self.assertCountEqual(finished, ['A', 'B'])
                    self.assertEqual([r['en']['campaigns'][0]['test_id'] for r in job['frozen_input']['completed_campaign_reports']], ['A', 'B'])
                    module.save(folder / 'result.json', report('channel', 'channel'))
            module.run = fake_run
            await asyncio.wait_for(module.run_staged(root, self.job), timeout=1)
            self.assertEqual(started, ['A', 'B'])
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(exercise(Path(folder)))

    def test_failure_in_one_campaign_never_starts_channel(self):
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex = sdk.native_config = sdk.NativeControlResult = object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_failure_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        calls = []
        async def fake_run(folder, parent=None, parallel=False):
            stage = json.loads((folder / 'input.json').read_text())['_generation_stage']
            calls.append(stage['kind'])
            if stage['campaign'] == 'A': raise RuntimeError('campaign failed')
            module.save(folder / 'result.json', report(stage['campaign'], 'saved'))
        module.run = fake_run
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(RuntimeError, 'campaign failed'):
                asyncio.run(module.run_staged(Path(folder), self.job))
            self.assertNotIn('channel', calls)

    def test_campaign_parallelism_is_bounded(self):
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex = sdk.native_config = sdk.NativeControlResult = object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_limit_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        active, peak = 0, 0
        async def fake_run(folder, parent=None, parallel=False):
            nonlocal active, peak
            stage = json.loads((folder / 'input.json').read_text())['_generation_stage']
            if parallel:
                active += 1; peak = max(peak, active)
                await asyncio.sleep(0.01)
                active -= 1
            module.save(folder / 'result.json', report(stage['campaign'] if parallel else 'channel', 'saved'))
        module.run = fake_run
        job = {**self.job, 'frozen_input': {**self.job['frozen_input'], 'campaigns': ['A', 'B', 'C', 'D', 'E']}}
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(module.run_staged(Path(folder), job))
        self.assertEqual(peak, 3)

    def test_interrupt_targets_each_unfinished_parallel_turn(self):
        calls = []
        class Client:
            async def request(self, method, params, **kwargs):
                calls.append((method, params['threadId'], params['turnId']))
        class SDK:
            def __init__(self, *args, **kwargs): self._client = Client()
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def _ensure_initialized(self): pass
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex, sdk.native_config, sdk.NativeControlResult = SDK, lambda *a, **k: {}, object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_interrupt_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for index, status in enumerate(('running', 'running', 'completed')):
                stage = root / f'stage-{index:03d}'; stage.mkdir()
                module.save(stage / 'native-state.json', {'thread_id': f'thread-{index}', 'turn_id': f'turn-{index}', 'status': status})
            asyncio.run(module.interrupt(root))
        self.assertCountEqual(calls, [('turn/interrupt', 'thread-0', 'turn-0'), ('turn/interrupt', 'thread-1', 'turn-1')])

    def test_parallel_turn_with_lost_connection_is_not_submitted_again(self):
        class SDK:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def _ensure_initialized(self): pass
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex, sdk.native_config, sdk.NativeControlResult = SDK, lambda *a, **k: {}, object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_recovery_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            module.save(root / 'input.json', {**self.job, '_generation_stage': {'kind': 'campaign', 'campaign': 'A'}})
            module.save(root / 'native-state.json', {'turn_id': 'existing', 'thread_id': 'temporary', 'ephemeral': True})
            with self.assertRaisesRegex(RuntimeError, 'refusing duplicate'):
                asyncio.run(module.run(root, parallel=True))

    def test_parallel_turn_uses_temporary_session_and_only_current_prompts(self):
        calls = []
        result = report('A', 'campaign')
        class Turn:
            id = 'turn-a'
            async def stream(self):
                item = types.SimpleNamespace(type='agentMessage', phase='final_answer', text=json.dumps(result))
                yield types.SimpleNamespace(method='item/completed', payload=types.SimpleNamespace(item=types.SimpleNamespace(root=item)))
                yield types.SimpleNamespace(method='turn/completed', payload=types.SimpleNamespace(turn=types.SimpleNamespace(status='completed')))
        class SDK:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def _ensure_initialized(self): pass
            async def dashboard_thread(self, cwd, instructions, **kwargs):
                calls.append(('thread', instructions, kwargs))
                return types.SimpleNamespace(id='temporary-a')
            async def dashboard_turn(self, target, payload, schema, effort):
                calls.append(('turn', target.id, json.loads(payload)['current_prompt']))
                return Turn()
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex, sdk.native_config, sdk.NativeControlResult = SDK, lambda *a, **k: {}, object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('native_preview_sdk_test', Path(__file__).with_name('native-preview.py'))
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        job = {'id':'test', 'mode':'analysis', 'language':'zh', 'period':{'channel':'google-pmax'},
               'versions':{'google-pmax':{'content':'CHANNEL'}, 'readability':{'content':'READABILITY'}},
               'frozen_input':{'channel':'google-pmax'}, '_generation_stage':{'kind':'campaign','campaign':'A'}}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); module.save(root / 'input.json', job)
            asyncio.run(module.run(root, parallel=True))
            self.assertEqual(json.loads((root / 'result.json').read_text()), result)
            self.assertEqual(json.loads((root / 'native-state.json').read_text())['thread_id'], 'temporary-a')
        self.assertEqual(calls, [('thread', 'CHANNEL\n\nREADABILITY', {}), ('turn', 'temporary-a', 'CHANNEL\n\nREADABILITY')])


if __name__ == '__main__':
    unittest.main()
