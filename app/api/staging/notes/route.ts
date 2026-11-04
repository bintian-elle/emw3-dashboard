import { currentSiteUser } from '@/lib/current-site-user';
import { authOrigin } from '@/lib/site-auth';
import { createNote, listNotes, resolveNote, validateNote, canDeleteNote, deleteNote } from '@/lib/staging-notes';
import { readStagingReleaseStatus } from '@/lib/staging-release';
import { join } from 'node:path';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
async function access(request:Request,mutation=false){
 if(process.env.DEPLOYMENT_ENV!=='staging')return reply({error:'Not found'},404);
 if(!await currentSiteUser())return reply({error:'Unauthorized'},401);
 if(mutation&&request.headers.get('origin')!==authOrigin(request.url))return reply({error:'Invalid origin'},403);
 return null;
}
const directory=()=>process.env.STAGING_NOTES_DIR||join(process.cwd(),'.state','staging-notes');
export async function GET(request:Request){
 const denied=await access(request);if(denied)return denied;
 const page=new URL(request.url).searchParams.get('page')||'/';
 try{validateNote({page,text:'validation'});}catch{return reply({error:'Invalid page'},400);}
 try{const [notes,release]=await Promise.all([listNotes(directory(),new URL(request.url).searchParams.get('scope')==='all'?undefined:page),readStagingReleaseStatus(process.env.STAGING_RELEASE_STATUS_FILE||join(process.cwd(),'.state','staging-release.json'))]);const user=(await currentSiteUser())!;return reply({notes:notes.map(note=>({...note,canDelete:canDeleteNote(note,user)})),release});}catch{return reply({error:'Unable to load notes'},503);}
}
export async function POST(request:Request){
 const denied=await access(request,true);if(denied)return denied;
 const raw=await request.text();if(raw.length>1508000)return reply({error:'Note too large'},413);
 let body;try{body=validateNote(JSON.parse(raw));}catch{return reply({error:'Invalid note (maximum 2,000 characters)'},400);}
 try{const user=(await currentSiteUser())!,note=await createNote(directory(),body,user);return reply({note:{...note,canDelete:canDeleteNote(note,user)}},201);}catch{return reply({error:'Unable to save note'},503);}
}
export async function PATCH(request:Request){
 const denied=await access(request,true);if(denied)return denied;
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=='string'||!/^[0-9a-f-]{36}$/.test(body.id)||typeof body.resolved!=='boolean')return reply({error:'Invalid update'},400);
 try{const user=(await currentSiteUser())!,note=await resolveNote(directory(),body.id,body.resolved,user);return reply({note:{...note,canDelete:canDeleteNote(note,user)}});}catch(error){return reply({error:'Unable to update note'},(error as NodeJS.ErrnoException).code==='ENOENT'?404:503);}
}

export async function DELETE(request:Request){
 const denied=await access(request,true);if(denied)return denied;
 const body=await request.json().catch(()=>null);if(typeof body?.id!=='string')return reply({error:'Invalid note'},400);
 try{await deleteNote(directory(),body.id,(await currentSiteUser())!);return reply({deleted:true});}
 catch(error){const message=(error as Error).message;return reply({error:'Unable to delete note'},message.includes('permission')?403:(error as NodeJS.ErrnoException).code==='ENOENT'?404:message==='Invalid note ID'?400:503);}
}
