import {NextResponse} from 'next/server';
import {currentSiteUser} from '@/lib/current-site-user';
import {validTestingReadoutKeys} from '@/lib/testing-readout-keys';
import {reconcileTestingPageReadouts} from '@/lib/testing-readout-page-cache';
import {readLocalPromptPreviewVersion} from '@/lib/testing-prompt-preview.server';

/** Version metadata for published page summaries, never personal conversations. */
export async function GET(request:Request){
 if(!await currentSiteUser())return NextResponse.json({error:'Unauthorized'},{status:401});
 const query=new URL(request.url).searchParams,keys=validTestingReadoutKeys(query.getAll('key'));
 if(!keys)return NextResponse.json({error:'Invalid readout cache key.'},{status:400});
 try{
  const localVersion=await readLocalPromptPreviewVersion(query.get('language')??undefined);
  if(localVersion&&!keys.some(key=>key.startsWith('period:concluded:')))return NextResponse.json({versions:keys.map(key=>({key,updatedAt:null,translationAt:null,sourceHash:null,previewVersion:localVersion}))},{headers:{'Cache-Control':'private, no-store'}});
  const versions=await reconcileTestingPageReadouts(keys,query.get('language')==='zh'?'zh':'en');
  return NextResponse.json({versions},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Readout versions unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
