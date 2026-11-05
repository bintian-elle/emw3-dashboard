"""Compose a saved analysis in the existing Insights thread; isolated file output only."""
import argparse,asyncio,json,time,hashlib
from pathlib import Path
from anc_bridge.sdk import SafeCodex,native_config,NativeControlResult
BRAND=Path('/home/ubuntu/work/emw3-anc/bluevua');THREAD='01a15a87-c768-7fa3-a874-28123fc46413'
def obj(properties):return {'type':'object','additionalProperties':False,'properties':properties,'required':list(properties)}
def array(item):return {'type':'array','items':item}
def schema(structure=None,free=False):
 if free:
  s={"type":"string"}
  return obj({"schema_version":{"type":"string","enum":["insight-presentation-v3"]},"title":s,"summary":s,"sections":array(obj({"id":s,"title":s})),"blocks":array(obj({"id":s,"scope":s,"section_id":s,"type":{"type":"string","enum":["document"]},"title":s,"html":s,"dataset_refs":array(s),"media_keys":array(s),"design_reason":s}))})
 s={'type':'string'};n={'type':'number'}
 chart=obj({'chart_type':s,'dataset_ref':s,'x_key':s,'y_keys':array(s),'reason':s,'annotations':array(obj({'category':s,'label':s}))})
 marker=obj({**{key:n for key in ['x','y','width','height']},**{key:s for key in ['label','observation','recommendation','confidence']}})
 creative=obj({'asset_id':s,'media_key':s,'markers':array(marker)})
 action=obj({key:s for key in ['priority','target','action','evidence','validation']})
 block=obj({'id':s,'scope':s,'type':{'type':'string','enum':['highlight','chart','creative','actions','text']},'title':s,'text':s,'chart':{'anyOf':[chart,{'type':'null'}]},'creative':{'anyOf':[creative,{'type':'null'}]},'actions':array(action)})
 if structure:
  block['properties']['section_id']={'type':'string','enum':[section['id'] for section in structure['sections']]}
  block['required'].append('section_id')
 return obj({'schema_version':{'type':'string','enum':['insight-presentation-v2' if structure else 'insight-presentation-v1']},'title':s,'summary':s,**({'sections':array(obj({'id':s,'title':s}))} if structure else {}),'blocks':array(block)})
