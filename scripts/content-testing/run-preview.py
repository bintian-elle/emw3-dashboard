"""Remote-only controller: existing native thread, serial turns, file results only."""
import argparse,asyncio,hashlib,json,os,re,time
from pathlib import Path

from anc_bridge.sdk import SafeCodex,native_config,NativeControlResult

BRAND=Path('/home/ubuntu/work/emw3-anc/bluevua')
LEGACY_THREAD='01a11931-c326-7553-8526-c1edf3e9e9a5'
THREAD='01a15a87-c768-7fa3-a874-28123fc46413'

def numbered_report_parts(prompt):
    """Read current top-level output parts without treating input subheads as output."""
    return [re.split(r'\s*[（(]',match.group(1),maxsplit=1)[0].strip()
            for match in re.finditer(r'^##\s+\d+\.\s+(.+)$',prompt,re.M)]


def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2));temp.chmod(0o600);temp.replace(path)


def schema(packet):
    def obj(props):return {'type':'object','additionalProperties':False,'properties':props,'required':list(props)}
    text={'type':'string'}
    section=obj({'title':({'type':'string'} if packet.get('language')=='en' else {'type':'string','enum':packet['required_sections']}),'markdown':text})
    campaign=obj({'test_id':text,'summary':text,'detail_markdown':text})
    return obj({'schema_version':{'type':'string','enum':['channel-prompt-preview-v1']},'report_id':{'type':'string','enum':[packet['report_id']]},'language':{'type':'string','enum':[packet.get('language','zh-CN')]},'title':text,'executive_summary':text,'sections':{'type':'array','items':section,'minItems':len(packet['required_sections']),'maxItems':len(packet['required_sections'])},'campaigns':{'type':'array','items':campaign},'data_gaps':{'type':'array','items':text},'sources':{'type':'array','items':text}})


def decode(raw,packet):
    raw=re.sub(r'^```(?:json)?\s*|\s*```$','',raw.strip())
    report=json.loads(raw)
    assert report['schema_version']=='channel-prompt-preview-v1' and report['report_id']==packet['report_id']
    assert report['language']==packet.get('language','zh-CN') and report['executive_summary'].strip()
    assert len(report['sections'])==len(packet['required_sections']),'Output chapter count mismatch'
    if packet.get('language')!='en':assert [s['title'] for s in report['sections']]==packet['required_sections'],'Output chapters do not match this channel prompt'
    assert all(s['markdown'].strip() for s in report['sections'])
    expected={t['test_id'] for t in packet.get('tests',[])}
    actual=[c['test_id'] for c in report['campaigns']]
    if packet['report_id']=='overview':
        known={c['test_id'] for channel in packet['channel_reports'] for c in channel['campaigns']}
        assert len(actual)==len(set(actual)) and set(actual)<=known,'Unknown Campaign in Overview'
        # Campaign cards use their channel reports; preserve the raw answer separately.
        report['campaigns']=[]
        totals=packet['overview_display_totals']
        if 'reach' not in report['executive_summary'].lower() and '触达' not in report['executive_summary']:
            reach=totals.get('totalReach')
            if reach is not None:
                report['executive_summary']=f'已记录的 Total Reach 为 {reach:,.0f}。'+report['executive_summary']
    else:
        assert len(actual)==len(set(actual)) and set(actual)==expected,'Campaign identity coverage mismatch'
    assert all(c['summary'].strip() and c['detail_markdown'].strip() for c in report['campaigns'])
    report.update(run_id=packet['run_id'],period=packet['period'],scope=packet['scope'],channel=packet['channel'],prompt_sha256=packet['prompt_sha256'],source_captured_at=packet.get('captured_at'))
    return report


