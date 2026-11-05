import {validateInsightPresentation,type PmaxReadableReport,type PresentationSection} from './testing-insight-presentation.ts';
export type TrialPresentationContext=Omit<PmaxReadableReport,'presentation'|'analysis'|'language'>&{sections:PresentationSection[]};
export type TrialVisualResult={report:PmaxReadableReport;reports:{en:PmaxReadableReport;zh:PmaxReadableReport}};
export function validateTrialVisualResult(value:TrialVisualResult,campaigns:string[],context?:TrialPresentationContext){
 for(const language of ['en','zh'] as const){
  const report=value.reports?.[language];if(!report||report.language!==language||!report.analysis?.campaigns||report.analysis.campaigns.length!==campaigns.length||new Set(report.analysis.campaigns.map(c=>c.test_id)).size!==campaigns.length||report.analysis.campaigns.some(c=>!campaigns.includes(c.test_id)))throw Error('Trial report Campaign coverage mismatch');
  if(context&&(JSON.stringify(report.datasets)!==JSON.stringify(context.datasets)||JSON.stringify(report.media)!==JSON.stringify(context.media)||JSON.stringify(report.period)!==JSON.stringify(context.period)||JSON.stringify(report.comparison)!==JSON.stringify(context.comparison)))throw Error('Trial report changed frozen evidence');
  validateInsightPresentation(report.presentation,{...report,sections:context?.sections??report.presentation.sections});
 }
 if(!value.report||!['en','zh'].includes(value.report.language??'')||JSON.stringify(value.report)!==JSON.stringify(value.reports[value.report.language as 'en'|'zh']))throw Error('Trial report language mismatch');
 return value;
}
export function assembleTrialVisualResult(raw:{en:{presentation:PmaxReadableReport['presentation'];campaigns:PmaxReadableReport['analysis']['campaigns']};zh:{presentation:PmaxReadableReport['presentation'];campaigns:PmaxReadableReport['analysis']['campaigns']}},context:TrialPresentationContext,language:'en'|'zh',runId:string){
 const build=(language:'en'|'zh'):PmaxReadableReport=>{const {sections,...evidence}=context;void sections;return {...evidence,run_id:runId,language,presentation:raw[language].presentation,analysis:{executive_summary:raw[language].presentation.summary,campaigns:raw[language].campaigns}};};
 const reports={en:build('en'),zh:build('zh')};const result={report:reports[language],reports};return validateTrialVisualResult(result,result.report.analysis.campaigns.map(c=>c.test_id),context);
}

/** Preserve individual cached measurements; never sum ad/asset associations into totals. */
export function trialMetricRows(value:unknown):Record<string,string|number|null>[] {
 const rows:Record<string,string|number|null>[]=[];
 const visit=(value:unknown,label='')=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(item=>visit(item,label));return;}const object=value as Record<string,unknown>,name=typeof object.name==='string'?object.name:typeof object.campaignName==='string'?object.campaignName:label;const metrics=object.metrics;
 if(metrics&&typeof metrics==='object'&&!Array.isArray(metrics)){const numeric=Object.fromEntries(Object.entries(metrics).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)));if(Object.keys(numeric).length)rows.push({category:name||`Measurement ${rows.length+1}`,...numeric} as Record<string,string|number|null>);}
 for(const [key,child] of Object.entries(object))if(key!=='metrics')visit(child,name);
 };visit(value);return rows;
}
