import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';

type Command={file:string;args:string[]};
const defaultCli='/home/ubuntu/.agents/skills/anc-ga4-data-readonly/scripts/anc-ga4';
const queryArgs=['reports','query','--account','ga4.bluevua','--input-file','-'];
const quote=(value:string)=>`'${value.replaceAll("'", "'\\''")}'`;
function sshCommand(host:string,command:string):Command{
 if(!/^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(host))throw Error('Invalid GA4_SSH_HOST configuration.');
 return {file:'ssh',args:['-o','BatchMode=yes','-o','ConnectTimeout=10','--',host,command]};
}
export function trackingCommand(cli:string,host?:string):Command{
 if(!cli.startsWith('/')||/[\x00-\x1f]/.test(cli))throw Error('GA4_CLI_PATH must be an absolute path.');
 return host?sshCommand(host,[cli,...queryArgs].map(quote).join(' ')):{file:cli,args:queryArgs};
}
export function trackingExportCommand(file:string,host?:string):Command|null{
 if(!/^\/home\/ubuntu\/work\/anc-data-tools\/\.local\/exports\/[A-Za-z0-9_.-]+\.jsonl?$/.test(file))throw Error('Unexpected report export location.');
 return host?sshCommand(host,`cat -- ${quote(file)}`):null;
}
async function execute(command:Command,input:string,timeout:number):Promise<{stdout:string;code:number|null}>{
 return new Promise((resolve,reject)=>{
  const child=spawn(command.file,command.args,{stdio:['pipe','pipe','pipe']});
  let stdout='',settled=false;
  const timer=setTimeout(()=>{child.kill('SIGTERM');fail(Error('GA4 query timed out. Please retry shortly.'));},timeout);
  function fail(error:Error){if(settled)return;settled=true;clearTimeout(timer);reject(error);}
  child.on('error',()=>fail(Error('The shared GA4 reporting connection could not be started.')));
  child.stdin.on('error',()=>fail(Error('The shared GA4 reporting connection closed before receiving the query.')));
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>8000000){child.kill('SIGTERM');fail(Error('GA4 response exceeded the transport limit.'));}});
  // Never expose SSH diagnostics or authentication information in a report.
  child.stderr.resume();
  child.on('close',code=>{if(settled)return;settled=true;clearTimeout(timer);resolve({stdout,code});});
  child.stdin.end(input);
 });
}
export async function websiteTrackingTransport(){
 const cli=process.env.GA4_CLI_PATH||defaultCli;
 let host:string|undefined;
 try{await access(cli,constants.X_OK);}catch{
  host=process.env.GA4_SSH_HOST?.trim();
  if(!host)throw Error('GA4 reporting is not configured on this host. Configure the existing AI Bluevua server connection with GA4_SSH_HOST; Google credentials remain on that server.');
 }
 const command=trackingCommand(cli,host);
 return {
  async query(input:Record<string,unknown>){
   const result=await execute(command,JSON.stringify(input),125000);
   if(result.code!==0&&result.code!==3)throw Error('The shared GA4 query failed. Check the server connection and read-only tool access.');
   let envelope;
   try{envelope=JSON.parse(result.stdout);}catch{throw Error('The shared GA4 tool returned an invalid response.');}
   if(!['ok','empty','partial'].includes(envelope.status))throw Error('GA4 returned an unavailable report.');
   return envelope;
  },
  async readExport(file:string){
   const command=trackingExportCommand(file,host);
   if(!command)return readFile(file,'utf8');
   const result=await execute(command,'',15000);
   if(result.code!==0)throw Error('The full GA4 report export could not be retrieved from its server.');
   return result.stdout;
  },
 };
}
