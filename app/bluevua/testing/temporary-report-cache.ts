import type {PmaxReadableReport} from '@/lib/testing-insight-presentation';
type Key={owner:string;revision:string;scope:string;campaign:string;start:string;end:string;compareStart?:string;compareEnd?:string;language:'en'|'zh'};
type Pair=Partial<Record<'en'|'zh',PmaxReadableReport>>;
const prefix='testing-temporary-report:';
export function clearOldLocalTemporaryReports(){
 try{const marker='testing-local-report-reset-20261106';if(sessionStorage.getItem(marker))return;for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(prefix))sessionStorage.removeItem(key);}sessionStorage.setItem(marker,'1');window.dispatchEvent(new CustomEvent('testing-temporary-report-updated'));}catch{/* Storage may be unavailable. */}
}
export function temporaryReportKey(key:Key){return prefix+JSON.stringify([key.owner,key.revision,key.scope,key.campaign,key.start,key.end,key.compareStart??'',key.compareEnd??'',key.language]);}
export function saveTemporaryReport(key:Key,result:Pair,createdAt=Date.now()){try{sessionStorage.setItem(temporaryReportKey(key),JSON.stringify({expires:createdAt+86400000,result}));}catch{/* The server cache remains available for retry. */}window.dispatchEvent(new CustomEvent('testing-temporary-report-updated'));}
export function readTemporaryReport(key:Key):Pair|null{try{const storageKey=temporaryReportKey(key),value=JSON.parse(sessionStorage.getItem(storageKey)??'null');if(!value||value.expires<=Date.now()){sessionStorage.removeItem(storageKey);return null;}return value.result as Pair;}catch{return null;}}
