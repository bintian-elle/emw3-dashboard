"""File Dashboard-related Slack histories without changing live AI execution."""
import asyncio
import json
import logging
import os
from pathlib import Path
import re
import tempfile

DASHBOARD_ROOT = '/home/ubuntu/work/bintian/emw3-dashboard'
DASHBOARD_PROJECT_ID = '01a182a5-3b0c-73c0-b5f6-863bcade30d9'
PREFIX = 'Dashboard · slack · '
STATE = Path(__file__).resolve().parents[2] / '.state/dashboard-slack-filing'


def related(text):
    return isinstance(text, str) and bool(re.search(
        r'\bdashboard\b|emw3-dashboard\.win|(?:这个|我们|数据|埋点|testing)\s*(?:看板|仪表盘)',
        text, re.I))


def subject(text):
    text = re.sub(r'<(?:https?://[^>]+|@[A-Z0-9]+)>', ' ', text)
    text = re.sub(r'https?://\S+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip(' #*，,：:·-')
    return (text[:96] + '…') if len(text) > 96 else (text or 'Dashboard 问题')


def cached_plan(thread_id):
    if not re.fullmatch(r'[a-f0-9-]{36}', thread_id or ''):
        return None
    path = STATE / (thread_id + '.json')
    try:
        if path.is_symlink() or path.stat().st_size > 4096:
            return None
        plan = json.loads(path.read_text())
        return plan if valid_plan(plan) else None
    except (OSError, ValueError, TypeError):
        return None


def valid_plan(plan):
    return (isinstance(plan, dict) and
            isinstance(plan.get('sender_id'), str) and
            bool(re.fullmatch(r'[UW][A-Z0-9]+', plan['sender_id'])) and
            all(isinstance(plan.get(k), str) and 0 < len(plan[k]) <= 180
                for k in ('sender_name', 'subject')))


def filing_plan(text, origin, origin_text='', previous=None):
    if not isinstance(origin, dict) or not origin.get('sender_id'):
        return None
    if valid_plan(previous) and previous['sender_id'] == origin['sender_id']:
        return previous
    if not (related(text) or related(origin_text)):
        return None
    plan = {
        'sender_id': origin['sender_id'],
        'sender_name': re.sub(r'\s+', ' ', origin.get('sender_name') or origin['sender_id']).strip()[:180],
        'subject': subject(origin_text if related(origin_text) else text),
    }
    return plan if valid_plan(plan) else None


async def file_completed(sdk, thread_id, plan):
    """Only call after a confirmed native completion. Metadata errors aren't AI failures."""
    if not valid_plan(plan) or not re.fullmatch(r'[a-f0-9-]{36}', thread_id or ''):
        return
    from .sdk import NativeControlResult
    async def update():
        STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode='w', dir=STATE, delete=False) as handle:
            json.dump(plan, handle, ensure_ascii=False)
            temporary = handle.name
        os.replace(temporary, STATE / (thread_id + '.json'))
        response = await sdk._client.request('thread/read', {
            'threadId': thread_id, 'includeTurns': False}, response_model=NativeControlResult)
        thread = response.model_dump().get('thread', {})
        # Do not overwrite a later user's active turn or a previously curated topic.
        if thread.get('status', {}).get('type') != 'idle':
            return
        expected_prefix = PREFIX + plan['sender_name'] + ' · '
        if not (thread.get('name') or '').startswith(expected_prefix):
            await sdk._client.thread_set_name(thread_id, expected_prefix + plan['subject'])
        if thread.get('cwd') != DASHBOARD_ROOT:
            await sdk._client.request('thread/settings/update', {
                'threadId': thread_id, 'cwd': DASHBOARD_ROOT}, response_model=NativeControlResult)
    try:
        await asyncio.wait_for(update(), 5)
    except Exception:
        logging.getLogger('anc_bridge').warning('dashboard_slack_filing_pending')
