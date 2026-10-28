"""Prepare immutable per-channel packets from read-only Dashboard exports."""
import hashlib,json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'.state/content-testing-preview/20261028-zh'
jobs=json.loads((RUN/'source-jobs.json').read_text())
jobs.sort(key=lambda x:x['id'])
latest=jobs[-1]['body']['analysis_payload']
weekly_job=next(j for j in reversed(jobs) if any(p['period'].get('label')=='Last Week (Tue–Mon)' for p in j['body']['analysis_payload']['periods']))
weekly=next(p for p in weekly_job['body']['analysis_payload']['periods'] if p['period'].get('label')=='Last Week (Tue–Mon)')
assert (weekly['period']['start'],weekly['period']['end'])==('2026-10-20','2026-10-26')
source=weekly_job['body']['analysis_payload']
channels=[('google-search','Google Search'),('google-pmax','Google PMAX'),('google-demand-gen','Demand Gen'),('meta','Meta'),('reddit','Reddit'),('reddit-lifetime','Reddit'),('edm','EDM'),('social-media','Social Media')]
packets=[]
for slug,channel in channels:
    lifetime=slug in ('reddit-lifetime','social-media')
    period=next(p for p in latest['periods'] if (slug=='reddit-lifetime' and p['period']['label'].startswith('Lifetime (')) or (slug=='social-media' and p['period']['label']=='Lifetime snapshot')) if lifetime else weekly
    selected=[t for t in period['tests'] if t['channel']==channel]
    catalog_source=latest if lifetime else source
    catalog=catalog_source['creative_catalog']
    names={t['test_id'] for t in selected}
    extras={}
    if channel=='Google Search':
        extras['search']=catalog.get('search',{})
    if channel=='Meta':
        ids={a.get('adId') for t in selected for a in t.get('ad_performance',[])}
        extras['daily_history']=[d for d in catalog.get('meta_daily_history',[]) if d.get('adId') in ids]
    elif channel.startswith('Google') or channel=='Demand Gen':
        histories={name:rows for name,rows in catalog.get('daily_history',{}).items() if name in names}
        if channel=='Google Search':
            allowed={a['adGroupAd']['ad']['id'] for a in catalog.get('search',{}).get('ads',[]) if a.get('campaign',{}).get('name') in names}
            histories={name:[r for r in rows if not r.get('adId') or r['adId'] in allowed] for name,rows in histories.items()}
        extras['daily_history']=histories
    if channel=='Social Media':
        extras['social']=catalog.get('social',{})
    prompt_slug='reddit' if slug=='reddit-lifetime' else slug
    prompt=ROOT/'prompts/content-testing'/f'{prompt_slug}.md'
    raw=prompt.read_text()
    output_part=re.split(r'## (?:输出格式|Output Format)',raw)[-1]
    headings=[re.sub(r'^\d+\.\s*','',line[4:].strip()).split('（')[0].split(' (')[0].strip() for line in output_part.splitlines() if line.startswith('### ')]
    packet={
        'run_id':'20261028-zh','report_id':slug,'channel':channel,'language':'zh-CN',
        'scope':'lifetime' if lifetime else 'period','period':period['period'],
        'comparison':None if lifetime else {'start':'2026-10-13','end':'2026-10-19','label':'前一可比周；仅在同范围历史完整时计算'},
        'source_job_id':jobs[-1]['id'] if lifetime else weekly_job['id'],
        'captured_at':catalog_source.get('captured_at'),
        'source_status':'Frozen Dashboard input; latest saved batch for this scope, not a claim of live API freshness.',
        'metric_basis':catalog_source.get('metric_basis'),
        'currency_verification':catalog_source.get('currency_verification'),
        'configured_testing_entities_only':True,'tests':selected,'supporting_data':extras,
        'source_data_gaps':period.get('data_gaps',[]),'required_sections':headings,
        'prompt_sha256':hashlib.sha256(raw.encode()).hexdigest(),
    }
    target=RUN/'inputs'/f'{slug}.json';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(packet,ensure_ascii=False,indent=2));target.chmod(0o600)
    packets.append({'report_id':slug,'channel':channel,'scope':packet['scope'],'period':packet['period'],'test_ids':[t['test_id'] for t in selected],'required_sections':headings})
manifest={'run_id':'20261028-zh','language':'zh-CN','status':'prepared','period':weekly['period'],'thread_id':'01a15a87-c768-7fa3-a874-28123fc46413','thread_name':'Bluevua · Content Testing Insights','reports':packets,'overview_display_totals':weekly.get('overview_display_totals'),'production_cache_writes':False}
(RUN/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'prepared':[p['report_id'] for p in packets],'input_bytes':sum(p.stat().st_size for p in (RUN/'inputs').glob('*.json'))},ensure_ascii=False))
