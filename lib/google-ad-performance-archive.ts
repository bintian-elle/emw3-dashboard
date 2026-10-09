import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {creativeArchiveDirectory} from "@/lib/google-creative-archive";
import type {GoogleAdPerformanceArchive} from "@/lib/google-ad-performance";
export async function readGoogleAdPerformanceArchive():Promise<GoogleAdPerformanceArchive|null>{
 try{const archive=JSON.parse(await readFile(path.join(creativeArchiveDirectory(),"ad-performance.json"),"utf8"));if(archive.version!==1||!Array.isArray(archive.days))throw Error("Invalid ad performance archive");return archive;}
 catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
}
