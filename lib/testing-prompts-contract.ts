import type {OverviewInsightSource} from './testing-overview-trial-sources.ts';
import {validateTrialVisualResult,type TrialVisualResult} from './testing-prompt-trial-report.ts';
export const testingPromptCatalog=[
 {id:'master',file:'prompts/content-testing/master.md',name:'Master rules',zh:'总规则',uses:['All channel analysis','Overview'],stage:'analysis'},
 {id:'overview',file:'prompts/content-testing/overview.md',name:'Overview',zh:'Overview',uses:['Executive Summary','Cross-channel recommendations'],stage:'summary'},
 {id:'readability',file:'prompts/content-testing/readability.md',name:'Readability',zh:'表达与可读性',uses:['Channel report presentation','Campaign detail presentation'],stage:'presentation'},
 {id:'google-search',file:'prompts/content-testing/google-search.md',name:'Google Search',zh:'Google Search',uses:['Search channel insight','Search Campaign insights'],stage:'analysis'},
 {id:'google-pmax',file:'prompts/content-testing/google-pmax.md',name:'Google PMAX',zh:'Google PMAX',uses:['PMAX channel insight','PMAX Campaign insights'],stage:'analysis'},
 {id:'google-demand-gen',file:'prompts/content-testing/google-demand-gen.md',name:'Demand Gen',zh:'Demand Gen',uses:['Demand Gen channel insight','Demand Gen Campaign insights'],stage:'analysis'},
 {id:'meta',file:'prompts/content-testing/meta.md',name:'Meta',zh:'Meta',uses:['Meta channel insight','Meta Campaign insights'],stage:'analysis'},
 {id:'reddit',file:'prompts/content-testing/reddit.md',name:'Reddit',zh:'Reddit',uses:['Reddit period insight','Reddit lifetime insight'],stage:'analysis'},
 {id:'edm',file:'prompts/content-testing/edm.md',name:'EDM',zh:'EDM',uses:['EDM channel insight','Email Campaign insights'],stage:'analysis'},
 {id:'social-media',file:'prompts/content-testing/social-media.md',name:'Social Media',zh:'Social Media',uses:['Social Media lifetime insight'],stage:'analysis'},
 {id:'manual',file:'prompts/content-testing/manual.md',name:'Display and naming rules',zh:'展示与命名规则',uses:['All Testing insight text','Creative names and citations'],stage:'presentation'},
 {id:'translation',file:'prompts/insights/content-testing-translation.md',name:'Chinese translation',zh:'中文翻译',uses:['Chinese translations of published insights'],stage:'translation'},
 {id:'ask-ai',file:'prompts/ask-ai/testing.md',name:'Ask AI',zh:'Ask AI',uses:['Testing Ask AI conversations'],stage:'conversation'},
] as const;
export type PromptId=typeof testingPromptCatalog[number]['id'];
export type PromptAuthor={sub:string;name:string;email:string};
export type PromptVersion={id:string;prompt_id:PromptId;revision:number;parent_id:string|null;content:string;previous_content:string;note:string;author:PromptAuthor;created_at:string};
export function currentPromptVersion(source:PromptVersion,saved?:PromptVersion){return saved&&new Date(saved.created_at).getTime()>=new Date(source.created_at).getTime()?saved:source;}
export type TrialResult={title:string;summary:string;sections:{title:string;markdown:string}[];campaigns:{id:string;summary:string;markdown:string}[];html:string|null;overview_sources?:Array<Omit<OverviewInsightSource,'content'>|{channel:string;kind:'unavailable';reason:string}>}&Partial<TrialVisualResult>;
export type PromptRun={id:string;mode:'analysis'|'readability';campaign:string;period:{start:string;end:string;channel?:string;prompt?:PromptId};language:'en'|'zh';status:'queued'|'running'|'completed'|'failed';stage:string;versions:Record<string,PromptVersion>;input_hash:string;baseline_id:string|null;result:TrialResult|null;error:string|null;created_at:string;updated_at:string;author:PromptAuthor};
export function promptId(value:unknown):PromptId{if(typeof value!=='string'||!testingPromptCatalog.some(p=>p.id===value))throw Error('Unknown prompt');return value as PromptId;}
export function validatePromptEdit(value:unknown){
 const body=value as Record<string,unknown>|null;if(!body||typeof body.content!=='string'||!body.content.trim()||body.content.length>150000||typeof body.note!=='string'||!body.note.trim()||body.note.length>400||typeof body.parent!=='string'||!/^[-a-z0-9]{1,80}$/.test(body.parent))throw Error('Provide prompt content, a change note and the original version.');
 return {id:promptId(body.id),content:body.content,note:body.note.trim(),parent:body.parent};
}
export function validatePromptRun(value:unknown){
 const body=value as Record<string,unknown>|null,validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 if(!body||!['analysis','readability'].includes(String(body.mode))||!validDate(body.start)||!validDate(body.end)||String(body.start)>String(body.end)||typeof body.campaign!=='string'||body.campaign.length>200||!['en','zh'].includes(String(body.language)))throw Error('Choose a valid Campaign, date range and language.');
 if((Date.parse(String(body.end))-Date.parse(String(body.start)))/86400000>365)throw Error('Choose a range of at most one year.');
 const selectedPrompt=promptId(body.prompt??'google-search');
 const channel=String(body.channel??(['master','manual','readability','translation','ask-ai'].includes(selectedPrompt)?'google-search':selectedPrompt));
 if(!['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media','overview'].includes(channel))throw Error('Choose a supported channel.');
 if((body.compareStart!=null||body.compareEnd!=null)&&(!validDate(body.compareStart)||!validDate(body.compareEnd)||String(body.compareStart)>String(body.compareEnd)))throw Error('Choose valid comparison dates.');
 const versions=body.versions as Record<string,unknown>;if(!versions||![...new Set(['master',channel,'manual','readability',selectedPrompt,...(channel==='overview'?['google-search','google-pmax','google-demand-gen','meta','reddit','edm']:[])])].every(key=>typeof versions[key]==='string'&&/^[-a-z0-9]{1,80}$/.test(versions[key] as string)))throw Error('Save and select the prompt versions first.');
 if(!['master','manual','readability','translation','ask-ai'].includes(selectedPrompt)&&channel!==selectedPrompt)throw Error('Prompt and channel must match.');
 if((body.mode==='readability'||selectedPrompt==='translation'||body.baseline)&&(typeof body.baseline!=='string'||!/^[-a-f0-9]{36}$/.test(body.baseline)))throw Error('Choose a completed analysis to restyle.');
 return {channel,prompt:selectedPrompt,mode:body.mode as 'analysis'|'readability',start:body.start as string,end:body.end as string,campaign:body.campaign,language:body.language as 'en'|'zh',versions:versions as Record<string,string>,comparison:validDate(body.compareStart)&&validDate(body.compareEnd)&&String(body.compareStart)<=String(body.compareEnd)?{start:body.compareStart as string,end:body.compareEnd as string}:null,baseline:typeof body.baseline==='string'&&body.baseline?body.baseline:null};
}
export function validateTrialResult(value:unknown,campaigns:string[]):TrialResult{
 const result=value as TrialResult;
 if(result?.report){validateTrialVisualResult(result as TrialResult&TrialVisualResult,campaigns);return result;}
 if(!result||typeof result.title!=='string'||!result.title.trim()||typeof result.summary!=='string'||!result.summary.trim()||!Array.isArray(result.sections)||!result.sections.length||!result.sections.every(s=>typeof s.title==='string'&&typeof s.markdown==='string'&&s.markdown.trim())||!Array.isArray(result.campaigns)||result.campaigns.length!==campaigns.length||new Set(result.campaigns.map(c=>c.id)).size!==campaigns.length||!result.campaigns.every(c=>campaigns.includes(c.id)&&typeof c.summary==='string'&&typeof c.markdown==='string')||!(result.html===null||typeof result.html==='string'))throw Error('The result does not cover the selected Campaigns.');
 if(result.html&&(result.html.length>250000||/<\s*(script|iframe|object|embed|form|base|meta|link)\b|\bon[a-z]+\s*=|javascript\s*:|@import|url\s*\(/i.test(result.html)))throw Error('Unsafe presentation output.');
 return result;
}
