import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
export type NoteAuthor = { sub: string; name: string; email: string };
export type NoteAnchor = { selector: string; x: number; y: number; context: string };
export type PageNote = { id: string; page: string; text: string; anchor: NoteAnchor | null; author: NoteAuthor; createdAt: string; resolved: boolean; resolvedBy?: NoteAuthor };
export function validateNote(value: unknown): Pick<PageNote,'page'|'text'|'anchor'> {
 const body = value as Partial<PageNote> | null;
 if(!body || typeof body.page!=='string' || !/^\/(?!\/)/.test(body.page) || /[?#\\\x00-\x1f]/.test(body.page) || body.page.length>1000 || typeof body.text!=='string' || !body.text.trim() || body.text.trim().length>2000) throw Error('Invalid note');
 let anchor:NoteAnchor|null=null;
 if(body.anchor!=null){const a=body.anchor;if(typeof a.selector!=='string'||!a.selector||a.selector.length>1000||typeof a.context!=='string'||a.context.length>300||![a.x,a.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid anchor');anchor={selector:a.selector,x:a.x,y:a.y,context:a.context};}
 return {page:body.page,text:body.text.trim(),anchor};
}
export { stagingRequestAllowed } from './staging-policy.ts';
function trustedAuthor(user:NoteAuthor):NoteAuthor{return {sub:user.sub,name:user.name,email:user.email};}
export async function createNote(dir:string,body:unknown,user:NoteAuthor):Promise<PageNote>{
 const input=validateNote(body);
 const note:PageNote={...input,id:randomUUID(),author:trustedAuthor(user),createdAt:new Date().toISOString(),resolved:false};
 await mkdir(dir,{recursive:true,mode:0o700});
 const temporary=join(dir,`.${note.id}.tmp`);
 await writeFile(temporary,JSON.stringify(note),{flag:'wx',mode:0o600});
 await rename(temporary,join(dir,`${note.id}.json`));
 return note;
}
export async function listNotes(dir:string,page:string):Promise<PageNote[]>{
 const files=await readdir(dir).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
 const notes=await Promise.all(files.filter(f=>/^[0-9a-f-]{36}\.json$/.test(f)).map(async file=>JSON.parse(await readFile(join(dir,file),'utf8')) as PageNote));
 return notes.filter(note=>note.page===page).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function resolveNote(dir:string,id:string,resolved:boolean,user:NoteAuthor):Promise<PageNote>{
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid note ID');
 const path=join(dir,`${id}.json`),note=JSON.parse(await readFile(path,'utf8')) as PageNote;
 note.resolved=resolved;if(resolved)note.resolvedBy=trustedAuthor(user);else delete note.resolvedBy;
 const temporary=join(dir,`.${id}.${randomUUID()}.tmp`);
 try{await writeFile(temporary,JSON.stringify(note),{flag:'wx',mode:0o600});await rename(temporary,path);}finally{await unlink(temporary).catch(()=>{});}
 return note;
}
