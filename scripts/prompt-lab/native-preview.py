"""One isolated preview in the existing Bluevua Insights conversation. No publication."""
import argparse,asyncio,json,time,re
from pathlib import Path
from anc_bridge.sdk import SafeCodex,native_config,NativeControlResult
BRAND=Path('/home/ubuntu/work/emw3-anc/bluevua')
THREAD='01a15a87-c768-7fa3-a874-28123fc46413'
def save(path,value):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(value,ensure_ascii=False));temp.chmod(0o600);temp.replace(path)
def emit(stage,**extra):print(json.dumps({'stage':stage,**extra}),flush=True)
def obj(p):return {'type':'object','additionalProperties':False,'properties':p,'required':list(p)}
def schema():
 s={'type':'string'};return obj({'title':s,'summary':s,'sections':{'type':'array','minItems':1,'items':obj({'title':s,'markdown':s})},'campaigns':{'type':'array','items':obj({'id':s,'summary':s,'markdown':s})},'html':{'anyOf':[s,{'type':'null'}]}})
async def final_text(sdk,turn_id):
 while True:
  page=(await sdk._client.request('thread/turns/list',{'threadId':THREAD,'limit':100,'sortDirection':'desc','itemsView':'notLoaded'},response_model=NativeControlResult)).model_dump()
  turn=next((turn for turn in page['data'] if turn['id']==turn_id),None)
  if turn is None:raise RuntimeError('Recorded turn is unavailable; refusing duplicate inference')
  if turn['status']=='completed':break
  if turn['status'] in ('failed','interrupted'):raise RuntimeError('Recorded turn failed')
  await asyncio.sleep(8)
 text=[];cursor=None
 while True:
  page=(await sdk._client.request('thread/items/list',{'threadId':THREAD,'turnId':turn_id,'cursor':cursor,'limit':50,'sortDirection':'asc'},response_model=NativeControlResult)).model_dump()
  for entry in page['data']:
   item=entry['item']
   if item.get('type')=='agentMessage' and item.get('phase')=='final_answer':text.append(item['text'])
  cursor=page.get('nextCursor')
  if not cursor:return '\n'.join(text)
async def run(root):
 job=json.loads((root/'input.json').read_text());state_path=root/'native-state.json';state=json.loads(state_path.read_text()) if state_path.exists() else {}
 async with SafeCodex(native_config(BRAND,host_requests=True)) as sdk:
  await sdk._ensure_initialized()
  if state.get('turn_id'):
   emit('recovering',turn_id=state['turn_id'],thread_id=THREAD);raw=await final_text(sdk,state['turn_id'])
  else:
   if state.get('submitting'):raise RuntimeError('Previous submission is uncertain; inspect the existing turn rather than start another')
   emit('waiting_for_agent')
   while True:
    thread=(await sdk._client.request('thread/read',{'threadId':THREAD,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread']
    if (thread.get('name') or '').lower()!='bluevua · content testing insights':raise RuntimeError('Unexpected Insights conversation')
    if thread.get('status',{}).get('type') in ('idle','notLoaded'):break
    await asyncio.sleep(10)
   versions=job['versions'];mode=job['mode'];language='Chinese' if job['language']=='zh' else 'English'
   instructions='\n\n'.join(versions[key]['content'] for key in ['master','google-search','manual'])
   if mode=='readability':instructions+='\n\n# Readability editing\n'+versions['readability']['content']
   instructions+=f'''\n\n# Staging trial controller (binding execution boundary)\nRun {job['id']}. Output {language}. This is a staging-only preview. Read the frozen Dashboard packet at {root/'input.json'}. Performance numbers, identities and periods come ONLY from frozen_input; never query advertising APIs, other performance databases, historical chat numbers or the live website for replacement metrics. Authorized local project/creative background and public competitor research may be read as context, with verified source links inline. Do not modify any files, production prompts, budgets, accounts, database/cache, Slack or conversations; do not create agents/chats. Only return the requested schema JSON; the controller saves it. Follow the exact captured prompt versions, including all channel analysis directions. Place Campaign deep dives in campaigns[].markdown. Cover exactly frozen_input.campaigns with each exact name as campaigns[].id. No internal execution disclaimers in public prose.\n'''
   if mode=='readability':instructions+='Restyle frozen_input.completed_analysis without rerunning analysis or changing findings, dates, identities, numeric values or confidence. Preserve all analytical directions. You may supply freely designed HTML/CSS/SVG in html for visual inspection; no scripts, event handlers, frames, forms, external resources, CSS url() or imports. Keep summary and sections/campaigns in the schema for review. Do not fetch new data.'
   else:instructions+='Re-analyze the supplied packet. Return html=null; use concise headings, tables and substantive Campaign-specific detail according to the Search prompt. Do not include other channels or concluded tests.'
   target=await sdk.dashboard_thread(BRAND,instructions,thread_id=THREAD)
   save(state_path,{'submitting':True,'started_at':time.time(),'thread_id':THREAD})
   turn=await sdk.dashboard_turn(target,json.dumps({'task':'Generate staging insight preview','input_file':str(root/'input.json'),'current_prompt':instructions,'run_id':job['id']},ensure_ascii=False),schema(),effort='medium')
   state={'submitting':False,'turn_id':turn.id,'thread_id':THREAD,'started_at':time.time()};save(state_path,state);emit('generating_readability' if mode=='readability' else 'generating_analysis',turn_id=turn.id,thread_id=THREAD)
   finals=[];completed=False
   async for event in turn.stream():
    if event.method=='item/completed':
     item=event.payload.item.root
     if item.type=='agentMessage' and getattr(getattr(item,'phase',None),'value',getattr(item,'phase',None))=='final_answer':finals.append(item.text)
    elif event.method=='turn/completed':completed=getattr(event.payload.turn.status,'value',event.payload.turn.status)=='completed'
   if not completed or not finals:raise RuntimeError('No complete preview; recover the saved native turn')
   raw='\n'.join(finals)
  result=json.loads(re.sub(r'^```(?:json)?\s*|\s*```$','',raw.strip()));save(root/'result.json',result);save(state_path,{**state,'status':'completed'});emit('completed')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);args=parser.parse_args()
 try:asyncio.run(run(args.root.resolve()))
 except Exception as error:
  if 'Recorded turn failed' in str(error) or 'Recorded turn is unavailable' in str(error):
   state_path=args.root/'native-state.json'
   if state_path.exists():save(state_path,{**json.loads(state_path.read_text()),'terminal_failed':True})
  raise
