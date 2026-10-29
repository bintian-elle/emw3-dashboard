import {NextRequest} from 'next/server';
import {dashboardOwner} from '@/lib/ai-dashboard-access';
import {readTestingSnapshotVersions} from '@/lib/testing-data-cache';
import {testingPeriodInput} from '@/lib/testing-google';
import {redditPeriodInput} from '@/lib/reddit-testing-period';
import {testingSnapshotScopes,testingSnapshotViews,type TestingSnapshotView} from '@/lib/testing-snapshot-watch';

const headers={'Cache-Control':'private, no-store'};

/** Read only shared-cache versions; never refresh a channel or return its payload. */
export async function GET(request:NextRequest){
 try{await dashboardOwner(request);}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 const params=request.nextUrl.searchParams,view=params.get('view');
 if(!view||!testingSnapshotViews.includes(view as TestingSnapshotView))return Response.json({error:'Invalid view'},{status:400,headers});
 const values={period:params.get('period')??undefined,start:params.get('start')??undefined,end:params.get('end')??undefined};
 const input=view==='reddit'?redditPeriodInput(values):testingPeriodInput(values);
 try{
  const versions=await readTestingSnapshotVersions(testingSnapshotScopes(view as TestingSnapshotView,input));
  return Response.json({versions},{headers});
 }catch{return Response.json({error:'Snapshot versions unavailable.'},{status:503,headers});}
}
