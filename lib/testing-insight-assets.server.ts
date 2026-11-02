import 'server-only';
import {cache} from 'react';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {getSocialPerformance} from './testing-social';
import {readGoogleCreativeArchive,creativeArchiveDirectory} from './google-creative-archive';
import {readGoogleExpandedSharedSnapshot} from './google-expanded-content-testing';
import {readGoogleSearchSharedSnapshot} from './google-testing-api';
import {readLatestTestingDataSnapshot} from './testing-data-cache';
import {buildInsightAssets} from './testing-insight-assets';
async function localExpanded(channel:string){try{return JSON.parse(await readFile(path.join(creativeArchiveDirectory(),`${channel}-content-testing.json`),'utf8'));}catch{return null;}}
/** Published snapshots only: rendering an insight must never call an ad platform. */
export const readInsightAssets=cache(async()=>{
 const sources=await Promise.allSettled([
  readGoogleSearchSharedSnapshot().then<unknown>(value=>value??readGoogleCreativeArchive()),readGoogleExpandedSharedSnapshot('pmax').then(value=>value??localExpanded('pmax')),readGoogleExpandedSharedSnapshot('demand-gen').then(value=>value??localExpanded('demand-gen')),
  ...(['meta','reddit'] as const).map(channel=>readLatestTestingDataSnapshot(channel).then(value=>value?.payload)),getSocialPerformance(),
 ]);
 const channels=['google-search','google-pmax','google-demand-gen','meta','reddit','social'];
 return sources.flatMap((result,index)=>result.status==='fulfilled'?buildInsightAssets(channels[index],result.value):[]);
});
