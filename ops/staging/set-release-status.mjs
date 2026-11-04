import nextEnv from '@next/env';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {reviewChanges} from '../../lib/staging-review-changes.ts';
import {readStagingReleaseStatus} from '../../lib/staging-release.ts';
nextEnv.loadEnvConfig(process.cwd());
if(process.env.DEPLOYMENT_ENV!=='staging'||!existsSync('.staging-checkout'))throw Error('Run inside the isolated staging checkout');
const [productionRef,previewRef,summaryZh,summaryEn,changeList]=process.argv.slice(2);
for(const summary of [summaryZh,summaryEn])if(summary!==undefined&&(!summary.trim()||summary.trim().length>240))throw Error("Release summaries must contain 1–240 characters");
const changeIds=changeList?changeList.split(','):[];
if(reviewChanges(changeIds).length!==changeIds.length)throw Error('Use unique known release change IDs');
function revision(ref){if(!/^[a-f0-9]{7,40}$/i.test(ref||''))throw Error('Supply the published and preview content commit IDs');return execFileSync('git',['rev-parse','--verify',ref+'^{commit}'],{encoding:'utf8'}).trim();}
const file=process.env.STAGING_RELEASE_STATUS_FILE||join(process.cwd(),'.state','staging-release.json');
const value={productionRevision:revision(productionRef),previewRevision:revision(previewRef),changeIds,summary:{zh:summaryZh?.trim(),en:summaryEn?.trim()},updatedAt:new Date().toISOString()};
await mkdir(dirname(file),{recursive:true,mode:0o700});const temporary=file+'.'+process.pid+'.tmp';await writeFile(temporary,JSON.stringify(value),{mode:0o600});await rename(temporary,file);
console.log(JSON.stringify(await readStagingReleaseStatus(file)));
