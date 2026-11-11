import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {easternClock,safeReason,shouldSkipReportDay} from './policy.mjs';
import {updateTestingNotices} from './notifications.mjs';

const task=process.argv[2];
const tasks={
 reports:{name:'AI 报告',args:['--experimental-strip-types','scripts/content-testing/scheduled-runner.mjs']},
 concluded:{name:'已结束实验快照',args:['scripts/concluded-test-snapshots.mjs']},
};
if(!Object.hasOwn(tasks,task))throw Error('Unknown scheduled report task');
const {name,args}=tasks[task],{day}=easternClock(new Date());
if(task==='reports'&&shouldSkipReportDay(day,process.env.CONTENT_TESTING_SKIP_REPORT_DAY)){
 console.log(`Scheduled report skipped for ${day} as requested.`);process.exit(0);
}
const root=path.resolve('.state/testing-refresh',task==='concluded'?'concluded':day);
await mkdir(root,{recursive:true,mode:0o700});
const file=path.join(root,task+'.json');
let state={};
try{state=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const save=async()=>{
 const temporary=file+'.'+process.pid+'.tmp';
 await writeFile(temporary,JSON.stringify(state),{mode:0o600});
 await rename(temporary,file);
};
if(state.completedDay!==day){
 if(state.completedDay)state={};
 try{
  await new Promise((resolve,reject)=>{
   let stderr='';
   const child=spawn(process.execPath,args,{stdio:['ignore','inherit','pipe']});
   child.stderr.on('data',chunk=>{process.stderr.write(chunk);stderr=(stderr+chunk).slice(-4000);});
   child.once('error',reject);
   child.once('close',(code,signal)=>{
    if(code===0)return resolve();
    const reason=stderr.split('\n').find(line=>/^Error: /.test(line));
    reject(Error(reason?.slice(7)||'任务退出：'+(signal??code)));
   });
  });
  state.completedDay=day;
  delete state.error;
 }catch(error){state.error=safeReason(error);}
 await save();
}
const incident=[['report',state]];
const notifiedKeys=state.failureSent?{report:state.failureSent}:{};
const recoveredKeys=state.recoverySent?{report:state.recoverySent}:{};
const link='https://emw3-dashboard.win/bluevua/testing';
try{
 await updateTestingNotices({
  items:{notifiedKeys,recoveredKeys,
   failureText:()=>['Testing Dashboard '+name+'失败（'+day+'，美东）',state.error,link].join('\n'),
   recoveryText:()=>['Testing Dashboard '+name+'补跑成功（'+day+'，美东）',link].join('\n'),
  },
  failed:state.error&&!state.failureSent?incident:[],
  recovered:state.completedDay===day&&state.failureSent&&!state.recoverySent?incident:[],
  save:async()=>{state.failureSent=notifiedKeys.report;state.recoverySent=recoveredKeys.report;await save();},
 });
}catch(error){console.error(safeReason(error));process.exitCode=1;}
if(state.error){console.error(state.error);process.exitCode=1;}
