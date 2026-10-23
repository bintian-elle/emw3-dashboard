"""Run in the Bridge venv: python -m unittest discover -s tests -p test_testing_translation_runtime.py."""
import json
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

from anc_bridge.dashboard import provider
from anc_bridge.dashboard.translation_runtime import translation_input, save_usage, usage_snapshot


class TranslationTests(unittest.IsolatedAsyncioTestCase):
    def request(self):
        return NS(request_id='request-1', dashboard_id='bluevua-testing-translation',
                  question='Translate only.', mode='question', insight_prompt=None,
                  conversation='must-not-resume', _native_thread='old-thread', _conversation_title='old title',
                  attachments=[], analysis_payload={'strings': {'s0': 'Spend $100'},
                  'source_hash': 'hash', 'cache_key': 'period:test'})

    def test_only_english_strings_are_sent(self):
        self.assertEqual(json.loads(translation_input(self.request())),
                         {'analysis_payload': {'strings': {'s0': 'Spend $100'}}})

    async def test_usage_failure_is_not_zero(self):
        sdk = NS(_client=NS(request=AsyncMock(side_effect=RuntimeError())))
        self.assertEqual(await usage_snapshot(sdk), {'unavailable': True})

    def test_private_log_contains_no_source_text(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict('os.environ', DASHBOARD_STATE_DIR=directory):
            save_usage(self.request(), 'thread', 'turn', '2026-10-23T09:00:00+00:00', {}, {}, None, True)
            target = next((Path(directory)/'translation-usage').glob('*.jsonl'))
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            row = json.loads(target.read_text())
            self.assertEqual(row['reasoning'], 'low')
            self.assertIsNone(row['tokens'])
            self.assertNotIn('Spend $100', target.read_text())

    async def test_translation_uses_fresh_short_low_effort_thread(self):
        @asynccontextmanager
        async def slot(*args, **kwargs):
            yield
        class Turn:
            id = 'new-turn'
            async def stream(self):
                yield NS(method='thread/tokenUsage/updated', payload=NS(model_dump=lambda **kwargs: {'threadId': 'new-thread', 'turnId': 'new-turn', 'tokenUsage': {'total': {'inputTokens': 100, 'outputTokens': 20}}}))
                yield NS(method='item/completed', payload=NS(item=NS(root=NS(type='agentMessage', phase='final_answer', text='{}'))))
                yield NS(method='turn/completed', payload=NS(turn=NS(status='completed')))
        sdk = AsyncMock()
        sdk.__aenter__.return_value = sdk
        sdk.dashboard_thread.return_value = NS(id='new-thread')
        sdk.dashboard_turn.return_value = Turn()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(provider, 'SafeCodex', return_value=sdk), patch.object(provider, 'native_config'), \
                 patch.object(provider, 'runtime_slot', slot), patch.object(provider, 'intent', return_value=None), \
                 patch.object(provider, 'usage_snapshot', AsyncMock(return_value={})), patch.object(provider, 'save_usage') as save:
                result = await provider.NativeProvider(Path(directory), directory).generate(self.request(), {'unwanted':'prior analysis'}, lambda *args: None)
            self.assertEqual(result, '{}')
            args = sdk.dashboard_thread.call_args.args
            self.assertEqual(len(args), 2)
            self.assertEqual(args[1], 'Translate only.')
            self.assertFalse(Path(args[0]).exists())
            self.assertEqual(sdk.dashboard_turn.call_args.kwargs['effort'], 'low')
            self.assertEqual(json.loads(sdk.dashboard_turn.call_args.args[1]), {'analysis_payload': {'strings': {'s0': 'Spend $100'}}})
            self.assertTrue(save.call_args.args[-1])
            self.assertEqual(save.call_args.args[-2]['total']['outputTokens'], 20)
