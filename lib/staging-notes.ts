import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rename, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';
export type NoteAuthor = { sub: string; name: string; email: string };
export type NoteAnchor = { selector: string; x: number; y: number; context: string };
export type PageNote = { id: string; page: string; text: string; anchor: NoteAnchor | null; author: NoteAuthor; createdAt: string; resolved: boolean; resolvedBy?: NoteAuthor; capture?:{width:number;height:number};canDelete?:boolean };
export function validateNote(value: unknown): Pick<PageNote,'page'|'text'|'anchor'>&{captureDataUrl?:string} {
 const body = value as (Partial<PageNote>&{captureDataUrl?:unknown}) | null;
 if(!body || typeof body.page!=='string' || !/^\/(?!\/)/.test(body.page) || /[?#\\\x00-\x1f]/.test(body.page) || body.page.length>1000 || typeof body.text!=='string' || !body.text.trim() || body.text.trim().length>2000) throw Error('Invalid note');
 let anchor:NoteAnchor|null=null;
 if(body.anchor!=null){const a=body.anchor;if(typeof a.selector!=='string'||!a.selector||a.selector.length>1000||typeof a.context!=='string'||a.context.length>300||![a.x,a.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid anchor');anchor={selector:a.selector,x:a.x,y:a.y,context:a.context};}
 const captureDataUrl=body.captureDataUrl;
 if(captureDataUrl!==undefined&&(typeof captureDataUrl!=='string'||captureDataUrl.length>1500000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(captureDataUrl)))throw Error('Invalid screenshot');
 return {page:body.page,text:body.text.trim(),anchor,...(typeof captureDataUrl==='string'?{captureDataUrl}:{})};
}
export { stagingRequestAllowed } from './staging-policy.ts';
function trustedAuthor(user:NoteAuthor):NoteAuthor{return {sub:user.sub,name:user.name,email:user.email};}
export async function createNote(dir:string,body:unknown,user:NoteAuthor):Promise<PageNote>{
 const {captureDataUrl,...input}=validateNote(body);
 const image=captureDataUrl?await normalizeCapture(captureDataUrl):null;
 const note:PageNote={...input,id:randomUUID(),author:trustedAuthor(user),createdAt:new Date().toISOString(),resolved:false,...(image?{capture:{width:image.width,height:image.height}}:{})};
 await mkdir(dir,{recursive:true,mode:0o700});
 const temporary=join(dir,`.${note.id}.tmp`);
 try{
  if(image)await writeFile(join(dir,`${note.id}.webp`),image.buffer,{flag:'wx',mode:0o600});
  await writeFile(temporary,JSON.stringify(note),{flag:'wx',mode:0o600});
  await rename(temporary,join(dir,`${note.id}.json`));
 }catch(error){await unlink(join(dir,`${note.id}.webp`)).catch(()=>{});throw error;}finally{await unlink(temporary).catch(()=>{});}
 return note;
}
export async function listNotes(dir:string,page?:string):Promise<PageNote[]>{
 const files=await readdir(dir).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
 const notes=await Promise.all(files.filter(f=>/^[0-9a-f-]{36}\.json$/.test(f)).map(async file=>{try{const note=JSON.parse(await readFile(join(dir,file),'utf8')) as PageNote;return await isDeleted(dir,note.id)?null:note;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}));
 return notes.filter((note):note is PageNote=>note!==null&&(page===undefined||note.page===page)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function resolveNote(dir:string,id:string,resolved:boolean,user:NoteAuthor):Promise<PageNote>{
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid note ID');
 const path=join(dir,`${id}.json`),note=JSON.parse(await readFile(path,'utf8')) as PageNote;
 if(await isDeleted(dir,id))throw notFound();
 note.resolved=resolved;if(resolved)note.resolvedBy=trustedAuthor(user);else delete note.resolvedBy;
 const temporary=join(dir,`.${id}.${randomUUID()}.tmp`);
 try{await writeFile(temporary,JSON.stringify(note),{flag:'wx',mode:0o600});await rename(temporary,path);if(await isDeleted(dir,id)){await unlink(path).catch(()=>{});throw notFound();}}finally{await unlink(temporary).catch(()=>{});}
 return note;
}

async function normalizeCapture(dataUrl:string){
 const bytes=Buffer.from(dataUrl.slice(dataUrl.indexOf(',')+1),'base64');
 if(bytes.length>1100000)throw Error('Screenshot is too large');
 const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,isWebp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!isPng&&!isJpeg&&!isWebp)throw Error('Invalid screenshot format');
 const image=sharp(bytes,{limitInputPixels:4000000,animated:false});const metadata=await image.metadata();
 if(!['png','jpeg','webp'].includes(metadata.format||'')||(metadata.pages??1)>1)throw Error('Unsupported screenshot');
 const {data,info}=await image.rotate().resize({width:1280,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});
 if(data.length>750000)throw Error('Screenshot is too large');
 return {buffer:data,width:info.width,height:info.height};
}
function noteId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))throw Error('Invalid note ID');return id;}
function notFound(){return Object.assign(Error('Note not found'),{code:'ENOENT'});}
async function isDeleted(dir:string,id:string){try{await access(join(dir,'.deleted',`${id}.json`));return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}}
export function canDeleteNote(note:PageNote,user:NoteAuthor){return note.author.sub===user.sub||(process.env.STAGING_ADMIN_EMAILS||'bintian.feng@elle-media.com').split(',').some(email=>email.trim().toLowerCase()===user.email.toLowerCase());}
export async function readNoteImage(dir:string,id:string){
 noteId(id);if(await isDeleted(dir,id))throw notFound();
 const note=JSON.parse(await readFile(join(dir,`${noteId(id)}.json`),'utf8')) as PageNote;
 if(!note.capture)throw Error('No screenshot');return readFile(join(dir,`${id}.webp`));
}
export async function deleteNote(dir:string,id:string,user:NoteAuthor){
 const path=join(dir,`${noteId(id)}.json`),note=JSON.parse(await readFile(path,'utf8')) as PageNote;
 if(!canDeleteNote(note,user))throw Error('No permission to delete this note');
 if(await isDeleted(dir,id))throw notFound();
 const archive=join(dir,'.deleted');await mkdir(archive,{recursive:true,mode:0o700});
 await rename(path,join(archive,`${id}.json`));
 // Image reads require the active JSON record, so an archived note is immediately inaccessible.
 if(note.capture)await rename(join(dir,`${id}.webp`),join(archive,`${id}.webp`)).catch(()=>{});
}
