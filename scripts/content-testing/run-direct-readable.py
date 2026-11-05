"""One native turn per channel: content prompt + readability together, file output only."""
import argparse,asyncio,json,time,hashlib
from pathlib import Path
from anc_bridge.sdk import SafeCodex,native_config,NativeControlResult
BRAND=Path('/home/ubuntu/work/emw3-anc/bluevua');THREAD='01a15a87-c768-7fa3-a874-28123fc46413'
def obj(props):return {'type':'object','additionalProperties':False,'properties':props,'required':list(props)}
def arr(item):return {'type':'array','items':item}
def schema():
 s={'type':'string'}
 block=obj({'id':s,'scope':s,'section_id':s,'type':{'type':'string','enum':['document']},'title':s,'html':s,'dataset_refs':arr(s),'media_keys':arr(s),'design_reason':s,'charts':arr(obj({'id':s,'spec':obj({'chart_type':s,'dataset_ref':s,'x_key':s,'y_keys':arr(s),'reason':s,'annotations':arr(obj({'category':s,'label':s}))})}))})
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
async def run(root,only=None):
 manifest=json.loads((root/'manifest.json').read_text());state_file=root/'state.json';state=json.loads(state_file.read_text()) if state_file.exists() else {'status':'prepared','turns':{}}
 async with SafeCodex(native_config(BRAND,host_requests=True)) as sdk:
  await sdk._ensure_initialized()
  for entry in [entry for entry in manifest['reports'] if not only or entry['report_id']==only]:
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
   request={'task':f'Fresh {packet["channel"]} analysis and high-readability visual report in ONE turn. Start from the frozen raw Dashboard input and actual creative evidence, not a saved analysis. Apply this channel prompt and readability together while forming findings. For Overview, synthesize only the supplied same-run completed_channel_reports and authoritative scoped totals; do not count lifetime Reddit again. Respect weekly versus lifetime versus fixed historical EDM scope.','input_file':str(root/f'inputs/{rid}.json'),'media_index':str(root/'media-index.json'),'sections':packet['sections'],'required_scopes':['channel']+[t['test_id'] for t in packet['tests']],'rules':'Read input_file and both current prompts. Performance comes only from this raw input; inspect registered source images/video frames before visual critique. Do not read old report/result files; only Overview may read the explicitly supplied same-run completed_channel_reports. No additional data analysis stage followed by a rewrite stage; directly return the final readable report. No API refresh, database/cache write, messages, agents or conversations. Return English source and faithful Chinese translation together; data, charts and media identities agree. Preserve the supplied analytical direction meanings/order, choose chapter/button wording and all internal layout freely. Freely compose responsive HTML/CSS and interactive chart slots; page is a renderer, not a business template. Chart values come from registered presentation_datasets; you may reason and calculate from raw tests/history, but do not invent chart values or sources. dataset_refs include input for prose facts and actual dataset IDs for charts. All amounts have the supplied verified account currency; comparison totals are reconciled prior-week data, use them for PoP. Summaries and campaign summaries are concise. Detail_markdown is only a concise audit of findings, not an intermediate Markdown report to be reformatted. Keep the main narrative understandable without reading detail tables. Images only use registered /api/testing/presentation/media/{key}?v={first12sha256}; preserve true names, original links and video time links. Use observed creative details and mark hypotheses, never assign a group order independently to several assets. SVG only for illustrations or actual image annotations, no static quantitative plots. No scripts, event handlers, iframe, external CSS, imports, forms or executable HTML. CSS theme variables --surface --foreground --muted --border --accent --soft provided. No fixed viewport height. Three directions and existing outer page summary/detail/question structure remain, with no fixed chapter templates, chart quotas or mandatory tables.'}
   request['interactive_contract']={'slots':'Put <div data-insight-chart="unique-id"></div> anywhere in your freely composed HTML; provide matching charts:[{id,spec}] on that block. Host renders interactive charts with exact tooltips, keyboard support and series buttons. No scripts in generated HTML. This does NOT prescribe chapter layouts or chart counts.','spec':'chart_type chosen among line, area, bar, column, pie, scatter, composed, radar, funnel, treemap; dataset_ref must reference this packet presentation_datasets; x_key=dataset.xKey; y_keys actual numeric columns; reason describes explanation and sources; annotations categories must match actual data. Different units require composed with at most two units. Campaign-scope refs use that campaign prefix. Channel may synthesize any registered dataset.','data':'Chart values come from datasets, never hand-drawn SVG geometry. All dataset refs must also appear in block.dataset_refs. SVG allowed only for actual creative annotations/illustrations. Do not embed static quantitative charts or index-only substitutes. Preserve real original images/video-frame critique and links.','quality':'Previous edition was rejected for one token static chart amid mostly tables/text. Reconsider the whole reading experience. Surface the important changes/differences with clear visual emphasis and related evidence. Readers must understand the conclusions without scanning dense tables. Detailed tables can be folded behind concise findings. No fixed chart quota, no chapter fill-in template. Retain substantive campaign and asset analysis, but avoid repeated text. Keep audit detail out of the main story.'}
   request['rules']=request['rules'].replace('dataset_refs should be ["input"] for facts in the supplied packet','dataset_refs may include "input" for prose facts and registered presentation_datasets IDs for charts').replace('and inline SVG, viewBox charts with units and text alternatives','and interactive chart slots with units and text alternatives')
   turn=await sdk.dashboard_turn(await sdk.dashboard_thread(BRAND,instructions,thread_id=THREAD),json.dumps(request,ensure_ascii=False),schema(),effort='medium')
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
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--report');args=p.parse_args();asyncio.run(run(args.root.resolve(),args.report))
