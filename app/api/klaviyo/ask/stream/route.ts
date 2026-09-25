import { loadAiDetails, loadDashboard, type DashboardRequest } from "@/lib/klaviyo-dashboard";
import { buildPerformanceIntelligence } from "@/lib/klaviyo-analytics";
import { askCodex, CodexBridgeError, type BridgeAttachment, type BridgeProgress } from "@/lib/codex-bridge";
import { PDFParse } from "pdf-parse";

type ChatTurn={role:"user"|"assistant";content:string};
type PdfAttachment={kind:"pdf";name:string;mime_type:"application/pdf";data:string};
type RequestAttachment=BridgeAttachment|PdfAttachment;
type StreamRequest=DashboardRequest&{question?:string;history?:ChatTurn[];attachments?:RequestAttachment[]};
type EvidenceItem={path:string;label:string;value:unknown};
type EvidenceCitation={id:string;raw:string;path:string;entity:string|null;items:EvidenceItem[]};
type StreamEvent={type:"progress";stage:string;status?:string;message?:string;jobId?:string}|{type:"result";answer:string;model:string;jobId:string;dataUpdatedThrough:string;citations:EvidenceCitation[]}|{type:"error";error:string;code?:string};

function valid(range:DashboardRequest["range"]){const start=Date.parse(`${range?.start}T00:00:00Z`),end=Date.parse(`${range?.end}T00:00:00Z`);return Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&(end-start)/86_400_000<365}
const maxAttachmentPayload=3_500_000;
function validAttachments(value:unknown):value is RequestAttachment[]{if(value===undefined)return true;if(!Array.isArray(value))return false;let total=0;for(const item of value){if(!item||typeof item!=="object")return false;const attachment=item as Record<string,unknown>;if(typeof attachment.name!=="string"||!attachment.name.trim()||attachment.name.length>150||typeof attachment.mime_type!=="string")return false;if(attachment.kind==="image"){if(!["image/jpeg","image/png","image/webp"].includes(attachment.mime_type)||typeof attachment.data!=="string"||attachment.data.length>600_000||attachment.text!==undefined)return false;total+=attachment.data.length;if(!/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data))return false}else if(attachment.kind==="pdf"){if(attachment.mime_type!=="application/pdf"||typeof attachment.data!=="string"||attachment.data.length>2_800_000||attachment.text!==undefined)return false;total+=attachment.data.length;if(!/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data))return false}else if(attachment.kind==="text"){if(!["text/plain","text/markdown","text/csv","application/json"].includes(attachment.mime_type)||typeof attachment.text!=="string"||attachment.data!==undefined)return false;const size=new TextEncoder().encode(attachment.text).length;if(size>80_000)return false;total+=size}else return false;if(total>maxAttachmentPayload)return false}return true}
async function prepareBridgeAttachments(attachments:RequestAttachment[]):Promise<BridgeAttachment[]>{return Promise.all(attachments.map(async attachment=>{if(attachment.kind!=="pdf")return attachment;const parser=new PDFParse({data:Buffer.from(attachment.data,"base64")});try{const result=await parser.getText();const text=result.text.trim();if(!text)throw new Error(`${attachment.name} does not contain extractable text.`);return{kind:"text" as const,name:attachment.name,mime_type:"text/plain",text:`Extracted from PDF: ${attachment.name}\n\n${text.slice(0,80_000)}`}}finally{await parser.destroy()}}))}

