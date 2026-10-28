import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('dashboard_thread_project', Path(__file__).with_name('dashboard-thread-project.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_native_creation_preserves_context_and_sets_title_without_section():
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    from anc_bridge.sdk import SafeCodex

    async def scenario():
        client = SimpleNamespace(thread_start=AsyncMock(return_value=SimpleNamespace(thread=SimpleNamespace(id='test-thread'))), thread_set_name=AsyncMock(), request=AsyncMock())
        sdk = SimpleNamespace(_ensure_initialized=AsyncMock(), _client=client)
        await SafeCodex.dashboard_thread(sdk, Path('/brand/context'), 'Keep instructions', title='Bluevua · Dashboard Ask AI · user@example.com')
        params = client.thread_start.call_args.args[0]
        assert params['cwd'] == '/brand/context'
        assert params['developerInstructions'] == 'Keep instructions'
        assert params['projectId'] == module.DASHBOARD_PROJECT_ID
        assert params['ephemeral'] is False
        client.thread_set_name.assert_awaited_once_with('test-thread', 'Bluevua · Dashboard Ask AI · user@example.com')
        client.request.assert_not_awaited()
    asyncio.run(scenario())
