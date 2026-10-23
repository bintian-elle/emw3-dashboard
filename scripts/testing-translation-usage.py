#!/usr/bin/env python3
"""Read the private Bridge translation meter; date is America/Chicago."""
import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--date', default=datetime.now(ZoneInfo('America/Chicago')).date().isoformat())
parser.add_argument('--directory', type=Path, default=Path('/home/ubuntu/work/anc-slack-bridge/.state/dashboard/translation-usage'))
args = parser.parse_args()
rows = []
for file in sorted(args.directory.glob('*.jsonl')):
    for line in file.read_text().splitlines():
        row = json.loads(line)
        if datetime.fromisoformat(row['started_at']).astimezone(ZoneInfo('America/Chicago')).date().isoformat() == args.date:
            rows.append(row)
rows.sort(key=lambda row: row['started_at'])
tokens = Counter()
for row in rows:
    for key, value in ((row.get('tokens') or {}).get('total') or {}).items():
        if isinstance(value, int):
            tokens[key] += value
print(json.dumps({'date_CT': args.date, 'jobs': len(rows), 'completed': sum(row['completed'] for row in rows),
                  'english_characters': sum(row['english_characters'] for row in rows),
                  'tokens_reported_jobs': sum(row.get('tokens') is not None for row in rows),
                  'tokens': dict(tokens) if tokens else None,
                  'account_before': rows[0]['account_before'] if rows else None,
                  'account_after': rows[-1]['account_after'] if rows else None,
                  'note': 'Account snapshots include other work. Missing usage is unavailable, not zero. Failed attempts are included.'}, ensure_ascii=False, indent=2))
