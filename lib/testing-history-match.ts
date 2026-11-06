export type HistoryFrequency='daily'|'weekly'|'monthly';
export type HistoryReport={title:string;summary:string;sections:Array<{title:string;markdown:string}>;generatedAt:string|null};
type Row={period_label:string|null;period_start:string|null;period_end:string|null;payload:unknown;generated_at?:string|Date|null};
type Report={report_id?:string;title?:string;executive_summary?:string;sections?:Array<{title:string;markdown:string}>;campaigns?:Array<{test_id:string;summary:string;detail_markdown?:string}>};
export function matchHistoryReport(rows:Row[],frequency:HistoryFrequency,start:string,end:string,scope:string,campaign?:string):HistoryReport|null{
 const last=new Date(`${end}T00:00:00Z`),first=new Date(`${start}T00:00:00Z`);
 if(!Number.isFinite(first.valueOf())||!Number.isFinite(last.valueOf()))return null;
 if(frequency==='daily'&&start!==end||frequency==='weekly'&&(last.valueOf()-first.valueOf()!==6*86400000||first.getUTCDay()!==2)||frequency==='monthly'&&(first.getUTCDate()!==1||last.getUTCMonth()!==first.getUTCMonth()||new Date(last.valueOf()+86400000).getUTCDate()!==1))return null;
 for(const row of rows){
  if(row.period_start!==start||row.period_end!==end)continue;
  const label=(row.period_label??'').toLowerCase();
  if(frequency==='daily'&&!label.includes('daily')||frequency==='weekly'&&!label.includes('week')||frequency==='monthly'&&!label.includes('month'))continue;
  const generatedValue=row.generated_at==null?NaN:new Date(row.generated_at).getTime(),generatedAt=Number.isFinite(generatedValue)?new Date(generatedValue).toISOString():null;
  const payload=row.payload as {overview?:{executive_summary?:string;key_findings?:string[];recommended_actions?:string[]};channel_reports?:Report[];tests?:Array<{test_id:string;campaign_name?:string|null;summary:string|null;preview_sections?:Array<{title:string;markdown:string}>}>};
  const report=payload.channel_reports?.find(item=>item.report_id===scope);
  if(campaign){const found=report?.campaigns?.find(item=>item.test_id===campaign);if(found?.summary)return {title:campaign,summary:found.summary,generatedAt,sections:found.detail_markdown?[{title:'',markdown:found.detail_markdown}]:[]};const test=payload.tests?.find(item=>item.test_id===campaign||item.campaign_name===campaign);if(test?.summary)return {title:campaign,summary:test.summary,generatedAt,sections:test.preview_sections??[]};continue;}
  if(report?.executive_summary)return {title:report.title||scope,summary:report.executive_summary,generatedAt,sections:report.sections??[]};
  if(scope==='overview'&&payload.overview?.executive_summary){const overview=payload.overview;return {title:'Overview',summary:overview.executive_summary!,generatedAt,sections:[...(overview.key_findings?.length?[{title:'Key findings',markdown:overview.key_findings.map(x=>`- ${x}`).join('\n')}]:[]),...(overview.recommended_actions?.length?[{title:'Recommended actions',markdown:overview.recommended_actions.map(x=>`- ${x}`).join('\n')}]:[])]};}
 }
 return null;
}
