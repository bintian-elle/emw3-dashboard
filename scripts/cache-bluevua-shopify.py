#!/usr/bin/env python3
"""Publish native Bluevua Shopify daily sales into the Builder source cache."""
import argparse
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import os
import subprocess
import tempfile

ACCOUNT = 'shopify.bluevua'
ZONE = 'America/Los_Angeles'


def read_period(executable, start, end):
    days = {str(start + timedelta(days=i)) for i in range((end - start).days + 1)}
    result = subprocess.run([executable, 'reports', 'query', '--account', ACCOUNT, '--input-file', '-'],
                            input=json.dumps({'start': str(start), 'end': str(end + timedelta(days=1)),
                                              'metrics': ['orders', 'total_sales'], 'timeseries': 'day'}),
                            capture_output=True, text=True, timeout=150)
    report = json.loads(result.stdout)
    if (result.returncode or report.get('status') != 'ok' or report.get('account_ref') != ACCOUNT
            or report.get('identity_verified') is not True or report.get('currency') != 'USD'
            or report.get('timezone') != ZONE or report.get('coverage', {}).get('complete') is not True):
        raise ValueError('Shopify did not return a verified complete Bluevua USD report')
    source_rows = report['data']['rows']
    if report.get('count') != len(source_rows) or len(source_rows) != len(days) or {row['day'] for row in source_rows} != days:
        raise ValueError('Shopify daily coverage does not match the requested period')
    rows = []
    for row in sorted(source_rows, key=lambda row: row['day']):
        sales, orders = Decimal(str(row['total_sales'])), Decimal(str(row['orders']))
        if not sales.is_finite() or not orders.is_finite() or orders < 0 or orders != orders.to_integral_value():
            raise ValueError('Invalid Shopify daily sales or orders')
        rows.append({'date': row['day'], 'revenue': float(sales), 'conversions': int(orders)})
    return {'project': 'bluevua', 'accountRef': ACCOUNT, 'identityVerified': True, 'source': 'store',
            'start': str(start), 'end': str(end), 'status': 'ready', 'complete': True,
            'fetchedAt': datetime.now(timezone.utc).isoformat(), 'timezone': ZONE, 'currency': 'USD',
            'origin': 'Shopify native Total Sales and Orders', 'rows': rows}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--cli', required=True)
    cli.add_argument('--output', type=Path, required=True)
    cli.add_argument('--start', type=date.fromisoformat, required=True)
    cli.add_argument('--end', type=date.fromisoformat, required=True)
    args = cli.parse_args()
    if args.end < args.start:
        cli.error('Invalid dates')
    payload = read_period(args.cli, args.start, args.end)
    args.output.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.NamedTemporaryFile(mode='w', dir=args.output, delete=False) as output:
        temporary = Path(output.name)
        try:
            json.dump(payload, output)
            output.flush()
            os.fsync(output.fileno())
            temporary.replace(args.output / f'store-{args.start}-{args.end}.json')
        finally:
            temporary.unlink(missing_ok=True)
    print(f"Verified {len(payload['rows'])} Shopify days for {args.start} through {args.end}.")


if __name__ == '__main__':
    main()