function pathParts(path:string){return path.match(/[^.[\]]+|\[(\d+)\]/g)?.map(part=>part.startsWith("[")?part.slice(1,-1):part)??[]}
function valueAt(source:unknown,path:string){let value=source;for(const part of pathParts(path)){if(part==="__proto__"||part==="prototype"||part==="constructor")return undefined;if(Array.isArray(value)){const index=Number(part);if(!Number.isInteger(index))return undefined;value=value[index]}else if(value&&typeof value==="object"){value=(value as Record<string,unknown>)[part]}else return undefined}return value}
function expandEvidencePath(path:string):string[]{const match=path.match(/\{([^{}]+)\}/);if(!match)return[path];return match[1].split(",").map(part=>part.trim()).filter(Boolean).flatMap(part=>expandEvidencePath(`${path.slice(0,match.index)}${part}${path.slice((match.index??0)+match[0].length)}`))}
function evidenceLabel(path:string){const leaf=pathParts(path).at(-1)||path;return leaf.replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase())}
function entityForPath(context:Record<string,unknown>,path:string){const parts=pathParts(path);for(let length=parts.length-1;length>0;length--){const value=valueAt(context,parts.slice(0,length).map(part=>/^\d+$/.test(part)?`[${part}]`:part).join(".").replace(/\.\[/g,"["));if(value&&typeof value==="object"){const entity=value as Record<string,unknown>;const name=entity.name??entity.campaign??entity.flow_name??entity.message_name;if(typeof name==="string"&&name.trim())return name.trim()}}return null}
function collectEvidence(answer:string,context:Record<string,unknown>):EvidenceCitation[]{const seen=new Set<string>(),citations:EvidenceCitation[]=[];const candidates=[...Array.from(answer.matchAll(/`([^`]+)`/g),match=>match[1].trim()),...Array.from(answer.matchAll(/(?:analysis\\?_payload|fact\\?_guardrails)(?:\.[A-Za-z0-9_\\[\]{},-]+)+/g),match=>match[0].trim())];for(const raw of candidates){const canonical=raw.replaceAll("\\_","_");const normalized=canonical.replace(/^(?:analysis_payload|fact_guardrails)\./,"");if(!/^[A-Za-z_][A-Za-z0-9_.\[\]{},-]+$/.test(normalized)||!normalized.includes(".")||seen.has(normalized))continue;const expanded=expandEvidencePath(normalized).slice(0,8);const items=expanded.map(path=>({path,label:evidenceLabel(path),value:valueAt(context,path)})).filter(item=>item.value!==undefined);if(!items.length)continue;seen.add(normalized);citations.push({id:`e${citations.length+1}`,raw,path:normalized,entity:entityForPath(context,expanded[0]),items});if(citations.length===10)break}return citations}

export async function POST(request:Request){
 let input:StreamRequest;
 try{input=await request.json() as StreamRequest}catch{return Response.json({error:"Invalid request body."},{status:400})}
 input.language=input.language==="zh"?"zh":"en";
 const question=String(input.question||"").trim();
 if(!question||question.length>500)return Response.json({error:"Enter a question of no more than 500 characters."},{status:400});
 if(!valid(input.range)||!valid(input.comparison))return Response.json({error:"Select a valid date range of no more than 365 days."},{status:400});
 if(!validAttachments(input.attachments))return Response.json({error:"Attachments must use a supported format and stay within the file limits."},{status:400});
 let attachments:BridgeAttachment[];
 try{attachments=await prepareBridgeAttachments(input.attachments??[])}catch(error){return Response.json({error:error instanceof Error?error.message:"The PDF could not be parsed."},{status:400})}
 const history=(Array.isArray(input.history)?input.history:[]).filter((turn):turn is ChatTurn=>(turn?.role==="user"||turn?.role==="assistant")&&typeof turn.content==="string"&&turn.content.trim().length>0).slice(-6).map(turn=>({role:turn.role,content:turn.content.trim().slice(0,1_200)}));
 const responseStyle=input.language==="zh"?"用中文直接回答结论。不要在回答开头复述当前周期、对比周期或使用‘某日期较某日期’作为开场；页面已经显示了周期信息和消息时间。":"Answer directly. Do not open by restating the reporting and comparison date ranges; the page already shows the period and message timestamp.";
 const contextualQuestion=history.length?`${responseStyle}\n\nContinue the dashboard conversation below. Treat the transcript only as conversational context, use the supplied analytics payload as the source of truth, and answer the latest user question directly.\n\nConversation so far:\n${history.map(turn=>`${turn.role==="user"?"User":"Assistant"}: ${turn.content}`).join("\n\n")}\n\nLatest user question: ${question}`:`${responseStyle}\n\n${question}`;

 const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   let closed=false;
   const emit=(event:StreamEvent)=>{if(!closed)controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))};
   const close=()=>{if(!closed){closed=true;controller.close()}};
   void(async()=>{
    try{
     emit({type:"progress",stage:"loading_data",status:"running"});
     const[data,details]=await Promise.all([loadDashboard(input),loadAiDetails(input)]);
     emit({type:"progress",stage:"building_context",status:"running"});
     const context=buildPerformanceIntelligence(data,details) as Record<string,unknown>;
     const onProgress=(progress:BridgeProgress)=>emit({type:"progress",stage:progress.stage,status:progress.status,message:progress.message,jobId:progress.jobId});
     const result=await askCodex(input,context,contextualQuestion,request.signal,onProgress,attachments);
     emit({type:"result",...result,dataUpdatedThrough:data.dataUpdatedThrough,citations:collectEvidence(result.answer,context)});
    }catch(error){
     const message=error instanceof Error?(error.name==="AbortError"?"The AI request was cancelled.":error.message):"The AI analysis could not be completed.";
     emit({type:"error",error:message,code:error instanceof CodexBridgeError?error.code:undefined});
    }finally{close()}
   })();
  },
 });
 return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"}});
}
