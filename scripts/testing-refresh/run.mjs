import env from '@next/env';import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';
import {easternClock,dueAttempt,collectionPlan,safeReason} from './policy.mjs';
env.loadEnvConfig(process.cwd());
const mode=process.argv[2];if(!['data','google','insights'].includes(mode))throw Error('Unknown refresh phase.');
const now=new Date(),{day,hour}=easternClock(now),root=path.resolve('.state/testing-refresh',day),file=path.join(root,`${mode}.json`);
await mkdir(root,{recursive:true,mode:0o700});
let state;try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={items:{}};}
const save=async()=>{const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(state,null,2),{mode:0o600});await rename(temp,file);};
const execute=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit',env:process.env});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Process failed (${code})`)));});
async function refresh(item){
 const secret=process.env.CRON_SECRET?.trim()||process.env.AI_WORKER_SECRET?.trim();if(!secret)throw Error('Internal refresh credential missing.');
 const response=await fetch('http://127.0.0.1:3000/api/testing/data-refresh',{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:JSON.stringify({...item,scheduled:true}),signal:AbortSignal.timeout(mode==='google'?900000:240000)});
 const body=await response.json();if(!response.ok)throw Error(body.reason||body.error||`HTTP ${response.status}`);
 if(!Number.isFinite(Date.parse(body.updatedAt)))throw Error('Refresh did not confirm a complete snapshot.');return body.updatedAt;
}
async function prerequisites(){
 for(const phase of ['data','google']){let previous;try{previous=JSON.parse(await readFile(path.join(root,`${phase}.json`),'utf8'));}catch{throw Error(`${phase} snapshots have not completed today.`);}
 const expected=phase==='data'?collectionPlan().map(i=>i.key):['google:all'];
 const pending=expected.filter(key=>!previous.items[key]?.success);if(pending.length)throw Error(`Awaiting today’s snapshots: ${pending.join(', ')}`);}
}
const plan=mode==='data'?collectionPlan():mode==='google'?[{key:'google:all',channel:'google-search'}]:[{key:'insights:all'}];
for(const item of plan){
 const current=state.items[item.key]??={attempts:0};
 if(dueAttempt(current,hour,mode==='data'?4:5,now.getTime(),mode)){
  current.attempts++;current.lastAttempt=new Date().toISOString();await save();
  try{if(mode==='insights'){await prerequisites();await execute(process.execPath,['scripts/content-testing/daily.mjs']);}else current.updatedAt=await refresh(item);current.success=true;delete current.error;}
  catch(error){current.error=safeReason(error instanceof Error?error.message:error);console.error(`${item.key}: ${current.error}`);}
  await save();
 }
}
const exhausted=Object.entries(state.items).filter(([,item])=>!item.success&&item.attempts>0&&(mode==='data'?hour>=5:item.attempts>=1));
state.notifiedKeys??={};
const unnotified=exhausted.filter(([key])=>!state.notifiedKeys[key]);
if(unnotified.length){
 const text=`Testing Dashboard 每日${mode==='insights'?'AI 分析':'数据刷新'}失败（${day}，东部时间）\n当天计划更新未成功，旧快照和分析已保留。\n${unnotified.map(([key,item])=>`• ${key}（已尝试 ${item.attempts} 次）: ${item.error}`).join('\n')}\nhttps://emw3-dashboard.win/bluevua/testing`;
 try{await execute(process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python',['scripts/testing-refresh/notify.py',text]);for(const [key] of unnotified)state.notifiedKeys[key]=new Date().toISOString();await save();}catch{console.error('Slack delivery failed; notification will retry on the next timer tick.');}
}
if(unnotified.some(([key])=>!state.notifiedKeys[key]))process.exitCode=1;
console.log(JSON.stringify({phase:mode,day,complete:plan.every(item=>state.items[item.key]?.success),failed:exhausted.map(([key])=>key)}));
