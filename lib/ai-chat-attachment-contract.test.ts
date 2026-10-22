import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validAttachments} from './ai-chat-attachment-contract.ts';
test('both chat endpoints accept supported image, PDF and text attachments',()=>{
 assert.ok(validAttachments(undefined));
 assert.ok(validAttachments([{kind:'image',name:'shot.jpg',mime_type:'image/jpeg',data:'aGVsbG8='},{kind:'pdf',name:'brief.pdf',mime_type:'application/pdf',data:'JVBERg=='},{kind:'text',name:'data.csv',mime_type:'text/csv',text:'ad,spend\na,20'}]));
});
test('reject unsupported formats, mixed payload fields and malformed binary',()=>{
 for(const input of [[{kind:'image',name:'shot.svg',mime_type:'image/svg+xml',data:'aGVsbG8='}],[{kind:'image',name:'shot.jpg',mime_type:'image/jpeg',data:'not base64!'}],[{kind:'text',name:'x.txt',mime_type:'text/plain',text:'x',data:'eA=='}],[{kind:'pdf',name:'brief.pdf',mime_type:'text/plain',data:'JVBERg=='}]])assert.equal(validAttachments(input),false);
});
test('enforce per-file and aggregate limits using bytes for text',()=>{
 assert.equal(validAttachments([{kind:'text',name:'long.md',mime_type:'text/markdown',text:'中'.repeat(27000)}]),false);
 assert.equal(validAttachments([{kind:'image',name:'large.jpg',mime_type:'image/jpeg',data:'a'.repeat(600001)}]),false);
 assert.equal(validAttachments(Array.from({length:6},()=>({kind:'image',name:'image.jpg',mime_type:'image/jpeg',data:'a'.repeat(600000)}))),false);
});
