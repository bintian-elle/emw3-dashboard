import 'server-only';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {decodePromptPreviewReport,type PromptPreviewManifest,type PromptPreviewReport} from './testing-prompt-preview';

/** Local development previews are file-backed; check metadata without reading reports. */
export async function readLocalPromptPreviewVersion(language?:string):Promise<string|null>{
 if(process.env.NODE_ENV!=='development')return null;
 const root=path.join(process.cwd(),'.state/content-testing-preview');
 let pointer:{run_id?:unknown;language_runs?:Record<string,unknown>};
 try{pointer=JSON.parse(await readFile(path.join(root,'active.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw Error('Local preview selection is temporarily unavailable.');}
 const selected=language&&pointer.language_runs?pointer.language_runs[language]:pointer.run_id;
 if(typeof selected!=='string'||!/^[a-z0-9-]{1,64}$/.test(selected))throw Error('Invalid local preview selection.');
 const folder=path.join(root,selected),files=['manifest.json','state.json',...['google-search','google-pmax','google-demand-gen','meta','reddit','reddit-lifetime','edm','social-media','overview'].map(id=>`results/${id}.json`)];
 const stamps=await Promise.all(files.map(async file=>{try{const info=await stat(path.join(folder,file));return `${file}:${info.mtimeMs}:${info.size}`;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return `${file}:missing`;throw error;}}));
 return createHash('sha256').update(JSON.stringify([selected,language??'',stamps])).digest('hex');
}

export async function readLocalPromptPreview(language?:string):Promise<{manifest:PromptPreviewManifest;reports:PromptPreviewReport[];status:{current?:string;status?:string}}|null>{
 if(process.env.NODE_ENV!=='development')return null;
 const root=path.join(process.cwd(),'.state/content-testing-preview');
 let pointer:{run_id?:unknown;language_runs?:Record<string,unknown>};
 try{pointer=JSON.parse(await readFile(path.join(root,'active.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw Error('Local preview selection is temporarily unavailable.');}
 if(language&&pointer.language_runs){const selected=pointer.language_runs[language];if(typeof selected!=='string')throw Error('Requested local preview language is unavailable.');pointer={...pointer,run_id:selected};}
 if(typeof pointer.run_id!=='string'||!/^[a-z0-9-]{1,64}$/.test(pointer.run_id))throw Error('Invalid local preview selection.');
 const folder=path.join(root,pointer.run_id);
 try{
  const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8')) as PromptPreviewManifest;
  if(manifest.run_id!==pointer.run_id||!['zh-CN','en'].includes(manifest.language)||!manifest.period?.start||!manifest.period?.end)throw Error('Invalid local preview manifest.');
  const ids=['google-search','google-pmax','google-demand-gen','meta','reddit','reddit-lifetime','edm','social-media','overview'];
  const reports=(await Promise.all(ids.map(async id=>{try{return decodePromptPreviewReport(JSON.parse(await readFile(path.join(folder,'results',`${id}.json`),'utf8')),manifest.run_id,id);}catch{return null;}}))).filter((report):report is PromptPreviewReport=>report!==null);
  let status:{current?:string;status?:string}={status:manifest.status};
  try{status=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));}catch{/* Generation may not have started. */}
  return {manifest,reports,status:{current:status.current,status:status.status}};
 }catch{throw Error('Local preview files are temporarily unavailable; shared caches remain untouched.');}
}
