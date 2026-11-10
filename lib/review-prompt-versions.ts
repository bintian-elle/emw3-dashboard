import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

type Version={id:string;prompt_id:string;revision:number};
export async function readReviewPromptVersions<T extends Version=Version>(directory:string):Promise<T[]>{
 let names:string[];try{names=await readdir(directory);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 return Promise.all(names.filter(name=>/^[a-z0-9-]+-\d+\.json$/.test(name)).map(async name=>JSON.parse(await readFile(join(directory,name),'utf8')) as T));
}
export async function writeReviewPromptVersion<T extends Version>(directory:string,version:T){
 if(!/^[a-z0-9-]+$/.test(version.prompt_id)||!Number.isSafeInteger(version.revision)||version.revision<1)throw Error('Invalid version');
 await mkdir(directory,{recursive:true,mode:0o700});
 try{await writeFile(join(directory,`${version.prompt_id}-${version.revision}.json`),JSON.stringify(version),{flag:'wx',mode:0o600});}
 catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw Error('Conflict: another user saved a newer version. Reload before saving.');throw error;}
 return version;
}