def save(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2));temp.chmod(0o600);temp.replace(path)
async def run(root,edition=None):
 name='presentation-freeform' if edition=='freeform' else 'presentation-autonomous' if edition=='autonomous' else ('presentation-sections' if edition=='sections' else 'presentation')
 result=root/f'results/{name}.json';state=root/f'{name}-state.json'
 structure=json.loads((root/'presentation-structure.json').read_text()) if edition in ('sections','autonomous','freeform') else None
 if result.exists():print('Composition already saved; no duplicate inference');return
 if state.exists():raise RuntimeError('Existing composition turn must be inspected and recovered, never automatically duplicated')
 analysis=json.loads((root/'results/google-pmax.json').read_text());packet=json.loads((root/'inputs/google-pmax.json').read_text())
 if structure and hashlib.sha256((root/'results/google-pmax.json').read_bytes()).hexdigest()!=structure['analysis_sha256']:raise RuntimeError('Saved analysis changed; refuse mixed evidence')
 prompt=(root/'prompts/readability.md').read_text()
 capabilities={'charts':['line','area','bar','column','pie','scatter','composed','radar','funnel','treemap'],'rules':'Select freely based on content; do not fill a template or force every chart type. Data values are rendered from datasets; never provide invented values. composed supports two unit axes. Campaign blocks render only inside their matching detailed analysis; channel blocks render in the channel overview. Use Chinese business prose, actual creative names, no raw IDs in titles/prose. Keep chart categories stable for source lookup. Do not repeat summary as a highlight block. Metrics are pinned separately by UI. Use text blocks for concise findings, actions for priority lists. Creative markers must be grounded in actual source image/frame coordinates, not guessed from text. Frame evidence is available for selected videos; images available for all registered thumbnails.'}
 request={'task':'将已完成的Google PMax分析编排为可视化报告，分析结论不重算不改写。自主决定图型和布局；按重要发现选择真实素材截图与帧并标注具体区域。','analysis_file':str(root/'results/google-pmax.json'),'data_file':str(root/'inputs/google-pmax.json'),'media_index_file':str(root/'media-index.json'),'capabilities':capabilities,'instructions':'必须读取上述文件。实际查看你要标注的 source_path 图片/帧；只读取本轮证据，不联网、不读代码、不修改文件、不写数据库、不创建会话/agent、不发消息。scope只能channel或analysis.campaigns[].test_id。保持渠道宏观与逐Campaign素材诊断分离。使用schema严格JSON；无关字段null或[]。先读当前readability prompt，不沿用历史排版。'}
 if structure:
  request['sections']=structure['sections'];request['required_scopes']=structure['scopes'];request['existing_presentation_file']=str(root/'results/presentation.json')
  request['structure_rules']='Recompose only. Reuse the completed analysis, datasets and verified image/frame evidence. Do not rerun data analysis. Return sections in supplied order with identical IDs and preserved analytical meaning. Choose chapter/navigation titles yourself; supplied titles describe meaning, not fixed copy. Every required scope must cover all sections substantively, with blocks ordered by section_id. Compose the complete report freely within those three analytical directions. Choose titles, emphasis, combinations and visual expression yourself based on reader comprehension. Do not simply retain old Markdown tables or use a prescribed format per content type. In the channel creative chapter, synthesize existing cross-Campaign format/copy findings; retain specific visual evidence in its matching Campaign. Preserve image/video/headline/description comparisons from the saved analysis, not just selected screenshots. Read the unchanged original PMax prompt only to confirm structure. Reuse prior verified coordinates/evidence where applicable; do not introduce new causal claims. Chinese public prose.'
 if edition=='freeform':
  request.pop('existing_presentation_file',None)
  request['capabilities']={'format':'Free HTML/CSS/SVG per analytical direction. No block-type palette, prescribed layout, chart-type whitelist, one-dataset restriction, or fixed title/body/chart ordering. Native details/summary and links supported; JavaScript is disabled. Use responsive CSS for arbitrary visual composition and inline SVG for any appropriate chart. Fonts inherit system sans; use theme variables --surface --foreground --muted --border --accent --soft. Prefer clean readable Nova style, no nested heavy borders. You control hierarchy, spacing, comparison, emphasis, grouping, charts and placement. Three direction meanings/order and external page shell remain fixed.'}
  request['structure_rules']='Retain direction IDs/order and required scopes, titles are yours. Create fresh presentation from the completed analysis, not previous presentation. Do not read prior presentation files. No analytical rerun, no new causal claims. Read authoritative datasets and saved analysis. You MAY join current/previous datasets, sum additive metrics and recompute ratios from authoritative numerators/denominators for presentation; record sources and calculations in design_reason. No additional API queries. You may use any appropriate visualization, freely composed HTML/CSS/SVG, not a fixed widget schema. Do not merely rewrap Markdown tables. Evaluate whether a reader sees the key finding without reading every cell; use whatever expression best achieves that. Do not force a chart or arbitrary quota. Keep source data, units and uncertainty honest.'
  request['instructions']='Read current readability prompt and saved analysis/data/media. Only read this evidence; no network, code reads, file writes, agents, messages or database writes. For visual annotations inspect actual source images/frames. Return strict v3 JSON. Each block html is an HTML fragment with optional style and inline SVG, no Markdown, scripts, event handlers, iframe, external dependencies, forms or remote CSS. Media src must be /api/testing/presentation/media/{registered key}?v={first12 sha256}. Reference original verified URLs only in anchors with target=_blank rel=noopener noreferrer. Every chart exposes units, readable labels and text alternative; use viewBox SVG and responsive CSS. Bind each block to dataset_refs/media_keys and explain layout/data transformations in design_reason. Public Chinese prose with actual names, IDs only in machine references. Do not duplicate the summary or pinned shell KPI. No fixed internal card template. All scope directions must be substantively covered.'
 async with SafeCodex(native_config(BRAND,host_requests=True)) as sdk:
  await sdk._ensure_initialized();metadata=(await sdk._client.request('thread/read',{'threadId':THREAD,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread']
  if (metadata.get('name') or '').lower()!='bluevua · content testing insights':raise RuntimeError('Wrong existing native thread')
  if metadata.get('status',{}).get('type') not in ('idle','notLoaded'):raise RuntimeError('Existing Insights thread is busy; do not compete')
  thread=await sdk.dashboard_thread(BRAND,prompt,thread_id=THREAD)
  turn=await sdk.dashboard_turn(thread,json.dumps(request,ensure_ascii=False),schema(structure,edition=='freeform'),effort='high')
  save(state,{'thread_id':THREAD,'turn_id':turn.id,'started_at':time.time(),'status':'running','analysis_sha256':hashlib.sha256((root/'results/google-pmax.json').read_bytes()).hexdigest()});print(json.dumps({'stage':'presentation','turn_id':turn.id,'status':'running'}),flush=True)
  finals=[];completed=False
  async for event in turn.stream():
   if event.method=='item/completed':
    item=event.payload.item.root
    if item.type=='agentMessage' and getattr(getattr(item,'phase',None),'value',getattr(item,'phase',None))=='final_answer':finals.append(item.text)
   elif event.method=='turn/completed':completed=getattr(event.payload.turn.status,'value',event.payload.turn.status)=='completed'
  if not completed or not finals:raise RuntimeError('No completed composition response; recover the recorded turn')
  raw='\n'.join(finals);(root/f'results/{name}.raw.txt').write_text(raw);save(result,json.loads(raw));current=json.loads(state.read_text());current.update(status='completed',completed_at=time.time());save(state,current)
  print(json.dumps({'stage':'presentation','status':'completed','blocks':len(json.loads(raw)['blocks'])}),flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--edition',choices=['sections','autonomous','freeform']);a=p.parse_args();asyncio.run(run(a.root.resolve(),a.edition))
