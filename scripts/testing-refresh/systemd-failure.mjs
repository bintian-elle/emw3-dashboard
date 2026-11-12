import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {easternClock} from './policy.mjs';
import {notifyTesting} from './notifications.mjs';
import {failureAlreadyReported,failureMessage,monitoredTasks} from './systemd-failure-policy.mjs';
import {trackingFailureDetails,trackingNoticeDirectory} from '../website-tracking-notices.mjs';

const service=process.argv[2];
if(!Object.hasOwn(monitoredTasks,service))throw Error('Unknown scheduled task');
const {stdout}=await promisify(execFile)('systemctl',['show',service,'-p','Result','-p','InvocationID','-p','ExecMainStartTimestamp']);
const properties=Object.fromEntries(stdout.trim().split('\n').map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)];}));
const startedAt=Date.parse(properties.ExecMainStartTimestamp??'');
const day=easternClock(Number.isFinite(startedAt)?new Date(startedAt):new Date()).day;
const phase=service==='emw3-content-testing-reports.service'?'reports':service==='emw3-concluded-tests.service'?'concluded':service==='emw3-testing-data-refresh.service'?'data':service==='emw3-testing-google-refresh.service'?'google':null;
let state={};
if(phase){
 const folder=phase==='concluded'?'concluded':day;
 try{state=JSON.parse(await readFile(path.join('.state/testing-refresh',folder,`${phase}.json`),'utf8'));}catch{/* Notify when the task failed before recording its state. */}
}
if(Number.isFinite(startedAt)&&failureAlreadyReported(service,state,startedAt))process.exit(0);
const invocation=properties.InvocationID||properties.ExecMainStartTimestamp;
if(!invocation)throw Error('Could not identify failed task invocation');
const key=createHash('sha256').update(`${service}:${invocation}`).digest('hex');
const folder=path.resolve('.state/testing-refresh/systemd-notices');await mkdir(folder,{recursive:true,mode:0o700});
const marker=path.join(folder,key);
try{await readFile(marker);process.exit(0);}catch(error){if(error.code!=='ENOENT')throw error;}
let details='';
if(service==='emw3-website-tracking-cache.service'){
 try{details=trackingFailureDetails(JSON.parse(await readFile(path.join(trackingNoticeDirectory(),'status.json'),'utf8')),startedAt);}catch{/* A crash before state persistence still gets the generic alert. */}
}
await notifyTesting(failureMessage(service,properties.Result)+(details?`\n失败范围与原因：\n${details}`:''));
await writeFile(marker,new Date().toISOString(),{mode:0o600,flag:'wx'});
