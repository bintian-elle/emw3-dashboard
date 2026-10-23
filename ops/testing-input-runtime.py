"""Lossless Testing input compaction and bounded per-period planning.

Never drops distinct data or changes metrics. Other Dashboard modes retain their
original contract limits. Persisted frozen input is not mutated.
"""
import json

NODE_LIMIT = 30000
MAX_DEPTH = 20
MAX_BATCH_NODES = 200000


def shape(value):
    stack = [(value, 0)]
    count, deepest = 0, 0
    while stack:
        item, depth = stack.pop()
        count += 1
        deepest = max(deepest, depth)
        if depth > MAX_DEPTH or count > MAX_BATCH_NODES:
            raise ValueError('payload_complexity')
        if isinstance(item, dict):
            stack.extend((v, depth + 1) for v in item.values())
        elif isinstance(item, list):
            stack.extend((v, depth + 1) for v in item)
    return count, deepest


def compact_testing_payload(payload):
    result = dict(payload)
    periods = payload.get('periods', [])
    catalog = payload.get('creative_catalog')
    if not isinstance(catalog, dict):
        return result
    kept, references, sources = {}, {}, {}
    canonical = lambda value: json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False)
    for pi, period in enumerate(periods):
        for ti, test in enumerate(period.get('tests', [])):
            if 'data' in test:
                sources.setdefault(canonical(test['data']), f'periods[{pi}].tests[{ti}].data')
    for name, value in catalog.items():
        match = sources.get(canonical(value))
        if match:
            references[name] = match
        else:
            kept[name] = value
    result['creative_catalog'] = kept
    if references:
        result['creative_catalog_references'] = references
    return result


def plan_testing_payloads(payload):
    # Retain nesting and total request bounds before compaction; HTTP body size
    # remains capped separately. A reference replaces only exactly equal data.
    shape(payload)
    compact = compact_testing_payload(payload)
    if shape(compact)[0] <= NODE_LIMIT:
        return [compact]
    periods = payload.get('periods')
    if not isinstance(periods, list) or not 1 <= len(periods) <= 5:
        raise ValueError('testing_period_complexity')
    parts = []
    for period in periods:
        part = compact_testing_payload({**payload, 'periods': [period]})
        if shape(part)[0] > NODE_LIMIT:
            raise ValueError('testing_period_complexity')
        parts.append(part)
    return parts
