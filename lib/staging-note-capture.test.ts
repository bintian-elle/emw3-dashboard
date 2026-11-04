import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNote,listNotes,deleteNote,readNoteImage,canDeleteNote} from './staging-notes.ts';
const author={sub:'capture-author',name:'Author',email:'author@elle-media.com'},other={sub:'another',name:'Other',email:'other@elle-media.com'},admin={sub:'admin',name:'Bintian',email:'bintian.feng@elle-media.com'};
test('screenshots are normalized, shared as metadata, and archived with authorized deletion',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'note-capture-'));
 try{
  const png=await sharp({create:{width:120,height:80,channels:3,background:'#ffe000'}}).png().toBuffer();
  const note=await createNote(dir,{page:'/',text:'Check this area',captureDataUrl:'data:image/png;base64,'+png.toString('base64')},author);
  assert.deepEqual(note.capture,{width:120,height:80});assert.equal(JSON.stringify(note).includes('base64'),false);
  assert.equal((await sharp(await readNoteImage(dir,note.id)).metadata()).format,'webp');
  assert.equal(canDeleteNote(note,author),true);assert.equal(canDeleteNote(note,admin),true);assert.equal(canDeleteNote(note,other),false);
  await assert.rejects(deleteNote(dir,note.id,other),/permission/i);assert.equal((await listNotes(dir,'/')).length,1);
  await deleteNote(dir,note.id,author);assert.equal((await listNotes(dir,'/')).length,0);await assert.rejects(readNoteImage(dir,note.id));
  const second=await createNote(dir,{page:'/',text:'Admin can delete'},author);await deleteNote(dir,second.id,admin);assert.equal((await listNotes(dir,'/')).length,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects unsupported, oversized and fake screenshot payloads before publishing notes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'note-invalid-image-'));
 try{
  for(const captureDataUrl of ['data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,notAnImage','data:image/png;base64,'+'a'.repeat(1500001)])await assert.rejects(createNote(dir,{page:'/',text:'Invalid capture',captureDataUrl},author));
  assert.deepEqual(await listNotes(dir,'/'),[]);
  await assert.rejects(readNoteImage(dir,'../../private'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('deletion stays authoritative when read-state changes happen concurrently',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'note-delete-race-'));
 try{
  for(let attempt=0;attempt<8;attempt++){
   const note=await createNote(dir,{page:'/',text:'Concurrent deletion'},author);
   const {resolveNote}=await import('./staging-notes.ts');
   await Promise.allSettled([resolveNote(dir,note.id,true,other),deleteNote(dir,note.id,author)]);
   assert.equal((await listNotes(dir)).some(item=>item.id===note.id),false);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
