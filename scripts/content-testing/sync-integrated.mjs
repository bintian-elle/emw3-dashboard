import {execFile} from 'node:child_process';import {promisify} from 'node:util';import fs from 'node:fs/promises';import path from 'node:path';
const exec=promisify(execFile),root=path.resolve(process.argv[2]),remote=process.argv[3]||'/tmp/content-testing-integrated-20261104',allowed=new Set(['google-search','google-pmax','google-demand-gen','meta','reddit','reddit-lifetime','edm','social-media','overview']);let previous='';
if(!/^\/tmp\/[a-zA-Z0-9_-]+$/.test(remote))throw Error('Invalid isolated remote root');
const presentation=process.argv.includes('--presentation'),stateFile=presentation?'presentation-state.json':'state.json',folder=presentation?'presentations':'results';await fs.mkdir(path.join(root,folder),{recursive:true});
for(;;){
 const {stdout}=await exec('ssh',['EMW3_ANC_AI',`cat ${remote}/${stateFile}`],{timeout:30000});const state=JSON.parse(stdout);await fs.writeFile(path.join(root,stateFile),JSON.stringify(state,null,2));
 for(const [id,record] of Object.entries(state.turns??{})){if(!allowed.has(id)||record.status!=='completed')continue;try{await fs.access(path.join(root,`${folder}/${id}.json`));continue;}catch{}await exec('scp',[`EMW3_ANC_AI:${remote}/${folder}/${id}.json`,path.join(root,`${folder}/${id}.json`)],{timeout:30000});console.log(JSON.stringify({saved:id}));}
 const status=JSON.stringify({status:state.status,current:state.current,completed:Object.values(state.turns??{}).filter(r=>r.status==='completed').length});if(status!==previous){console.log(status);previous=status;}
 if(state.status==='completed'){if(!presentation)await exec('scp',[`EMW3_ANC_AI:${remote}/inputs/overview.json`,path.join(root,'inputs/overview.json')],{timeout:30000});await exec('scp',[`EMW3_ANC_AI:${remote}/manifest.json`,path.join(root,'manifest.json')],{timeout:30000});break;}
 await new Promise(resolve=>setTimeout(resolve,20000));
}
