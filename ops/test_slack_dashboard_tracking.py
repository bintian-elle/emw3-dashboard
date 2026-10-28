import asyncio
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest
from anc_bridge import slack_dashboard_tracking as tracking
from anc_bridge.sdk import SafeCodex

THREAD = '01a178a8-3f39-7481-a8e7-ec3fffea4a50'
ORIGIN = {'sender_id': 'U088ZSEEU91', 'sender_name': 'Fiona D.'}


def test_original_requester_and_topic_cleanup():
    plan = tracking.filing_plan('继续', ORIGIN, '<https://emw3-dashboard.win/bluevua/testing|site> <@U123> 帮我检查 dashboard 数据')
    assert plan['sender_name'] == 'Fiona D.'
    assert plan['subject'] == '帮我检查 dashboard 数据'
    assert '<@' not in plan['subject']


def test_unrelated_and_unverified_sources_are_excluded():
    assert tracking.filing_plan('帮我写 content testing 文案', ORIGIN) is None
    assert tracking.filing_plan('dashboard', {}) is None
    assert tracking.filing_plan('dashboard', {'sender_id': '../../file', 'sender_name': 'bad'}) is None


def test_sticky_scope_preserves_original_topic():
    previous = tracking.filing_plan('dashboard 表格问题', ORIGIN)
    assert tracking.filing_plan('继续', ORIGIN, '最初是其他话题', previous) == previous
    assert tracking.filing_plan('继续', {'sender_id': 'U999', 'sender_name': 'Other'}, '', previous) is None


def test_native_creation_assigns_project_without_changing_agent_context():
    async def scenario():
        client = NS(thread_start=AsyncMock(return_value=NS(thread=NS(id=THREAD))))
        sdk = NS(_ensure_initialized=AsyncMock(), _client=client, dashboard_slack_filing=tracking.filing_plan('Dashboard 问题', ORIGIN))
        await SafeCodex.native_thread(sdk, '/brand/project', 'Original instructions')
        params = client.thread_start.call_args.args[0]
        assert params == {'cwd': '/brand/project', 'developerInstructions': 'Original instructions', 'projectId': tracking.DASHBOARD_PROJECT_ID}
        client.thread_start.reset_mock()
        sdk.dashboard_slack_filing = None
        await SafeCodex.native_thread(sdk, '/brand/project', 'Original instructions')
        assert 'projectId' not in client.thread_start.call_args.args[0]
    asyncio.run(scenario())


def fake_sdk(status='idle', name=None, cwd='/brand/project'):
    response = NS(model_dump=lambda: {'thread': {'status': {'type': status}, 'name': name, 'cwd': cwd}})
    return NS(_client=NS(request=AsyncMock(return_value=response), thread_set_name=AsyncMock()))


def test_completed_thread_is_named_filed_and_cached(tmp_path, monkeypatch):
    monkeypatch.setattr(tracking, 'STATE', tmp_path)
    sdk = fake_sdk()
    plan = tracking.filing_plan('Dashboard 数据问题', ORIGIN)
    asyncio.run(tracking.file_completed(sdk, THREAD, plan))
    sdk._client.thread_set_name.assert_awaited_once_with(THREAD, 'Dashboard · slack · Fiona D. · Dashboard 数据问题')
    assert sdk._client.request.call_args.args[:2] == ('thread/settings/update', {'threadId': THREAD, 'cwd': tracking.DASHBOARD_ROOT})
    assert tracking.cached_plan(THREAD) == plan
    assert (tmp_path / (THREAD + '.json')).stat().st_mode & 0o777 == 0o600
    assert tracking.cached_plan('../outside') is None


def test_existing_curated_subject_is_not_overwritten(tmp_path, monkeypatch):
    monkeypatch.setattr(tracking, 'STATE', tmp_path)
    sdk = fake_sdk(name='Dashboard · slack · Fiona D. · 精简主题', cwd=tracking.DASHBOARD_ROOT)
    asyncio.run(tracking.file_completed(sdk, THREAD, tracking.filing_plan('Dashboard long question', ORIGIN)))
    sdk._client.thread_set_name.assert_not_awaited()
    assert sdk._client.request.await_count == 1


def test_live_turn_is_not_moved(tmp_path, monkeypatch):
    monkeypatch.setattr(tracking, 'STATE', tmp_path)
    sdk = fake_sdk(status='active')
    asyncio.run(tracking.file_completed(sdk, THREAD, tracking.filing_plan('Dashboard 问题', ORIGIN)))
    sdk._client.thread_set_name.assert_not_awaited()
    assert sdk._client.request.await_count == 1


def test_metadata_failure_does_not_fail_ai_result(tmp_path, monkeypatch):
    monkeypatch.setattr(tracking, 'STATE', tmp_path)
    sdk = fake_sdk()
    sdk._client.request.side_effect = RuntimeError('native store unavailable')
    plan = tracking.filing_plan('Dashboard 问题', ORIGIN)
    asyncio.run(tracking.file_completed(sdk, THREAD, plan))
    assert tracking.cached_plan(THREAD) == plan


def test_execution_prepare_uses_first_sender_not_followup_sender(tmp_path, monkeypatch):
    import json
    from anc_bridge.execution import Execution
    monkeypatch.setattr(tracking, 'STATE', tmp_path)
    config = NS(auth_home='/home/codex', employee=lambda _: NS(source_dir='/brand/project', project='bluevua'))
    store = NS(one=lambda *args: {'payload': json.dumps(ORIGIN), 'input_snapshot': 'dashboard 原始问题'})
    execution = Execution(config, store, None)
    _, spec = execution.prepare({'project': 'bluevua', 'conversation': 'c1', 'codex_thread': None, 'input_snapshot': '我也有个问题'}, context={'sender_id': 'U999', 'sender_name': 'Followup User'})
    assert spec['_dashboard_slack_filing']['sender_name'] == 'Fiona D.'
    assert spec['cwd'] == '/brand/project'
