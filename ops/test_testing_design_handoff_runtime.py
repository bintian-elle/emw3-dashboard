"""Regression tests for the backend-only Testing Design handoff."""
import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from anc_bridge.dashboard.contracts import JobRequest, Answer
from anc_bridge.dashboard.design_handoff import (
    BluevuaDesignAnswer, DesignHandoff, HandoffJournal, HandoffBlocked,
    enabled, complete_handoff, DESIGN_DEADLINE, extend_design_deadline,
)
from anc_bridge.dashboard.provider import NativeProvider


def request(**changes):
    body=dict(request_id='design-test-1',mode='question',language='en',
        period={'start':'2026-10-13','end':'2026-10-19'},comparison=None,
        preset_label='Custom',comparison_label='None',question='Make a design brief.',
        latest_user_message='Ask AI Design for a read-only design review.',
        analysis_payload={'chat':{'owner':'b'*64,'conversationId':'test'},'tests':[]},
        dashboard_id='bluevua-testing-chat',
        conversation={'project':'bluevua','kind':'ask','owner_key':'a'*64,'email':'qa@elle-media.com'})
    body.update(changes)
    return JobRequest.model_validate(body)


def plan(brief='Review the supplied layout without changing files.'):
    return BluevuaDesignAnswer(answer_markdown='I prepared the brief.',design_handoff=DesignHandoff(brief=brief))


def test_only_authenticated_testing_questions_can_route():
    assert enabled(request())
    assert not enabled(request(dashboard_id='bluevua-edm'))
    assert not enabled(request(conversation=None))
    assert not enabled(request(analysis_payload={'chat':{'owner':'not-valid'}}))
    assert not enabled(request(latest_user_message=None))


def test_journal_preserves_owner_idempotency_and_uncertain_execution(tmp_path):
    journal=HandoffJournal(tmp_path)
    assert journal.reserve('job-1','a'*64,'brief') is None
    journal.identity('job-1','design-thread','design-turn')
    journal.finish('job-1',{'answer_markdown':'Done.'})
    assert journal.reserve('job-1','a'*64,'brief')=={'answer_markdown':'Done.'}
    with pytest.raises(HandoffBlocked):journal.reserve('job-1','b'*64,'brief')
    with pytest.raises(HandoffBlocked):journal.reserve('job-1','a'*64,'different brief')
    journal.reserve('job-2','a'*64,'brief')
    with pytest.raises(HandoffBlocked):journal.reserve('job-3','a'*64,'brief')
    assert journal.reserve('job-4','b'*64,'brief') is None
    journal.close()


async def test_ordinary_question_remains_one_bluevua_turn(tmp_path,monkeypatch):
    provider=NativeProvider(tmp_path,tmp_path/'capacity')
    provider._generate_once=AsyncMock(return_value=json.dumps({'answer_markdown':'Performance only.','design_handoff':None}))
    monkeypatch.setattr('anc_bridge.dashboard.provider.complete_handoff',AsyncMock(side_effect=AssertionError('must not run Design')))
    raw=await provider.generate(request(latest_user_message='Which ad performed best?'),None,lambda *_:None)
    assert Answer.model_validate_json(raw).answer_markdown=='Performance only.'
    assert provider._generate_once.await_count==1


async def test_handoff_dispatch_does_not_replace_bluevua_identity(tmp_path,monkeypatch):
    provider=NativeProvider(tmp_path,tmp_path/'capacity')
    identity=[]
    async def bluevua(*args,**kwargs):
        args[2]('bluevua-thread','bluevua-turn')
        return plan().model_dump_json()
    provider._generate_once=AsyncMock(side_effect=bluevua)
    handoff=AsyncMock(return_value='{"answer_markdown":"AI Design result."}')
    monkeypatch.setattr('anc_bridge.dashboard.provider.complete_handoff',handoff)
    raw=await provider.generate(request(),None,lambda *values:identity.append(values))
    assert Answer.model_validate_json(raw).answer_markdown=='AI Design result.'
    assert identity==[('bluevua-thread','bluevua-turn')]
    assert handoff.await_count==1


async def test_completed_design_result_is_reused_and_delivered_as_existing_answer(tmp_path,monkeypatch):
    runner=AsyncMock(return_value='{"answer_markdown":"Review complete. [Preview](https://example.com/preview)"}')
    monkeypatch.setattr('anc_bridge.dashboard.design_handoff.run_design_native',runner)
    monkeypatch.setenv('DASHBOARD_STATE_DIR',str(tmp_path))
    first=await complete_handoff(request(),plan(),tmp_path/'capacity',tmp_path)
    second=await complete_handoff(request(),plan(),tmp_path/'capacity',tmp_path)
    assert first==second and runner.await_count==1
    assert '[Preview](https://example.com/preview)' in Answer.model_validate_json(first).answer_markdown


