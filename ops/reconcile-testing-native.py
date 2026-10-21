"""Recover an exact completed native Testing turn; never generate or retry a turn.

Run from the Bridge checkout with its existing Python environment. Read-only by
 default; --publish reconciles only the recorded native job after strict validation.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time

from anc_bridge.dashboard.contracts import JobRequest, RESULT_MODELS, strict_json
from anc_bridge.dashboard.project_context import PROJECT
from anc_bridge.dashboard.store import encoded
from anc_bridge.sdk import SafeCodex, native_config


async def reconcile(job_id, publish):
    state = Path.cwd() / '.state/dashboard'
    with sqlite3.connect(f'file:{state / "jobs.sqlite3"}?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        found = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
        if found is None:
            raise ValueError('Recorded job does not exist')
        job = dict(found)
    request = JobRequest.model_validate(json.loads(job['request']))
    if request.mode != 'testing_readout' or not job['thread_id'] or not job['turn_id']:
        raise ValueError('Only a recorded Testing native turn can be reconciled')
    async with SafeCodex(native_config(PROJECT, host_requests=True)) as sdk:
        await sdk._ensure_initialized()
        history = await sdk.read_only(job['thread_id'])
    turns = [t for t in history.thread.turns if t.id == job['turn_id']]
    if len(turns) != 1:
        raise ValueError('Exact native turn not found')
    turn = turns[0]
    status = getattr(turn.status, 'value', turn.status)
    if status != 'completed':
        print(json.dumps({'job_id': job_id, 'native_status': status, 'published': False}))
        return
    finals = []
    for wrapped in turn.items:
        item = wrapped.root
        phase = getattr(item, 'phase', None)
        if item.type == 'agentMessage' and getattr(phase, 'value', phase) == 'final_answer':
            finals.append(item.text)
    if not finals:
        raise ValueError('Completed native turn has no final answer')
    raw = '\n'.join(finals)
    payload = RESULT_MODELS[request.mode].model_validate(strict_json(raw)).model_dump(mode='json')
    canonical = encoded(payload)
    proof = {'job_id': job_id, 'thread_id': job['thread_id'], 'turn_id': job['turn_id'],
             'native_status': status, 'sha256': hashlib.sha256(canonical.encode()).hexdigest(),
             'bytes': len(canonical.encode()), 'published': False}
    if not publish:
        print(json.dumps(proof))
        return
    backup = Path.cwd() / '.state/backups' / ('native-testing-' + job_id)
    backup.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name in ('jobs.sqlite3', 'conversations.sqlite3'):
        with sqlite3.connect(state / name) as src, sqlite3.connect(backup / name) as dst:
            src.backup(dst)
    with sqlite3.connect(state / 'jobs.sqlite3') as db:
        db.execute('ATTACH DATABASE ? AS conversation_db', (str(state / 'conversations.sqlite3'),))
        db.execute('BEGIN IMMEDIATE')
        current = db.execute('SELECT thread_id,turn_id,status,fingerprint FROM jobs WHERE id=?', (job_id,)).fetchone()
        if current[:2] != (job['thread_id'], job['turn_id']) or current[3] != job['fingerprint']:
            raise ValueError('Recorded native identity changed')
        if current[2] not in ('running', 'failed', 'completed'):
            raise ValueError('Cancelled jobs must not be republished')
        now = time.time()
        db.execute("UPDATE jobs SET status='completed',result=?,error=NULL,updated=? WHERE id=?", (canonical, now, job_id))
        db.execute("UPDATE conversation_db.turns SET status='completed',result=?,updated=? WHERE job_id=? AND thread_id=? AND turn_id=?",
                   (canonical, now, job_id, job['thread_id'], job['turn_id']))
        db.execute('UPDATE conversation_db.conversations SET active_job=NULL,blocked=0 WHERE thread_id=? AND (active_job=? OR active_job IS NULL)',
                   (job['thread_id'], job_id))
        db.commit()
    target = backup / 'validated-native-result.json'
    target.write_text(json.dumps({'provenance': proof, 'result': payload}, ensure_ascii=False))
    target.chmod(0o600)
    proof['published'] = True
    print(json.dumps(proof))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job_id')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{32}', args.job_id):
        parser.error('Expected a Bridge-generated job ID')
    asyncio.run(reconcile(args.job_id, args.publish))
