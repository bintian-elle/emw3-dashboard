"""Copy completed isolated remote reports locally; never call a publishing API."""
import argparse,json,re,subprocess,time
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--local-root',type=Path,default=Path(__file__).resolve().parents[2]/'.state/content-testing-preview/20261028-zh')
parser.add_argument('--remote-root',default='/tmp/dashboard-content-preview-20261028')
args=parser.parse_args()
ROOT=args.local_root.resolve()
REMOTE=args.remote_root
assert re.fullmatch(r'/tmp/[A-Za-z0-9_-]+',REMOTE),'Unexpected staging path'
ROOT.mkdir(parents=True,exist_ok=True)
(ROOT/'results').mkdir(exist_ok=True)
ids=['google-search','google-pmax','google-demand-gen','meta','reddit','reddit-lifetime','edm','social-media','overview']
previous=None
while True:
    response=subprocess.run(['ssh','EMW3_ANC_AI',f'cat {REMOTE}/state.json'],capture_output=True,text=True,timeout=30)
    if response.returncode:
        print(json.dumps({'sync':'connection_retry'}),flush=True);time.sleep(20);continue
    state=json.loads(response.stdout)
    for report_id,turn in state.get('turns',{}).items():
        if report_id not in ids or turn.get('status')!='completed':continue
        if (ROOT/'results'/f'{report_id}.json').exists():continue
        for extension in ('json','md'):
            copied=subprocess.run(['scp',f'EMW3_ANC_AI:{REMOTE}/results/{report_id}.{extension}',str(ROOT/'results'/f'{report_id}.{extension}')],capture_output=True,text=True,timeout=30)
            if copied.returncode:raise RuntimeError('Unable to copy completed report')
        print(json.dumps({'saved_local':report_id}),flush=True)
    temp=ROOT/'state.json.tmp';temp.write_text(json.dumps(state,ensure_ascii=False,indent=2));temp.replace(ROOT/'state.json')
    status=(state.get('status'),state.get('current'))
    if status!=previous:print(json.dumps({'sync_status':status}),flush=True);previous=status
    if state.get('status')=='completed':
        subprocess.run(['scp',f'EMW3_ANC_AI:{REMOTE}/manifest.json',str(ROOT/'manifest.json')],check=True,capture_output=True,timeout=30)
        print(json.dumps({'sync':'completed'}),flush=True);break
    time.sleep(20)
