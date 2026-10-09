import type {CreativeArchive} from "./google-creative-archive";
export type AssetAssociation=CreativeArchive["assets"][number];
export type AssetCategory={key:string;label:string;items:AssetAssociation[]};
export type AssetScope={key:"ad-group"|"campaign";label:string;sourceName:string;count:number;categories:AssetCategory[]};
const labels:Record<string,string>={SITELINK:"Sitelinks",PROMOTION:"Promotions",BUSINESS_NAME:"Business names",BUSINESS_LOGO:"Logos",AD_IMAGE:"Images",IMAGE:"Images",TEXT:"Text assets",CALLOUT:"Callouts",YOUTUBE_VIDEO:"Videos"};
export function groupAssociatedAssets(rows:AssetAssociation[],campaignId:string,adGroupId:string,campaignName:string,adGroupName:string):AssetScope[]{
 return ([{key:"ad-group" as const,label:"Ad Group assets",sourceName:adGroupName},{key:"campaign" as const,label:"Campaign shared assets",sourceName:campaignName}]).map(scope=>{
  const matching=rows.filter(row=>row.campaign.id===campaignId&&(scope.key==="ad-group"?row.adGroup?.id===adGroupId:!row.adGroup));
  const unique=[...new Map(matching.map(row=>[row.asset.id,row])).values()];
  const categories=new Map<string,AssetAssociation[]>();
  for(const row of unique){const key=(row.adGroupAsset?.fieldType??row.campaignAsset?.fieldType??row.asset.type);categories.set(key,[...(categories.get(key)??[]),row]);}
  return {...scope,count:unique.length,categories:[...categories].map(([key,items])=>({key,label:labels[key]??key.toLowerCase().replaceAll("_"," "),items})).sort((a,b)=>a.label.localeCompare(b.label))};
 });
}