async def run(root,only=None):
    manifest=json.loads((root/'manifest.json').read_text())
    routing=json.loads((root/'target-thread.json').read_text()) if (root/'target-thread.json').exists() else {'thread_id':THREAD,'thread_name':'Bluevua · Content Testing Insights'}
    target_thread=routing['thread_id']
    assert target_thread==THREAD,'Unexpected future target; refuse creating or switching to another thread'
    manifest['previous_thread_id']=LEGACY_THREAD;manifest['thread_id']=target_thread;manifest['thread_name']=routing['thread_name'];save(root/'manifest.json',manifest)
    master=(root/'prompts/master.md').read_text()
    state_path=root/'state.json';state=json.loads(state_path.read_text()) if state_path.exists() else {'thread_id':THREAD,'turns':{},'status':'prepared'}
    order=[only] if only else [r['report_id'] for r in manifest['reports']]+['overview']
    assert not only or only in {r['report_id'] for r in manifest['reports']},'Unknown report selection'
    async with SafeCodex(native_config(BRAND,host_requests=True)) as sdk:
        await sdk._ensure_initialized()
        metadata=(await sdk._client.request('thread/read',{'threadId':target_thread,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread']
        assert (metadata.get('name') or '').lower()==routing['thread_name'].lower(),'Unexpected native conversation; refuse creating or switching threads'
        for report_id in order:
            result_path=root/'results'/f'{report_id}.json'
            if result_path.exists():continue
            if report_id=='overview':
                reports=[json.loads((root/'results'/f'{r["report_id"]}.json').read_text()) for r in manifest['reports']]
                assert all(report['run_id']==manifest['run_id'] for report in reports),'Overview cannot mix preview runs'
                prompt=(root/'prompts/overview.md').read_text()
                output_part=re.split(r'## (?:输出格式|Output Format)',prompt)[-1]
                numbered=numbered_report_parts(prompt)
                titles=numbered[1:] if numbered else [re.sub(r'^\d+\.\s*','',line[4:].strip()).split('（')[0].split(' (')[0].strip() for line in output_part.splitlines() if line.startswith('### ')]
                template=root/'overview-template.json'
                packet=json.loads(template.read_text()) if template.exists() else {}
                packet.update({'language':manifest.get('language','zh-CN'),'run_id':manifest['run_id'],'report_id':'overview','channel':'Overview','scope':'period','period':manifest['period'],'required_sections':titles,'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'tests':[],'channel_reports':reports,'overview_display_totals':manifest['overview_display_totals'],'all_channels_completed':True})
                save(root/'inputs/overview.json',packet)
            else:
                packet=json.loads((root/'inputs'/f'{report_id}.json').read_text())
                prompt=(root/'prompts'/f'{"reddit" if report_id=="reddit-lifetime" else report_id}.md').read_text()
            existing=state['turns'].get(report_id)
            if existing and existing.get('turn_id') and existing.get('status')!='completed':
                historical_thread=existing.get('thread_id',LEGACY_THREAD)
                print(json.dumps({'report':report_id,'status':'recovering_existing','thread_id':historical_thread}),flush=True)
                while True:
                    page=(await sdk._client.request('thread/turns/list',{'threadId':historical_thread,'limit':100,'sortDirection':'desc','itemsView':'notLoaded'},response_model=NativeControlResult)).model_dump()
                    target=next((t for t in page['data'] if t['id']==existing['turn_id']),None)
                    assert target is not None,'Existing turn unavailable; do not duplicate inference'
                    if target['status']=='completed':break
                    assert target['status'] not in ('failed','interrupted'),f"Existing {report_id} turn is {target['status']}; do not auto-retry"
                    await asyncio.sleep(10)
                finals=[];cursor=None
                while True:
                    chunk=(await sdk._client.request('thread/items/list',{'threadId':historical_thread,'turnId':existing['turn_id'],'cursor':cursor,'limit':50,'sortDirection':'asc'},response_model=NativeControlResult)).model_dump()
                    for entry in chunk['data']:
                        item=entry['item']
                        if item.get('type')=='agentMessage' and item.get('phase')=='final_answer':finals.append(item['text'])
                    cursor=chunk.get('nextCursor')
                    if not cursor:break
                report=decode('\n'.join(finals),packet)
                save(result_path,report)
                (root/'results'/f'{report_id}.md').write_text('# '+report['title']+'\n\n'+'\n\n'.join('## '+x['title']+'\n\n'+x['markdown'] for x in report['sections']))
                existing.update(status='completed',completed_at=time.time(),duration_seconds=round(time.time()-existing['started_at'],2));save(state_path,state)
                print(json.dumps({'report':report_id,'status':'completed_recovered'}),flush=True)
                continue
            metadata=(await sdk._client.request('thread/read',{'threadId':target_thread,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread']
            while metadata.get('status',{}).get('type') not in ('idle','notLoaded'):
                await asyncio.sleep(10)
                metadata=(await sdk._client.request('thread/read',{'threadId':target_thread,'includeTurns':False},response_model=NativeControlResult)).model_dump()['thread']
            instructions=master+'\n\n# 本轮渠道唯一正文\n'+prompt+'\n\n'+packet.get('prompt_precedence','')
            if packet.get('language')=='en':instructions+='\nPRODUCTION LANGUAGE OVERRIDE: Write all public titles, summaries, section headings and Markdown in English. Preserve IDs, names, figures and links. This is the English source for a separate Chinese translation. Keep channel chapter order and campaign-specific detail routing. Do not publish or modify anything; the controller persists results.'
            thread=await sdk.dashboard_thread(BRAND,instructions,thread_id=target_thread)
            request={'current_prompt':instructions,'presentation_priority':packet.get('presentation_instructions','本轮current_prompt为最新规则。章节、详略、表格及逐Campaign深度以它和required_sections为准，不沿用历史回答或其他轮次的字数/表格限制。'),'run_id':manifest['run_id'],'task':'本地中文预览；只分析当前渠道；按自己的 prompt 完整生成。' if report_id!='overview' else '全部渠道已完成；现在按 Overview prompt 汇总本轮报告。','input_file':str(root/'inputs'/f'{report_id}.json'),'instructions':'先读取 input_file，核对指定日期、scope、required_sections、tests 和缺口；按需要读取 Bluevua 项目背景与对应素材 Markdown，也可联网查官方/竞品/公开内容。只返回 schema JSON。sections 必须按 required_sections 顺序完整回应；摘要和逐 Campaign 短评可供页面直接显示。不要创建对话/agent、修改项目文件、写数据库/缓存或发 Slack。先看真实内容再提具体行动，不可编造已看过素材。'}
            turn=await sdk.dashboard_turn(thread,json.dumps(request,ensure_ascii=False),schema(packet),effort='medium')
            record={'thread_id':target_thread,'turn_id':turn.id,'status':'running','started_at':time.time()}
            state['turns'][report_id]=record;state['status']='running';state['current']=report_id;save(state_path,state)
            print(json.dumps({'report':report_id,'status':'started','turn_id':turn.id}),flush=True)
            finals=[];completed=False
            async for event in turn.stream():
                if event.method=='item/completed':
                    item=event.payload.item.root
                    if item.type=='agentMessage' and getattr(getattr(item,'phase',None),'value',getattr(item,'phase',None))=='final_answer':finals.append(item.text)
                elif event.method=='turn/completed':
                    status=getattr(event.payload.turn.status,'value',event.payload.turn.status)
                    assert status=='completed',f'{report_id} native status {status}; do not auto-retry'
                    completed=True
            assert completed and finals,'Native turn missing a completed final result'
            raw='\n'.join(finals);(root/'results').mkdir(exist_ok=True,mode=0o700)
            raw_path=root/'results'/f'{report_id}.raw.txt';raw_path.write_text(raw);raw_path.chmod(0o600)
            report=decode(raw,packet)
            save(result_path,report)
            markdown='# '+report['title']+'\n\n'+'\n\n'.join('## '+s['title']+'\n\n'+s['markdown'] for s in report['sections'])
            (root/'results'/f'{report_id}.md').write_text(markdown)
            record.update(status='completed',completed_at=time.time(),duration_seconds=round(time.time()-record['started_at'],2));save(state_path,state)
            print(json.dumps({'report':report_id,'status':'completed','seconds':record['duration_seconds']}),flush=True)
        state['status']='completed';state.pop('current',None);save(state_path,state)
        manifest['status']='completed';save(root/'manifest.json',manifest)
        print(json.dumps({'status':'completed','reports':len(order),'thread_id':target_thread}),flush=True)

if __name__=='__main__':
    args=argparse.ArgumentParser();args.add_argument('--root',type=Path,required=True);args.add_argument('--report');parsed=args.parse_args();asyncio.run(run(parsed.root.resolve(),parsed.report))
