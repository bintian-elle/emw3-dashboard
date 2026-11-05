"""One native turn per channel: content prompt + readability together, file output only."""
import argparse,asyncio,json,time,hashlib
from pathlib import Path
from anc_bridge.sdk import SafeCodex,native_config,NativeControlResult
BRAND=Path('/home/ubuntu/work/emw3-anc/bluevua');THREAD='01a15a87-c768-7fa3-a874-28123fc46413'
def obj(props):return {'type':'object','additionalProperties':False,'properties':props,'required':list(props)}
def arr(item):return {'type':'array','items':item}
def schema():
 s={'type':'string'}
 block=obj({'id':s,'scope':s,'section_id':s,'type':{'type':'string','enum':['document']},'title':s,'html':s,'dataset_refs':arr(s),'media_keys':arr(s),'design_reason':s})
 presentation=obj({'schema_version':{'type':'string','enum':['insight-presentation-v3']},'title':s,'summary':s,'sections':arr(obj({'id':s,'title':s})),'blocks':arr(block)})
 language=obj({'presentation':presentation,'campaigns':arr(obj({'test_id':s,'summary':s,'detail_markdown':s}))})
 return obj({'report_id':s,'en':language,'zh':language})
def save(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2));temp.chmod(0o600);temp.replace(path)
def validate(value,packet):
 assert value['report_id']==packet['report_id']
 for lang in ['en','zh']:
  v=value[lang];p=v['presentation'];assert [s['id'] for s in p['sections']]==[s['id'] for s in packet['sections']]
  assert {c['test_id'] for c in v['campaigns']}=={t['test_id'] for t in packet['tests']}
  for scope in ['channel']+[t['test_id'] for t in packet['tests']]:
   assert {b['section_id'] for b in p['blocks'] if b['scope']==scope}=={s['id'] for s in packet['sections']},'Missing scope/direction'
  assert all(b['html'].strip() for b in p['blocks'])
