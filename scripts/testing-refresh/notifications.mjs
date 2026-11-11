import {spawn} from 'node:child_process';

export function notifyTesting(message){
 const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
 return new Promise((resolve,reject)=>{
  const child=spawn(python,['scripts/testing-refresh/notify.py',message],{stdio:'inherit'});
  child.once('error',reject);
  child.once('exit',code=>code===0?resolve():reject(Error('Slack notification failed')));
 });
}

/** Retry undelivered notices and send recovery only for an incident already reported. */
export async function updateTestingNotices({items,failed,recovered,send=notifyTesting,save}){
 for(const [kind,entries,format] of [['failure',failed,items.failureText],['recovery',recovered,items.recoveryText]]){
  if(!entries.length)continue;
  await send(format(entries));
  const map=kind==='failure'?items.notifiedKeys:items.recoveredKeys;
  for(const [key] of entries)map[key]=new Date().toISOString();
  await save();
 }
}
