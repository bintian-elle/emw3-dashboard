"""Prepare channel-specific packets from the Dashboard's authenticated snapshot."""
import argparse, hashlib, json, shutil
from pathlib import Path
from datetime import date,timedelta
from importlib.util import spec_from_file_location,module_from_spec

spec=spec_from_file_location('runner',Path(__file__).with_name('run-preview.py'));runner=module_from_spec(spec);spec.loader.exec_module(runner)
CHANNELS=[('google-search','Google Search'),('google-pmax','Google PMAX'),('google-demand-gen','Demand Gen'),('meta','Meta'),('reddit','Reddit'),('reddit-lifetime','Reddit'),('edm','EDM'),('social-media','Social Media')]

def prepare(root,source,selected,prompts,reuse=None):
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    shutil.copytree(prompts,root/'prompts',dirs_exist_ok=True)
    (root/'inputs').mkdir(exist_ok=True);(root/'results').mkdir(exist_ok=True)
    regular=next(p for p in source['periods'] if p['period']['label']==selected)
    manifest={'run_id':root.name,'language':'en','status':'prepared','period':regular['period'],'reports':[],'overview_display_totals':regular['overview_display_totals']}
    for slug,channel in CHANNELS:
        lifetime=slug in ('reddit-lifetime','social-media')
        period=next(p for p in source['periods'] if p['period']['label']==('Lifetime snapshot' if slug=='social-media' else 'Lifetime (Sep 24, 2026 – Now)')) if lifetime else regular
        prompt=(prompts/f'{"reddit" if slug=="reddit-lifetime" else slug}.md').read_text()
        titles=[title for title in runner.numbered_report_parts(prompt)[1:] if not any(marker in title for marker in ('下钻','模块内容','Micro Deep Dive','Module Performance'))]
        assert titles,slug
        tests=[t for t in period['tests'] if t['channel']==channel]
        assert tests,f'{slug}: no configured tests; do not publish incomplete coverage'
        names={t['test_id'] for t in tests};catalog=source['creative_catalog']
        supporting={'daily_history':{name:rows for name,rows in catalog.get('daily_history',{}).items() if name in names}}
        if channel=='Google Search':supporting['search']=catalog.get('search',{})
        if channel=='Meta':supporting['daily_history']=catalog.get('meta_daily_history',[])
        if channel=='Social Media':supporting['social']=catalog.get('social',{})
        comparison=None if lifetime else {'label':'Prior equal-length period; compare only matching history','start':str(date.fromisoformat(period['period']['start'])-timedelta(days=(date.fromisoformat(period['period']['end'])-date.fromisoformat(period['period']['start'])).days+1)),'end':str(date.fromisoformat(period['period']['start'])-timedelta(days=1))}
        packet={'run_id':root.name,'report_id':slug,'language':'en','channel':channel,'scope':'lifetime' if lifetime else 'period','period':period['period'],'comparison':comparison,'tests':tests,'supporting_data':supporting,'required_sections':titles,'captured_at':source['captured_at'],'metric_basis':source['metric_basis'],'currency_verification':source['currency_verification'],'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'prompt_precedence':'Current channel prompt controls coverage and depth. Campaign diagnosis belongs only in campaigns[].detail_markdown. Performance comes only from this Dashboard packet. External/local research is background only. English output overrides historical Chinese preview instructions.'}
        runner.save(root/'inputs'/f'{slug}.json',packet)
        manifest['reports'].append({k:packet[k] for k in ['report_id','channel','scope','period','required_sections']})
        if lifetime and reuse and (reuse/'results'/f'{slug}.json').exists() and not (root/'results'/f'{slug}.json').exists():
            report=json.loads((reuse/'results'/f'{slug}.json').read_text());report['run_id']=root.name;runner.save(root/'results'/f'{slug}.json',report)
    runner.save(root/'manifest.json',manifest)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);parser.add_argument('--snapshot',type=Path,required=True);parser.add_argument('--period',required=True);parser.add_argument('--prompts',type=Path,required=True);parser.add_argument('--reuse',type=Path);args=parser.parse_args()
    prepare(args.root,json.loads(args.snapshot.read_text()),args.period,args.prompts,args.reuse)
