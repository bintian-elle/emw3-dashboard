import asyncio
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock
from daily_staged import campaign_packet, channel_packet, merge_channel


class DailyStagedTests(unittest.TestCase):
    def setUp(self):
        self.packet = {'report_id': 'pmax', 'tests': [{'test_id': 'A'}, {'test_id': 'B'}],
                       'supporting_data': {'daily_history': {'A': [1], 'B': [2]}}}

    def test_campaign_job_contains_one_target(self):
        part = campaign_packet(self.packet, 'A')
        self.assertEqual([t['test_id'] for t in part['tests']], ['A'])
        self.assertEqual(part['supporting_data']['daily_history'], {'A': [1]})
        self.assertEqual(len(self.packet['tests']), 2)

    def test_channel_receives_campaign_findings_and_merge_preserves_them(self):
        reports = [{'campaigns': [{'test_id': x, 'summary': x, 'detail_markdown': x}]} for x in ['A', 'B']]
        packet = channel_packet(self.packet, reports)
        self.assertEqual(packet['completed_campaign_reports'], reports)
        self.assertEqual(packet['tests'], [])
        report = {'campaigns': [], 'sections': [{'markdown': 'Original'}]}
        merged = merge_channel(report, reports)
        self.assertEqual(merged['campaigns'], [x['campaigns'][0] for x in reports])
        self.assertEqual(merged['sections'], report['sections'])

    def test_daily_controller_runs_campaigns_before_channel_then_overview(self):
        bridge, sdk = types.ModuleType('anc_bridge'), types.ModuleType('anc_bridge.sdk')
        sdk.SafeCodex = sdk.native_config = sdk.NativeControlResult = object
        with mock.patch.dict(sys.modules, {'anc_bridge': bridge, 'anc_bridge.sdk': sdk}):
            spec = importlib.util.spec_from_file_location('daily_runner_test', Path(__file__).with_name('run-preview.py'))
            runner = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(runner)
        events = []
        async def fake_run(root, only=None, staged=False, staged_context=False):
            if only == 'overview':
                events.append('overview')
                self.assertTrue((root/'results/pmax.json').exists())
                return
            packet = json.loads((root/'inputs/pmax.json').read_text())
            stage = packet['generation_stage']
            if stage['kind'] == 'campaign':
                name = stage['campaign']; events.append(name)
                campaigns = [{'test_id':name,'summary':name,'detail_markdown':name}]
            else:
                events.append('channel')
                self.assertEqual(len(packet['completed_campaign_reports']),2)
                campaigns = []
            runner.save(root/'results/pmax.json',{'campaigns':campaigns,'sections':[{'markdown':'original'}]})
        runner.run = fake_run
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); (root/'prompts').mkdir()
            runner.save(root/'manifest.json',{'run_id':'test','reports':[{'report_id':'pmax'}]})
            runner.save(root/'inputs/pmax.json',self.packet)
            asyncio.run(runner.run_daily_staged(root))
            self.assertEqual(events,['A','B','channel','overview'])
            self.assertEqual([c['test_id'] for c in json.loads((root/'results/pmax.json').read_text())['campaigns']],['A','B'])


if __name__ == '__main__': unittest.main()
