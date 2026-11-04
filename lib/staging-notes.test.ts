import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNote, listNotes, resolveNote, validateNote, stagingRequestAllowed } from './staging-notes.ts';
const user = { sub: 'google-1', name: 'Alice', email: 'alice@elle-media.com' };
const input = { page: '/bluevua/testing', text: ' Make this bigger ', anchor: { selector: '#title', x: .5, y: .3, context: 'Overview' } };
test('validates paths, text, coordinates and selectors', () => {
 assert.equal(validateNote(input).text, 'Make this bigger');
 for(const patch of [{page:'//evil.test'}, {page:'/x?secret=yes'}, {text:' '}, {text:'x'.repeat(2001)}, {anchor:{...input.anchor,x:NaN}}, {anchor:{...input.anchor,selector:'x'.repeat(1001)}}, {anchor:{...input.anchor,y:2}}]) assert.throws(()=>validateNote({...input,...patch}));
});
test('concurrent notes persist with trusted authors; resolution is shared and durable', async () => {
 const dir = await mkdtemp(join(tmpdir(),'staging-notes-'));
 try {
  const notes = await Promise.all(Array.from({length:12},()=>createNote(dir,{...input,author:{name:'Mallory'}},user)));
  assert.equal(new Set(notes.map(n=>n.id)).size,12);
  assert.equal((await listNotes(dir,input.page)).length,12);
  assert.equal((await listNotes(dir,'/other')).length,0);
  assert.deepEqual(notes[0].author,user);
  await resolveNote(dir,notes[0].id,true,user);
  assert.equal((await listNotes(dir,input.page)).find(n=>n.id===notes[0].id)?.resolvedBy?.sub,user.sub);
  await assert.rejects(resolveNote(dir,'../../secrets',true,user));
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('staging allows page reads and notes, denies generation and upstream mutations',()=>{
 for(const [method,path] of [['GET','/bluevua/testing'],['POST','/api/staging/notes'],['PATCH','/api/staging/notes'],['POST','/api/klaviyo/dashboard'],['POST','/api/auth/logout']]) assert.equal(stagingRequestAllowed(method,path),true);
 for(const [method,path] of [['POST','/api/klaviyo/ask'],['POST','/api/testing/data-refresh'],['GET','/api/klaviyo/insights/refresh'],['GET','/api/testing/data-refresh']]) assert.equal(stagingRequestAllowed(method,path),false);
});
