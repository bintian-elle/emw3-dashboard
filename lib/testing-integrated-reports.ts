import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';import path from 'node:path';
import type {PmaxReadableReport} from './testing-insight-presentation';
export type IntegratedReportBundle={run_id:string;period:{start:string;end:string};reports:Record<string,{en:PmaxReadableReport;zh:PmaxReadableReport}>};
/** Production is excluded even if a trial directory is accidentally configured. */
export async function integratedReportDirectory():Promise<string|null>{
 if(process.env.DEPLOYMENT_ENV!=='staging')return null;
 if(process.env.STAGING_CONTENT_TESTING_REPORT_DIR)return process.env.STAGING_CONTENT_TESTING_REPORT_DIR;
 if(process.env.NODE_ENV!=='development')return null;
 try{const pointer=JSON.parse(await readFile(path.join(process.cwd(),'.state/content-testing-integrated/active.json'),'utf8'));if(!/^[a-z0-9-]{1,64}$/.test(pointer.run_id))throw Error('Invalid isolated report run');return path.join(process.cwd(),'.state/content-testing-integrated',pointer.run_id);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
export async function readIntegratedReports():Promise<IntegratedReportBundle|null>{
 const root=await integratedReportDirectory();if(!root)return null;
 const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));if(manifest.status!=='completed')return null;
 const raw=await readFile(path.join(root,'compiled.json'),'utf8'),checksums=JSON.parse(await readFile(path.join(root,'checksums.json'),'utf8'));
 if(checksums.run_id!==manifest.run_id||createHash('sha256').update(raw).digest('hex')!==checksums.compiled)throw Error('Isolated report checksum mismatch');
 const bundle=JSON.parse(raw) as IntegratedReportBundle;
 if(bundle.run_id!==manifest.run_id||bundle.period.start!==manifest.period.start||bundle.period.end!==manifest.period.end)throw Error('Isolated report identity mismatch');return bundle;
}
