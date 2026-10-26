import {spawn} from 'node:child_process';
import {open} from 'node:fs/promises';

/** Kernel-held advisory locks recover automatically when the owning process exits. */
export async function acquireTrackingLease(file:string):Promise<{isHeld:()=>boolean;release:()=>Promise<void>}|null>{
 const handle=await open(file,'a',0o600);await handle.close();
 const marker='TRACKING_CACHE_LOCK_READY';
 const script=`printf '%s' '${marker}'; cat > /dev/null`;
 const command=process.platform==='darwin'?'/usr/bin/lockf':'/usr/bin/flock';
 const args=process.platform==='darwin'?['-k','-t','0',file,'/bin/sh','-c',script]:['-n',file,'/bin/sh','-c',script];
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['pipe','pipe','pipe']});
  let ready=false,settled=false,held=false,output='';
  let exited!:()=>void;
  const closed=new Promise<void>(finish=>exited=finish);
  const timer=setTimeout(()=>{child.kill('SIGTERM');if(!settled){settled=true;reject(Error('Tracking cache lock could not be acquired.'));}},10000);
  child.stdin.on('error',()=>{});
  child.stderr.resume();
  child.on('error',()=>{clearTimeout(timer);if(!settled){settled=true;reject(Error('Tracking cache lock utility is unavailable.'));}});
  child.on('close',code=>{
   held=false;clearTimeout(timer);exited();
   if(!settled){settled=true;if(code===1||code===75)resolve(null);else reject(Error('Tracking cache lock could not be acquired.'));}
  });
  child.stdout.on('data',chunk=>{
   output+=String(chunk);
   if(!ready&&output.includes(marker)){
    ready=true;held=true;settled=true;clearTimeout(timer);
    resolve({isHeld:()=>held,release:async()=>{child.stdin.end();await closed;}});
   }
  });
 });
}
