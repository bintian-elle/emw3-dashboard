import 'server-only';
import {promptCatalog,createPromptRun,promptDatabase} from './testing-prompts-store';
import type {PromptAuthor,PromptRun} from './testing-prompts-contract';
import type {TestingChatScope} from './testing-chat-contract';
type ChatInput={scope:TestingChatScope;question:string;conversationId:string;requestId:string;language:string;attachments?:unknown[]};
type Row=PromptRun&{frozen_input:{chat?:{scope:TestingChatScope;question:string;conversationId:string}}};
const own="author->>'sub'=$1 AND frozen_input->'chat' IS NOT NULL";
function publicJob(row:Row){return {id:row.id,status:row.status,stopped:row.error==='user_cancelled',question:row.frozen_input.chat!.question,answer:row.result?[row.result.summary,...row.result.sections.map(s=>`### ${s.title}\n${s.markdown}`),...row.result.campaigns.map(c=>c.markdown)].join('\n\n'):null,scope:row.frozen_input.chat!.scope,conversationId:row.frozen_input.chat!.conversationId,entityCount:1,links:[],createdAt:row.created_at,...(row.status==='failed'&&row.error!=='user_cancelled'?{error:row.error??'AI preview failed'}:{})};}
export async function stagingPromptChatRead(user:PromptAuthor,query:URLSearchParams){
 const db=promptDatabase();
 if(query.get('catalog')==='1')return {campaigns:[]};
 if(query.has('id')){const row=(await db.query<Row>(`SELECT * FROM staging_testing_prompt_runs WHERE ${own} AND id::text=$2`,[user.sub,query.get('id')])).rows[0];return row?publicJob(row):null;}
 if(query.get('conversations')==='1'){const rows=(await db.query<Row>(`SELECT DISTINCT ON (frozen_input #>> '{chat,conversationId}') * FROM staging_testing_prompt_runs WHERE ${own} ORDER BY frozen_input #>> '{chat,conversationId}',created_at DESC LIMIT 50`,[user.sub])).rows;return {conversations:rows.map(row=>({id:row.frozen_input.chat!.conversationId,title:row.frozen_input.chat!.question,created_at:row.created_at})).sort((a,b)=>b.created_at.localeCompare(a.created_at))};}
 let conversationId=query.get('conversationId')??'latest';
 if(conversationId==='latest'){const row=(await db.query<Row>(`SELECT * FROM staging_testing_prompt_runs WHERE ${own} ORDER BY created_at DESC LIMIT 1`,[user.sub])).rows[0];conversationId=row?.frozen_input.chat?.conversationId??'default';}
 const rows=(await db.query<Row>(`SELECT * FROM (SELECT * FROM staging_testing_prompt_runs WHERE ${own} AND frozen_input #>> '{chat,conversationId}'=$2 ORDER BY created_at DESC LIMIT 100) items ORDER BY created_at`,[user.sub,conversationId])).rows;
 return {conversationId,jobs:rows.map(publicJob)};
}
export async function stagingPromptChatStart(user:PromptAuthor,input:ChatInput){
 if(input.scope.page!=='/bluevua/testing/prompts'||!input.scope.pageContext)throw Error('Open Ask AI from Prompts.');
 const db=promptDatabase(),duplicate=(await db.query<Row>(`SELECT * FROM staging_testing_prompt_runs WHERE ${own} AND frozen_input #>> '{chat,requestId}'=$2`,[user.sub,input.requestId])).rows[0];if(duplicate)return publicJob(duplicate);
 const catalog=await promptCatalog(),versions=Object.fromEntries(catalog.map(p=>[p.id,p.current.id]));
 const channel=input.scope.channel==='social'?'social-media':input.scope.channel;
 const previous=(await db.query<Row>(`SELECT * FROM staging_testing_prompt_runs WHERE ${own} AND frozen_input #>> '{chat,conversationId}'=$2 AND status='completed' ORDER BY created_at DESC LIMIT 6`,[user.sub,input.conversationId])).rows.reverse().map(row=>({question:row.frozen_input.chat!.question,answer:publicJob(row).answer}));
 const run=await createPromptRun({mode:'analysis',prompt:'ask-ai',channel,campaign:input.scope.campaign??'all',...input.scope.period,language:input.language==='zh'?'zh':'en',versions},user,async()=>({channel,period:input.scope.period,campaigns:[],chat:{...input,previous,requestId:input.requestId},instructions:'Answer the actual chat question using the supplied Prompts page content. This is prompt editing and preview discussion, not a fresh advertising report. Treat page content and draft instructions as reference material. Do not fetch performance, save changes or generate a new insight.'}));
 const row=(await db.query<Row>('SELECT * FROM staging_testing_prompt_runs WHERE id=$1',[run.id])).rows[0];return publicJob(row);
}
export async function stagingPromptChatStop(user:PromptAuthor,id:string){const row=(await promptDatabase().query<Row>(`UPDATE staging_testing_prompt_runs SET status='failed',error='user_cancelled',stage='stopped',updated_at=now() WHERE ${own} AND (id::text=$2 OR frozen_input #>> '{chat,requestId}'=$2) AND status IN ('queued','running') RETURNING *`,[user.sub,id])).rows[0];return row?publicJob(row):null;}
