"""Prepare an immutable concluded-test packet for the standard channel report runner."""
import argparse, hashlib, json, re, shutil
from pathlib import Path

CHANNELS={'Google':'google-search','Google Search':'google-search','Google PMAX':'google-pmax','Google Demand Gen':'google-demand-gen','Meta':'meta','Reddit':'reddit','EDM':'edm'}
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--snapshot',type=Path,required=True);p.add_argument('--definition',type=Path,required=True);p.add_argument('--prompts',type=Path,required=True);args=p.parse_args()
definition=json.loads(args.definition.read_text());snapshot=json.loads(args.snapshot.read_text());slug=CHANNELS[definition['channel']]
assert snapshot.get('finalized') and snapshot.get('testId')==definition['id'] and snapshot['report'].get('period'), 'Finalized test snapshot required'
root=args.root;root.mkdir(parents=True,exist_ok=True,mode=0o700);(root/'inputs').mkdir(exist_ok=True);(root/'results').mkdir(exist_ok=True);shutil.copytree(args.prompts,root/'prompts',dirs_exist_ok=True)
prompt=(root/'prompts'/f'{slug}.md').read_text(); titles=[re.split(r'\s*[（(]',m.group(1),maxsplit=1)[0].strip() for m in re.finditer(r'^##\s+\d+\.\s+(.+)$',prompt,re.M)][1:];titles=[v for v in titles if not any(m in v for m in ('下钻','模块内容','Micro Deep Dive','Module Performance'))];assert titles
period={'label':'Lifetime snapshot',**snapshot['report']['period'],'concludedTestId':definition['id']};channel='Google Search' if definition['channel']=='Google' else ('Demand Gen' if definition['channel']=='Google Demand Gen' else definition['channel'])
packet={'run_id':root.name,'report_id':slug,'language':'en','channel':channel,'scope':'lifetime','period':period,'comparison':None,'tests':[{'test_id':definition['id'],'channel':channel,'campaign_name':definition['campaignName'],'status':'Concluded','definition':definition,'data':snapshot['report'],'daily_history':snapshot.get('dailyGroups',[]),'snapshot_finalized':True}],'supporting_data':{'daily_history':snapshot.get('dailyGroups',[])},'required_sections':titles,'captured_at':snapshot.get('capturedAt'),'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'prompt_precedence':'This is a concluded test: analyze only the supplied finalized lifetime test and its available comparison, applying this channel prompt and its output format to this test rather than the active campaigns or current-period examples.'}
manifest={'run_id':root.name,'language':'en','status':'prepared','period':period,'reports':[{'report_id':slug,'channel':channel,'scope':'lifetime','period':period,'required_sections':titles}]}
for name,value in [('manifest.json',manifest),(f'inputs/{slug}.json',packet)]:
 path=root/name
 if not path.exists():path.write_text(json.dumps(value,ensure_ascii=False,indent=2));path.chmod(0o600)
print(json.dumps({'report_id':slug,'test_id':definition['id']}))
