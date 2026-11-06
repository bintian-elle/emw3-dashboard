import 'server-only';
import {insightSourceUrls} from './testing-insight-sources';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {integratedReportDirectory,readIntegratedReports} from './testing-integrated-reports.server';
import type {validatePromptRun} from './testing-prompts-contract';
import type {TrialPresentationContext} from './testing-prompt-trial-report';
import type {PresentationMedia} from './testing-insight-presentation';
type Input=ReturnType<typeof validatePromptRun>;
export async function captureIntegratedPromptTrial(input:Input){
 const root=await integratedReportDirectory();if(!root)return null;const bundle=await readIntegratedReports();const report=bundle?.reports[input.channel]?.en;if(!report)return null;
 if(input.channel!=='social-media'&&(report.period.start!==input.start||report.period.end!==input.end||input.comparison&&(report.comparison.start!==input.comparison.start||report.comparison.end!==input.comparison.end)))return null;
 const sourceRoot=path.basename(root)==='qa'?path.dirname(root):root;
 const packet=JSON.parse(await readFile(path.join(sourceRoot,'inputs',input.channel+'.json'),'utf8'));
 const tests=packet.tests.filter((test:{test_id:string})=>input.campaign==='all'||test.test_id===input.campaign);if(input.campaign!=='all'&&!tests.length)throw Error('Campaign is outside the configured testing scope.');
 const names=tests.map((test:{test_id:string})=>test.test_id),{presentation,analysis,...evidence}=report;void analysis;
 const single=input.campaign!=='all';const media=report.media.filter(m=>!single||m.campaigns.some(c=>names.includes(c)));
 const context:TrialPresentationContext={...evidence,sections:packet.sections??presentation.sections,media,source_urls:[...new Set([...(report.source_urls??[]),...insightSourceUrls(packet)])], ...(single?{totals:{},comparison_totals:{},datasets:Object.fromEntries(Object.entries(report.datasets).filter(([key])=>key==='input'||names.some((name:string)=>key.startsWith(name+'.'))))}:{})};
 // Freeze evidence, never pass the published conclusions to a fresh analysis.
 const index=JSON.parse(await readFile(path.join(sourceRoot,'media-index.json'),'utf8')) as PresentationMedia[];
 return {...packet,tests,campaigns:names,completed_channel_reports:undefined,visual_context:context,media_directory:path.join(sourceRoot,'media'),media_index:index.filter(m=>media.some(item=>item.key===m.key)),...(single?{presentation_datasets:context.datasets,comparison_totals:undefined,overview_display_totals:undefined,supporting_data:{daily_history:{[input.campaign]:packet.supporting_data?.daily_history?.[input.campaign]??[]}}}:{})};
}
