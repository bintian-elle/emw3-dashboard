import {localProductionReportRun,readStoredMedia} from '@/lib/testing-report-store.server';
import {integratedReportDirectory} from '@/lib/testing-integrated-reports.server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {currentSiteUser} from '@/lib/current-site-user';
import {localPresentationDirectory} from '@/lib/testing-insight-presentation.server';
import type {PresentationMedia} from '@/lib/testing-insight-presentation';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
 if(!await currentSiteUser())return new Response(null,{status:401});
 const {key}=await params;if(!/^[a-zA-Z0-9-]{1,100}$/.test(key))return new Response(null,{status:404});
 const run=localProductionReportRun();if(run){const media=await readStoredMedia(run,key);return media?new Response(new Uint8Array(media.body),{headers:{'Content-Type':media.mime_type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404});}
 const root=await integratedReportDirectory()||localPresentationDirectory();if(!root)return new Response(null,{status:404});
 const media=JSON.parse(await readFile(path.join(root,'media-index.json'),'utf8')) as PresentationMedia[];
 const entry=media.find(item=>item.key===key);if(!entry||!/^[-\w]+\.webp$/.test(entry.file))return new Response(null,{status:404});
 return new Response(await readFile(path.join(root,'media',entry.file)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
}
