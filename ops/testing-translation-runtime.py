"""Private metering for isolated Testing translations; never stores source prose."""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from ..sdk import NativeControlResult


def translation_input(request):
    return json.dumps({'analysis_payload': {'strings': request.analysis_payload['strings']}}, ensure_ascii=False)


async def usage_snapshot(sdk):
    try:
        result = await asyncio.wait_for(sdk._client.request('account/rateLimits/read', {}, response_model=NativeControlResult), timeout=10)
        data = result.model_dump(mode='json', by_alias=True)
        return {key: data[key] for key in ('rateLimits', 'rateLimitsByLimitId') if key in data}
    except Exception:
        return {'unavailable': True}


def save_usage(request, thread_id, turn_id, started_at, before, after, tokens, completed):
    try:
        root = Path(os.environ.get('DASHBOARD_STATE_DIR', '/home/ubuntu/work/anc-slack-bridge/.state/dashboard')) / 'translation-usage'
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        strings = request.analysis_payload['strings']
        row = {'started_at': started_at, 'finished_at': datetime.now(timezone.utc).isoformat(),
               'request_id': str(request.request_id), 'thread_id': thread_id, 'turn_id': turn_id,
               'source_hash': request.analysis_payload.get('source_hash'),
               'cache_key': request.analysis_payload.get('cache_key'),
               'english_characters': sum(len(value) for value in strings.values()),
               'strings': len(strings), 'model': 'gpt-6-astra', 'reasoning': 'low',
               'completed': completed, 'tokens': tokens,
               'account_before': before, 'account_after': after,
               'account_delta_caveat': 'Account-wide snapshots may include concurrent work; never infer unavailable usage as zero.'}
        target = root / (started_at[:10] + '.jsonl')
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        with os.fdopen(fd, 'a') as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + '\n')
    except Exception:
        logging.getLogger('anc_bridge.dashboard').warning('{"event":"translation_usage_write_failed"}')
