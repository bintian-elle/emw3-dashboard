import {readLocalPromptPreview} from "@/lib/testing-prompt-preview.server";
import {previewReadoutRecords} from "@/lib/testing-prompt-preview";
import { NextResponse } from "next/server";
import { currentSiteUser } from "@/lib/current-site-user";
import {validTestingReadoutKeys} from "@/lib/testing-readout-keys";
import {readTestingPageReadouts,reconcileExpectedTestingPageReadouts} from "@/lib/testing-readout-page-cache";

export async function GET(request: Request) {
  const user = await currentSiteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawKeys = new URL(request.url).searchParams.getAll("key");
  const keys = validTestingReadoutKeys(rawKeys);
  if (!keys) {
    return NextResponse.json({ error: "Invalid readout cache key." }, { status: 400 });
  }

  // A local preview is file-backed: never publish or translate shared results here.
  const preview=await readLocalPromptPreview(new URL(request.url).searchParams.get('language')??undefined);
  if(preview){
    const concludedKeys=keys.filter(key=>key.startsWith('period:concluded:')||key.startsWith('period:manual-'));
    const previewLanguage=new URL(request.url).searchParams.get('language')==='zh'?'zh':'en';
    const expected=new URL(request.url).searchParams.get('expected');
    if(expected&&concludedKeys.length){try{if(expected.length>8192)throw Error('Invalid version');await reconcileExpectedTestingPageReadouts(concludedKeys,previewLanguage,JSON.parse(expected));}catch{return NextResponse.json({error:'Published readout unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
    const concluded=concludedKeys.length?await readTestingPageReadouts(concludedKeys,previewLanguage,true):[];
    return NextResponse.json({records:[...previewReadoutRecords(preview.manifest,preview.reports,keys.filter(key=>!key.startsWith('period:manual-'))),...concluded]},{headers:{"Cache-Control":"private, no-store"}});
  }

  const language=new URL(request.url).searchParams.get("language") === "zh" ? "zh" : "en";
  const expected=new URL(request.url).searchParams.get('expected');
  if(expected){try{if(expected.length>8192)throw Error('Invalid version');await reconcileExpectedTestingPageReadouts(keys,language,JSON.parse(expected));}catch{return NextResponse.json({error:'Published readout unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
  // Generation, publication and reconciliation belong to the scheduled backend.
  const records = await readTestingPageReadouts(keys,language,true);
  return NextResponse.json(
    { records },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
