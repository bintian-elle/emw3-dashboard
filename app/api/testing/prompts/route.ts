import {currentSiteUser} from '@/lib/current-site-user';
import {authOrigin} from '@/lib/site-auth';
import {canAccessReviewTools,canWriteReviewTools,reviewExpectedOrigin} from '@/lib/review-access';
import {promptId} from '@/lib/testing-prompts-contract';
import {promptCatalog,promptVersion,promptHistory,promptDiff,savePrompt,readPromptRuns,createPromptRun} from '@/lib/testing-prompts-store';
import {capturePromptTrial,promptTrialOptions} from '@/lib/testing-prompts-input';
export const runtime='nodejs';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function access(request:Request,write=false){const user=await currentSiteUser();if(!user||!canAccessReviewTools(user))return null;const expected=reviewExpectedOrigin(request.url,authOrigin(request.url),process.env.LOCAL_PRODUCTION_PREVIEW==='1');if(write&&!canWriteReviewTools(user,request.headers.get('origin'),expected))return null;return user;}
export async function GET(request:Request){
 if(!await access(request))return reply({error:'Not available'},403);
 const params=new URL(request.url).searchParams;
 try{
  if(params.has('prompt')){const id=promptId(params.get('prompt'));if(params.has('version')){const version=await promptVersion(id,params.get('version')!);return reply({version,diff:await promptDiff(version)});}return reply({history:await promptHistory(id)});}
  if(params.has('run')){const id=params.get('run')!;if(!/^[a-f0-9-]{36}$/.test(id))return reply({error:'Invalid run'},400);return reply({run:(await readPromptRuns(id))[0]??null});}
  const [catalog,runs,options]=await Promise.all([promptCatalog(),readPromptRuns(),promptTrialOptions()]);return reply({catalog,runs,options});
 }catch(error){return reply({error:error instanceof Error?error.message:'Unable to load prompts'},503);}
}
export async function POST(request:Request){
 const user=await access(request,true);if(!user)return reply({error:'Not available'},403);
 const raw=await request.text();if(raw.length>170000)return reply({error:'Request too large'},413);
 try{const body=JSON.parse(raw);const author={sub:user.sub,name:user.name,email:user.email};if(body.action==='save')return reply({version:await savePrompt(body,author)},201);if(body.action==='run')return reply({run:await createPromptRun(body,author,capturePromptTrial)},202);return reply({error:'Unknown action'},400);}
 catch(error){const message=error instanceof Error?error.message:'Unable to save';return reply({error:message},message.startsWith('Conflict:')?409:400);}
}