async def test_cancelled_design_is_not_reexecuted(tmp_path,monkeypatch):
    monkeypatch.setenv('DASHBOARD_STATE_DIR',str(tmp_path))
    runner=AsyncMock(side_effect=asyncio.CancelledError)
    monkeypatch.setattr('anc_bridge.dashboard.design_handoff.run_design_native',runner)
    with pytest.raises(asyncio.CancelledError):await complete_handoff(request(),plan(),tmp_path/'capacity',tmp_path)
    raw=await complete_handoff(request(),plan(),tmp_path/'capacity',tmp_path)
    assert runner.await_count==1
    assert 'not' in Answer.model_validate_json(raw).answer_markdown.lower()


async def test_design_failure_returns_honest_reply_without_claiming_success(tmp_path,monkeypatch):
    monkeypatch.setenv('DASHBOARD_STATE_DIR',str(tmp_path))
    monkeypatch.setattr('anc_bridge.dashboard.design_handoff.run_design_native',AsyncMock(side_effect=RuntimeError('private internal value')))
    raw=await complete_handoff(request(),plan(),tmp_path/'capacity',tmp_path)
    text=Answer.model_validate_json(raw).answer_markdown
    assert 'could not' in text and 'private internal value' not in text


async def test_deadline_extension_is_scoped_to_actual_handoff():
    async with asyncio.timeout(1) as deadline:
        token=DESIGN_DEADLINE.set(deadline)
        before=deadline.when()
        extend_design_deadline()
        assert deadline.when()>before+100
        DESIGN_DEADLINE.reset(token)
    assert DESIGN_DEADLINE.get() is None

async def test_native_design_cancel_interrupts_only_design_turn_and_cleans_attachments(tmp_path,monkeypatch):
    from anc_bridge.dashboard import design_handoff as module
    captured={}
    class Turn:
        id='design-turn'
        async def stream(self):
            raise asyncio.CancelledError()
            yield None
        async def interrupt(self):captured['interrupted']=True
    class SDK:
        def __init__(self,config):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def dashboard_thread(self,cwd,prompt,**kwargs):
            captured['cwd']=cwd;captured['prompt']=prompt
            assert 'thread_id' not in kwargs
            return SimpleNamespace(id='design-thread')
        async def dashboard_turn(self,thread,text,schema,**kwargs):
            captured['payload']=json.loads(text)
            captured['images']=kwargs['images']
            assert Path(captured['images'][0]).exists()
            return Turn()
    monkeypatch.setattr(module,'SafeCodex',SDK)
    image={'kind':'image','name':'source.png','mime_type':'image/png','data':'iVBORw0KGgp0ZXN0'}
    identities=[]
    with pytest.raises(asyncio.CancelledError):
        await module.run_design_native(request(attachments=[image]),'Review only',tmp_path/'capacity',tmp_path,lambda *x:identities.append(x))
    assert captured['cwd']==module.DESIGN_PROJECT
    assert captured['interrupted']
    assert not Path(captured['images'][0]).exists()
    assert captured['payload']['latest_user_message']==request().latest_user_message
    assert identities==[('design-thread',None),('design-thread','design-turn')]

async def test_existing_http_job_contract_returns_design_answer_and_owner_history(tmp_path,monkeypatch):
    from aiohttp.test_utils import TestClient,TestServer
    from anc_bridge.dashboard.service import create_app
    from anc_bridge.dashboard.settings import Settings
    key='test-only-design-bridge-key-32-characters'
    monkeypatch.setenv('DASHBOARD_STATE_DIR',str(tmp_path/'private'))
    provider=NativeProvider(tmp_path,tmp_path/'capacity')
    async def bluevua(*args,**kwargs):
        args[2]('bluevua-http-thread','bluevua-http-turn')
        return plan().model_dump_json()
    provider._generate_once=AsyncMock(side_effect=bluevua)
    monkeypatch.setattr('anc_bridge.dashboard.design_handoff.run_design_native',AsyncMock(return_value='{"answer_markdown":"Verified design review result."}'))
    async with TestClient(TestServer(create_app(Settings(key,state_dir=tmp_path/'bridge',capacity_dir=tmp_path/'capacity'),provider))) as client:
        headers={'Authorization':'Bearer '+key}
        response=await client.post('/v1/codex/jobs',json=request().model_dump(mode='json'),headers=headers)
        assert response.status==202
        job=(await response.json())['job_id']
        async with asyncio.timeout(5):
            while True:
                result=await (await client.get('/v1/codex/jobs/'+job,headers=headers)).json()
                if result['status'] in ('completed','failed'):break
                await asyncio.sleep(.01)
        assert result['status']=='completed'
        assert result['result']=={'answer_markdown':'**AI Design**\n\nVerified design review result.'}
        history=await (await client.post('/v1/codex/conversations/history',json=request().conversation.model_dump(mode='json'),headers=headers)).json()
        assert history['turns'][0]['result']==result['result']
