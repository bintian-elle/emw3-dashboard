import type {TextBlock} from './ai-dashboard-text.ts';
import {buildPageSummary,refreshTextSummaries} from './ai-dashboard-text.ts';
import type {Workspace} from './ai-dashboard-editor.ts';
export function updateTextPresentation(text:TextBlock,change:{title?:string;content?:string}):TextBlock{return{...text,...change,...change.content!==undefined&&change.content!==text.content?{autoSummary:false}:{}};}
/** Recover the old no-op-blur bug only when prose still exactly matches generated facts. */
export function repairGeneratedSummary(workspace:Workspace,previous:Workspace[]=[]):Workspace{const generated=[workspace,...previous].map(w=>buildPageSummary(w.report,w.hidden));const texts=workspace.texts?.map(text=>text.role==='summary'&&!text.autoSummary&&generated.includes(text.content)?{...text,autoSummary:true}:text);return{...workspace,texts:texts?refreshTextSummaries(workspace.report,texts,workspace.hidden):texts};}

export function createBlankReport(report:Workspace['report']):Workspace['report']{return{...report,title:'Untitled dashboard',summary:'Start building this dashboard with a question.',warnings:[],widgets:[]};}
