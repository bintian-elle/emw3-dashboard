import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('testing_notify', Path(__file__).with_name('notify.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NotificationTests(unittest.TestCase):
    def test_reuses_only_target_users_dm_without_im_write(self):
        calls = []
        def call(method, params):
            calls.append((method, params))
            if 'cursor' not in params:
                return {'channels': [{'id': 'D_OTHER', 'user': 'U_OTHER'}], 'response_metadata': {'next_cursor': 'next'}}
            return {'channels': [{'id': 'D_TARGET', 'user': 'U_TARGET'}]}
        self.assertEqual(module.resolve_channel(call, 'U_TARGET'), 'D_TARGET')
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(method == 'conversations.list' for method, _ in calls))

    def test_user_address_fallback_never_opens_new_conversation(self):
        self.assertEqual(module.resolve_channel(lambda *_: {'channels': []}, 'U_TARGET'), 'U_TARGET')

    def test_repeated_cursor_is_an_error_not_an_infinite_scan(self):
        with self.assertRaisesRegex(RuntimeError, 'repeated'):
            module.resolve_channel(lambda *_: {'channels': [], 'response_metadata': {'next_cursor': 'same'}}, 'U_TARGET')


if __name__ == '__main__':
    unittest.main()
