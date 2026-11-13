import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {notifyTesting} from './testing-refresh/notifications.mjs';
import {formatTrackingQuota} from '../lib/website-tracking-quota.mjs';

export const trackingNoticeDirectory=()=>process.env.WEBSITE_TRACKING_NOTICE_DIR||'.state/website-tracking-notices';
export async function recordTrackingRun(result,{directory=trackingNoticeDirectory(),send=notifyTesting}={}){
 await mkdir(directory,{recursive:true,mode:0o700});
 const file=path.join(directory,'status.json');
 let previous={};
 try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const state={...previous,...result,updatedAt:new Date().toISOString(),pendingRecovery:!!previous.pendingRecovery||result.failed>0};
 async function save(){const temporary=`${file}.${randomUUID()}.tmp`;await writeFile(temporary,JSON.stringify(state),{mode:0o600});await rename(temporary,file);}
 await save();
 if(!result.failed&&result.refreshed===8&&state.pendingRecovery){
  await send('Dashboard 定时任务已恢复：Website Tracking 数据刷新\n8 项缓存已全部刷新成功，数据已保存。\nhttps://emw3-dashboard.win/bluevua');
  state.pendingRecovery=false;state.recoverySentAt=new Date().toISOString();await save();
 }
 return state;
}

export function trackingFailureDetails(state,startedAt){
 if(!state?.failed||Date.parse(state.updatedAt)<startedAt||!Array.isArray(state.failures))return '';
 // Revalidate persisted values before sending them outside the host.
 const devices=new Set(['all','desktop','mobile','tablet','worker']);
 const reasons=new Set(['queue_timeout','query_timeout','rate_limited','authentication_failed','permission_denied','network_error','incomplete_report','property_mismatch','invalid_response','connection_or_tool_failure','upstream_unavailable','refresh_lock_lost','refresh_failed']);
 const timing=(name,value)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=3600?` · ${name} ${Math.round(value*10)/10}s`:'';
 return state.failures.slice(0,8).map(f=>`${devices.has(f.device)?f.device:'worker'} / ${['overview','collection'].includes(f.scope)?f.scope:'refresh'}: ${reasons.has(f.code)?f.code:'refresh_failed'}${f.skippedAfterSharedFailure===true?'（共享故障后暂停请求）':''}${/^[a-zA-Z.]{1,80}$/.test(f.section??'')?` (${f.section})`:''}${timing('排队',f.queueWaitSeconds)}${timing('总耗时',f.elapsedSeconds)}${Number.isInteger(f.httpStatus)&&f.httpStatus>=100&&f.httpStatus<=599?` · HTTP ${f.httpStatus}`:''}${f.code==='rate_limited'||f.httpStatus===429||f.quota?` · ${f.quota&&f.httpStatus!==429?'先前 429：':''}${formatTrackingQuota(f.quota)}`:''}`).join('\n');
}