async def run(root):
 manifest=json.loads((root/'manifest.json').read_text());state_file=root/'state.json';state=json.loads(state_file.read_text()) if state_file.exists() else {'status':'prepared','turns':{}}
 async with SafeCodex(native_config(BRAND,host_requests=True)) as sdk:
  await sdk._ensure_initialized()
  for entry in manifest['reports']:
   rid=entry['report_id'];target=root/f'results/{rid}.json'
   if target.exists():continue
   if rid in state['turns']:
    record=state['turns'][rid]
    page=(await sdk._client.request('thread/turns/list',{'threadId':THREAD,'limit':100,'sortDirection':'desc','itemsView':'notLoaded'},response_model=NativeControlResult)).model_dump()
    prior=next(t for t in page['data'] if t['id']==record['turn_id'])
    if prior['status']!='completed':raise RuntimeError('Recorded turn is not completed; wait/recover, never duplicate inference')
    finals=[];cursor=None
    while True:
     chunk=(await sdk._client.request('thread/items/list',{'threadId':THREAD,'turnId':record['turn_id'],'cursor':cursor,'limit':50,'sortDirection':'asc'},response_model=NativeControlResult)).model_dump()
     for entry in chunk['data']:
      item=entry['item']
      if item.get('type')=='agentMessage' and item.get('phase')=='final_answer':finals.append(item['text'])
     cursor=chunk.get('nextCursor')
     if not cursor:break
    raw='\n'.join(finals);packet=json.loads((root/f'inputs/{rid}.json').read_text());value=json.loads(raw);validate(value,packet);value.update(run_id=manifest['run_id'],period=packet['period'],comparison=packet['comparison'],scope=packet['scope'],channel=packet['channel']);save(target,value);record.update(status='completed',completed_at=time.time());save(state_file,state);print(json.dumps({'report':rid,'status':'recovered'}),flush=True);continue
   metadata=(await sdk._client.request('thread/read',{'threadId':THREAD,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread'];assert metadata.get('name','').lower()=='bluevua · content testing insights';assert metadata.get('status',{}).get('type') in ('idle','notLoaded'),'Existing native thread busy'
   packet=json.loads((root/f'inputs/{rid}.json').read_text())
   if rid=='overview':
    packet['completed_channel_reports']=[json.loads((root/f'results/{r["report_id"]}.json').read_text()) for r in manifest['reports'] if r['report_id']!='overview'];save(root/'inputs/overview.json',packet)
   slug='reddit' if rid=='reddit-lifetime' else rid
   content=(root/f'prompts/{slug}.md').read_text();readability=(root/'prompts/readability.md').read_text()
   instructions=content+'\n\n# Readability: expression requirements applied during the SAME analysis turn\n'+readability
   request={'task':'Fresh analysis and autonomous visual composition together. Do not reuse previous analysis or presentation. This is a private staging-only run, never publish.','input_file':str(root/f'inputs/{rid}.json'),'media_index':str(root/'media-index.json'),'sections':packet['sections'],'required_scopes':['channel']+[t['test_id'] for t in packet['tests']],'rules':'Read input_file and both current prompts. Only this packet supplies performance. Read necessary Bluevua background/materials and actual registered image/frame source_path before describing visuals. No API changes, database/cache writes, Slack, agents, conversations, or edits. Return English source and faithful Chinese translation in the SAME output; facts, units, direction IDs, media and charts match across languages. Translate all reader-facing words, preserve entity names. No second analysis pass. The provided section IDs/meanings/order stay fixed; titles/buttons and all internal expression are yours. One or more free HTML/CSS/SVG documents per direction and scope. No widget template or chart whitelist. Freely combine current/previous sources, verify totals and ratios from numerators, explicitly show PoP where comparable (including summary key metrics), do not invent comparison when missing. Distinguish weekly from lifetime and EDM fixed historical test. Overview uses only this run completed reports and authoritative scoped paid totals, never sums duplicated objectives or ad associations. Keep summary short, all detailed conclusions/evidence/actions in the freely composed HTML. Campaign summaries are short; detail_markdown is a concise factual audit of findings for downstream Overview, not a competing full report. Native details/summary and links supported; no scripts/event handlers/iframe/forms/external dependencies, CSS url() or imports. Use responsive HTML, style tags and inline SVG, viewBox charts with units and text alternatives. Theme variables --surface --foreground --muted --border --accent --soft are provided. Keep content within width, no fixed viewport height. Images only /api/testing/presentation/media/{key}?v={first12sha256}; media keys from matching channel/campaign. Original links only from verified packet references. dataset_refs should be ["input"] for facts in the supplied packet; record exact input paths/calculations in design_reason, not invented series. Actual raw IDs never used as visible names. Include image/video critique only when relevant and viewed; preserve genuine annotated frames and direct time links. No fixed quota or mandatory chart per type. Do not read prior result files except same-run completed_channel_reports for Overview.'}
   turn=await sdk.dashboard_turn(await sdk.dashboard_thread(BRAND,instructions,thread_id=THREAD),json.dumps(request,ensure_ascii=False),schema(),effort='high')
   record={'turn_id':turn.id,'thread_id':THREAD,'status':'running','started_at':time.time(),'prompt_sha256':hashlib.sha256(instructions.encode()).hexdigest()};state['turns'][rid]=record;state.update(status='running',current=rid);save(state_file,state);print(json.dumps({'report':rid,'status':'started','turn_id':turn.id}),flush=True)
   finals=[];done=False
   async for event in turn.stream():
    if event.method=='item/completed':
     item=event.payload.item.root
     if item.type=='agentMessage' and getattr(getattr(item,'phase',None),'value',getattr(item,'phase',None))=='final_answer':finals.append(item.text)
    elif event.method=='turn/completed':done=getattr(event.payload.turn.status,'value',event.payload.turn.status)=='completed'
   assert done and finals,'Recover recorded native turn, never rerun automatically'
   raw='\n'.join(finals);(root/f'results/{rid}.raw.txt').write_text(raw);value=json.loads(raw);validate(value,packet);value.update(run_id=manifest['run_id'],period=packet['period'],comparison=packet['comparison'],scope=packet['scope'],channel=packet['channel']);save(target,value);record.update(status='completed',completed_at=time.time());save(state_file,state);print(json.dumps({'report':rid,'status':'completed'}),flush=True)
  state.update(status='completed');state.pop('current',None);save(state_file,state);manifest['status']='completed';save(root/'manifest.json',manifest)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);args=p.parse_args();asyncio.run(run(args.root.resolve()))
