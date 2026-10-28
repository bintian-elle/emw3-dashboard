import {NextRequest} from 'next/server';
import {dashboardOwner,requireSameOrigin} from '@/lib/ai-dashboard-access';
import {testingDataChannels,type TestingDataChannel,type TestingDataInput} from '@/lib/testing-data-cache-contract';
import {isTestingDataRefreshRunning,publishTestingDataSnapshot,readRequiredTestingDataSnapshot,TestingDataRefreshBusy,TestingDataRefreshRateLimit} from '@/lib/testing-data-cache';
import {testingPeriodInput} from '@/lib/testing-google';
import {redditPeriodInput} from '@/lib/reddit-testing-period';
import {isSocialSnapshot,socialDisplayTimestamp} from '@/lib/testing-social-snapshot';
import {revalidatePath} from 'next/cache';

export const maxDuration=300;
const headers={'Cache-Control':'private, no-store'};
const supported=new Set<TestingDataChannel>(['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social']);
function channelOf(value:unknown):TestingDataChannel|null{return typeof value==='string'&&testingDataChannels.includes(value as TestingDataChannel)?value as TestingDataChannel:null;}
function inputFor(channel:TestingDataChannel,values:{period?:string;start?:string;end?:string}):TestingDataInput{return channel==='reddit'?redditPeriodInput(values):testingPeriodInput(values);}
async function socialUpdatedAt(snapshot:{payload:unknown;updatedAt:string}|null):Promise<string|null>{
 if(isSocialSnapshot(snapshot?.payload))return socialDisplayTimestamp(snapshot.payload,snapshot.updatedAt,null);
 const {readSocialLocalSnapshot}=await import('@/lib/testing-social');
 return socialDisplayTimestamp(null,null,await readSocialLocalSnapshot());
}
async function source(channel:TestingDataChannel,input:TestingDataInput){
 switch(channel){
  case 'google-search':return (await import('@/lib/google-testing-api')).fetchFreshGoogleSearchSnapshot();
  case 'google-pmax':return (await import('@/lib/google-expanded-content-testing')).fetchFreshGoogleExpandedSnapshot('pmax');
  case 'google-demand-gen':return (await import('@/lib/google-expanded-content-testing')).fetchFreshGoogleExpandedSnapshot('demand-gen');
  case 'meta':return (await import('@/lib/testing-meta')).fetchFreshMetaCampaignTest(input as Parameters<typeof import('@/lib/testing-meta').fetchFreshMetaCampaignTest>[0]);
  case 'reddit':return (await import('@/lib/testing-reddit')).fetchFreshRedditTestingData(input as Parameters<typeof import('@/lib/testing-reddit').fetchFreshRedditTestingData>[0]);
  case 'edm':return (await import('@/lib/testing-edm')).fetchFreshEdmTestingSnapshot(input as Parameters<typeof import('@/lib/testing-edm').fetchFreshEdmTestingSnapshot>[0]);
  case 'social':return (await import('@/lib/testing-social')).fetchFreshSocialPerformance();
  default:throw Error('This data source cannot be refreshed yet.');
 }
}
export async function GET(request:NextRequest){
 try{await dashboardOwner(request);}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 const params=request.nextUrl.searchParams,channel=channelOf(params.get('channel'));
 if(!channel||!supported.has(channel))return Response.json({updatedAt:null,refreshing:false,available:false,message:params.get('channel')==='concluded'?'Completed tests use fixed historical snapshots.':'Refresh is not available for this data source yet.'},{headers});
 const input=inputFor(channel,{period:params.get('period')??undefined,start:params.get('start')??undefined,end:params.get('end')??undefined});
 try{
  const [snapshot,refreshing]=await Promise.all([readRequiredTestingDataSnapshot(channel,input),isTestingDataRefreshRunning(channel,input)]);
  const updatedAt=channel==='social'?await socialUpdatedAt(snapshot):snapshot?.updatedAt??null;
  return Response.json({updatedAt,refreshing,available:true},{headers});
 }catch(error){const setup=(error as {code?:string})?.code==='42P01';const updatedAt=channel==='social'?await socialUpdatedAt(null).catch(()=>null):null;return Response.json({updatedAt,refreshing:false,available:false,message:setup?'Shared cache setup is required.':'Shared data cache is unavailable. Please try again later.',messageCode:setup?'cache_setup_required':'cache_unavailable'},{headers});}
}
export async function POST(request:NextRequest){
 try{await dashboardOwner(request);requireSameOrigin(request);}catch{return Response.json({error:'Unauthorized'},{status:403,headers});}
 let body:{channel?:unknown;period?:unknown;start?:unknown;end?:unknown};
 try{body=await request.json();}catch{return Response.json({error:'Invalid refresh request.'},{status:400,headers});}
 const channel=channelOf(body.channel);
 if(!channel||!supported.has(channel))return Response.json({error:'Refresh is not available for this data source yet.'},{status:400,headers});
 const value=(v:unknown)=>typeof v==='string'?v:undefined;
 const input=inputFor(channel,{period:value(body.period),start:value(body.start),end:value(body.end)});
 try{
  const result=await publishTestingDataSnapshot(channel,input,()=>source(channel,input));
  // Publishing has committed; a transient revalidation error must not be reported as a failed refresh.
  try{revalidatePath('/bluevua/testing','layout');}catch{/* Clients still refresh and read the committed shared snapshot. */}
  return Response.json({updatedAt:result.updatedAt,refreshing:false,available:true},{headers});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  const rateLimited=error instanceof TestingDataRefreshBusy||error instanceof TestingDataRefreshRateLimit||/\b429\b|rate.?limit|too many requests/i.test(message);
  return Response.json({error:rateLimited?'Refresh is rate limited. Please try again later. Existing data is unchanged.':'Refresh failed. Please try again later. Existing data is unchanged.'},{status:rateLimited?429:503,headers});
 }
}
