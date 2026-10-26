import test from 'node:test';
import assert from 'node:assert/strict';
import { trackingCommand, trackingExportCommand } from './website-tracking-transport.ts';
const cli='/home/ubuntu/.agents/skills/anc-ga4-data-readonly/scripts/anc-ga4';
test('a local CLI keeps the account fixed without SSH',()=>{
 assert.deepEqual(trackingCommand(cli),{file:cli,args:['reports','query','--account','ga4.bluevua','--input-file','-']});
});
test('remote queries use the configured host and pass JSON through stdin',()=>{
 const cmd=trackingCommand(cli,'EMW3_ANC_AI');
 assert.equal(cmd.file,'ssh');assert.ok(cmd.args.includes('BatchMode=yes'));
 assert.ok(cmd.args.includes('EMW3_ANC_AI'));
 assert.match(cmd.args.at(-1)!, /'--account' 'ga4.bluevua'/);
 assert.ok(!cmd.args.join(' ').includes('refresh_token'));
});
test('remote report exports are read on the same host, with paths constrained',()=>{
 const file='/home/ubuntu/work/anc-data-tools/.local/exports/rows-123.jsonl';
 assert.equal(trackingExportCommand(file,'EMW3_ANC_AI')?.file,'ssh');
 assert.match(trackingExportCommand(file,'EMW3_ANC_AI')!.args.at(-1)!, /cat -- '/);
 for(const value of ['/etc/passwd',file+';id','/home/ubuntu/work/anc-data-tools/.local/exports/../secrets/a.jsonl'])assert.throws(()=>trackingExportCommand(value,'EMW3_ANC_AI'));
});
test('SSH target cannot become an option or shell command',()=>{
 for(const host of ['-oProxyCommand=id','host;id','host name'])assert.throws(()=>trackingCommand(cli,host));
});
test('a failed report with property metadata cannot be displayed as zero activity',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {websiteTrackingTransport}=await import('./website-tracking-transport.ts');
 const directory=await mkdtemp(join(tmpdir(),'tracking-transport-'));
 const file=join(directory,'ga4');
 const previous=process.env.GA4_CLI_PATH;
 try{
  await writeFile(file,'#!/bin/sh\nprintf \'%s\' \'{"status":"error","resource_id":"451107071"}\'\n',{mode:0o700});
  process.env.GA4_CLI_PATH=file;
  const transport=await websiteTrackingTransport();
  await assert.rejects(transport.query({}),/unavailable/);
 }finally{if(previous===undefined)delete process.env.GA4_CLI_PATH;else process.env.GA4_CLI_PATH=previous;await rm(directory,{recursive:true,force:true});}
});
