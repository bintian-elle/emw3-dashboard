import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {currentSiteUser} from '@/lib/current-site-user';
import {canAccessReviewTools} from '@/lib/review-access';
import {readLocalPromptJobs} from '@/lib/testing-prompts-local-runs';
import {promptDatabase} from '@/lib/testing-prompts-store';
import type {PresentationMedia} from '@/lib/testing-insight-presentation';
export async function GET(_request:Request,{params}:{params:Promise<{run:string;key:string}>}){
 const user=await currentSiteUser();if(!canAccessReviewTools(user))return new Response(null,{status:403});
 const {run,key}=await params;if(!/^[a-f0-9-]{36}$/.test(run)||!/^[-a-zA-Z0-9]{1,100}$/.test(key))return new Response(null,{status:404});
 const local=(await readLocalPromptJobs()).find(job=>job.id===run);const row=local??(await promptDatabase().query('SELECT frozen_input FROM staging_testing_prompt_runs WHERE id=$1',[run])).rows[0];
 const media=(row?.frozen_input?.media_index??[]) as PresentationMedia[],entry=media.find(item=>item.key===key);if(!entry||!/^[-\w]+\.webp$/.test(entry.file))return new Response(null,{status:404});
 try{const directory=local?local.local_directory:process.env.REVIEW_PROMPTS_RUN_DIR??process.env.STAGING_PROMPTS_RUN_DIR??path.join(process.cwd(),'.state/prompt-runs');return new Response(await readFile(path.join(directory,run,'media',entry.file)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return new Response(null,{status:404});throw error;}
}
