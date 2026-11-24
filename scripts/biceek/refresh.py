#!/usr/bin/env python3
"""Refresh the private Biceek country snapshot using the existing EC2 daily collector."""
import argparse
import fcntl
import json
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

DEPLOYED_DAILY = Path('/home/ubuntu/services/biceek-daily-report')
MARKETS = {'GB': '2826', 'DE': '2276', 'FR': '2250', 'NL': '2528',
           'BE': '2056', 'IT': '2380', 'ES': '2724'}
FIRST_DAY = date(2026, 10, 26)


def collect_funnel(daily, config, period, exports):
    source = {'sessions': 'sessions', 'addToCarts': 'addToCart', 'checkouts': 'beginCheckout'}
    response = daily.cli(config, 'ga4', ['reports', 'query'], {
        'period': period, 'dimensions': ['date', 'countryId'], 'metrics': list(source),
        'dimensionFilter': {'filter': {'fieldName': 'countryId', 'inListFilter': {'values': list(MARKETS)}}},
        'max_rows': 1000,
    })
    metadata = response.get('response_metadata', {})
    if (response.get('includes_incomplete_day') or metadata.get('subjectToThresholding')
            or metadata.get('samplingMetadatas') or metadata.get('dataLossFromOtherRow')):
        raise ValueError('Incomplete or restricted GA4 funnel data')
    totals = {}
    for row in daily.business_rows(response, exports):
        raw_date = row['date']
        if not isinstance(raw_date, str) or len(raw_date) != 8 or not raw_date.isdigit():
            raise ValueError('Unexpected GA4 report date')
        day = f'{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}'
        country = row['countryId']
        key = (day, country)
        if key in totals or country not in MARKETS or not period['start'] <= day < period['end']:
            raise ValueError('Unexpected GA4 market or date')
        metrics = {}
        for name, field in source.items():
            value = daily.number(row[name])
            if value is None or value < 0 or value != value.to_integral_value():
                raise ValueError('Invalid GA4 funnel count')
            metrics[field] = int(value)
        totals[key] = metrics
    return totals


def collect(daily, config, start, end):
    period = {'start': str(start), 'end': str(end + timedelta(days=1))}
    fields = ['segments.date', 'user_location_view.country_criterion_id']
    def google(extra, filters=None):
        query = {'resource': 'user_location_view', 'period': period, 'fields': fields + extra, 'max_rows': 1000}
        if filters:
            query['filters'] = filters
        return daily.cli(config, 'google-ads', ['reports', 'query'], query)

    exports = Path(config['anc_root']) / '.local/exports'
    google_spend = daily.business_rows(google(['metrics.cost_micros', 'metrics.conversions_value']), exports)
    google_sales = daily.business_rows(google(
        ['segments.conversion_action_category', 'metrics.conversions_value'],
        [{'field': 'segments.conversion_action_category', 'op': '=', 'value': 'PURCHASE'}]), exports)
    meta = daily.business_rows(daily.cli(config, 'meta-ads', ['insights', 'query'], {
        'period': period, 'level': 'account', 'time_increment': 1, 'breakdowns': ['country'],
        'fields': ['spend', 'action_values'], 'max_rows': 1000}), exports)

    def google_by_day(rows, criterion, metric):
        result = {}
        for row in rows:
            if str(row['userLocationView']['countryCriterionId']) == criterion:
                day = row['segments']['date']
                value = daily.number(row['metrics'][metric])
                if value is None:
                    raise ValueError('Missing Google country metric')
                result[day] = result.get(day, Decimal(0)) + value
        return result

    def by_day(rows, field):
        result = {row[field]: row for row in rows}
        if len(result) != len(rows):
            raise ValueError('Duplicate source day')
        return result

    shop_days = {}
    current = start
    while current <= end:
        shop = daily.cli(config, 'shopify', ['reports', 'query'], {
            'start': str(current), 'end': str(current + timedelta(days=1)),
            'dimensions': ['shipping_country_code'], 'metrics': ['orders', 'total_sales']})
        shop_days[str(current)] = by_day(shop['data']['rows'], 'shipping_country_code')
        current += timedelta(days=1)

    funnel = collect_funnel(daily, config, period, exports)
    for country, criterion in MARKETS.items():
        spend = google_by_day(google_spend, criterion, 'costMicros')
        purchase_value = google_by_day(google_sales, criterion, 'conversionsValue')
        meta_days = by_day([row for row in meta if row.get('country') == country], 'date_start')
        current = start
        while current <= end:
            day = str(current)
            m = meta_days.get(day, {})
            s = shop_days[day].get(country)
            g_spend = spend.get(day, Decimal(0)) / 1_000_000
            g_value = purchase_value.get(day, Decimal(0))
            m_spend = daily.number(m['spend']) if m else Decimal(0)
            m_value = next((daily.number(a['value']) for a in m.get('action_values', [])
                            if a['action_type'] == daily.PURCHASE), Decimal(0))
            values = [g_spend, g_value, m_spend, m_value,
                      daily.number(s['total_sales']) if s else Decimal(0),
                      daily.number(s['orders']) if s else Decimal(0)]
            if any(value is None for value in values):
                raise ValueError('Missing metric in a source row')
            row = dict(zip(('date', 'market', 'googleSpend', 'googleRevenue', 'metaSpend', 'metaRevenue',
                            'shopifySales', 'orders'), (day, country, *(float(v) if v is not None else None for v in values))))
            yield row | funnel.get((day, country), {'sessions': None, 'addToCart': None, 'beginCheckout': None})
            current += timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--daily-dir', type=Path, default=DEPLOYED_DAILY)
    parser.add_argument('--output', type=Path, default=DEPLOYED_DAILY / 'state/market-overview.json')
    parser.add_argument('--start', type=date.fromisoformat)
    parser.add_argument('--end', type=date.fromisoformat)
    args = parser.parse_args()
    sys.path.insert(0, str(args.daily_dir.resolve()))
    import daily

    last_closed = datetime.now(ZoneInfo('America/Los_Angeles')).date() - timedelta(days=1)
    end = args.end or last_closed
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.with_suffix('.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = daily.read_json(args.output)
        start = args.start or (max(FIRST_DAY, min(end, date.fromisoformat(previous['through'])) - timedelta(days=6))
                               if previous else FIRST_DAY)
        if previous and not args.start:
            missing_days = [date.fromisoformat(row['date']) for row in previous['rows']
                            if 'sessions' not in row and row['date'] <= str(end)]
            start = min([start, *missing_days])
        if not FIRST_DAY <= start <= end <= last_closed:
            parser.error('Requested period must be between campaign launch and the last closed Pacific day')
        config = daily.load_config()
        by_key = {(row['date'], row['market']): row for row in previous['rows']} if previous else {}
        chunk_start = start
        while chunk_start <= end:
            chunk_end = min(end, chunk_start + timedelta(days=6))
            for row in collect(daily, config, chunk_start, chunk_end):
                key = (row['date'], row['market'])
                by_key[key] = row
            chunk_start = chunk_end + timedelta(days=1)
        payload = {'version': 1, 'project': 'biceek', 'currency': 'USD',
                   'through': max(row['date'] for row in by_key.values()),
                   'refreshedAt': datetime.now(timezone.utc).isoformat(),
                   'rows': sorted(by_key.values(), key=lambda row: (row['date'], row['market']))}
        daily.atomic(args.output, payload)
        print(json.dumps({key: payload[key] for key in ('through', 'refreshedAt')} | {'rows': len(by_key)}))


if __name__ == '__main__':
    main()
