import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pmaxMetrics,pmaxTestingDays} from '../../lib/pmax-testing-performance.ts';
import {buildInsightAssets} from '../../lib/testing-insight-assets.ts';
const root=resolve(process.argv[2]||'.state/pmax-readable-20261104');
const saved=JSON.parse(await readFile(join(root,'snapshot.json'),'utf8')),snapshot=saved.payload;
const period={label:'Last Week (Tue–Mon)',start:'2026-10-27',end:'2026-11-02'},comparison={start:'2026-10-20',end:'2026-10-26'};
if(snapshot.end<period.end||!snapshot.pmaxProductDays||!snapshot.pmaxAssetDays)throw Error('PMax snapshot does not cover the requested period/basis');
const days=pmaxTestingDays(snapshot.days,snapshot.pmaxProductDays),window=(rows,p)=>rows.filter(r=>r.segments.date>=p.start&&r.segments.date<=p.end);
const tests=[];
for(const inv of snapshot.inventory){
 let test=tests.find(t=>t.test_id===inv.campaign.name);
 if(!test){test={test_id:inv.campaign.name,channel:'Google PMAX',campaign_name:inv.campaign.name,data:{...inv.campaign,groups:[]}};tests.push(test);}
 const group=inv.assetGroup,id=group.id,selected=window(days,period).filter(d=>d.assetGroup?.id===id);
 const assetDays=window(snapshot.pmaxAssetDays,period).filter(d=>d.assetGroup?.id===id);
 const links=snapshot.assets.filter(a=>a.assetGroup.id===id&&['TEXT','IMAGE','YOUTUBE_VIDEO'].includes(a.asset.type)&&a.assetGroupAsset.source!=='AUTOMATICALLY_CREATED'&&(a.assetGroupAsset.status!=='REMOVED'||assetDays.some(d=>d.asset?.id===a.asset.id)));
 const assets=[...new Map(links.map(a=>[a.asset.id,a.asset])).values()];
 test.data.groups.push({...group,metrics:pmaxMetrics(selected),comparison:pmaxMetrics(window(days,comparison).filter(d=>d.assetGroup?.id===id)),assets,assetPerformance:links.map(link=>({assetId:link.asset.id,fieldType:link.assetGroupAsset.fieldType,status:link.assetGroupAsset.status,metrics:pmaxMetrics(assetDays.filter(d=>d.asset?.id===link.asset.id&&d.assetGroupAsset?.fieldType===link.assetGroupAsset.fieldType))}))});
}
const metricColumns={spend:'USD',revenue:'USD',orders:'orders',clicks:'clicks',roas:'ratio',cpa:'USD',cvr:'fraction',cpc:'USD',ctr:'fraction',impressions:'impressions'};
const metrics=rows=>Object.fromEntries(Object.keys(metricColumns).map(key=>[key,rows[key]??null]));
const datasets={};
function register(id,rows,xKey='category'){datasets[id]={id,xKey,columns:{[xKey]:'category',...metricColumns},rows};}
const direction=group=>/better/i.test(group.name)?'Better You Can Feel':/protection/i.test(group.name)?'Protection That Matters':group.name;
function make(scope,inventory){
 register(`${scope}.directions`,[...new Set(inventory.map(i=>direction(i.assetGroup)))].map(category=>{const ids=new Set(inventory.filter(i=>direction(i.assetGroup)===category).map(i=>i.assetGroup.id));return {category,...metrics(pmaxMetrics(window(days,period).filter(d=>ids.has(d.assetGroup?.id))))};}));
 for(const [label,p] of [['current',period],['previous',comparison]]){
  const ids=new Set(inventory.map(i=>i.assetGroup.id)),dates=[...new Set(window(days,p).map(d=>d.segments.date))].sort();
  register(`${scope}.daily.${label}`,dates.map(date=>({date,...metrics(pmaxMetrics(days.filter(d=>d.segments.date===date&&ids.has(d.assetGroup?.id))))})),'date');
 }
}
make('channel',snapshot.inventory);
register('channel.campaigns',tests.map(t=>({category:t.campaign_name,...metrics(pmaxMetrics(window(days,period).filter(d=>d.campaign.id===t.data.id)))})));
for(const t of tests)make(t.test_id,snapshot.inventory.filter(i=>i.campaign.id===t.data.id));
const promptHash=createHash('sha256').update(await readFile(resolve('prompts/content-testing/google-pmax.md'))).digest('hex');
const packet={prompt_sha256:promptHash,run_id:'pmax-readable-20261104',report_id:'google-pmax',language:'zh-CN',channel:'Google PMAX',scope:'period',period,comparison,required_sections:['渠道整体大盘对比','下一步行动建议与优化策略'],captured_at:saved.updatedAt,metric_basis:{pmax:'pmax-testing-assets-v1'},tests,datasets,totals:pmaxMetrics(window(days,period)),comparison_totals:pmaxMetrics(window(days,comparison)),creative_references:buildInsightAssets('google-pmax',snapshot),data_gaps:['Asset performance figures are associations, never additive order/revenue contributions.','Asset Ratings are not in this snapshot; do not invent Best/Good/Low.','Direction impressions/CTR remain null where product/ad impressions cannot be reconciled.'],presentation_instructions:'按不变的Google PMax内容prompt完成分析。宏观总览与下一步动作放sections，素材层级下钻放准确匹配的campaigns[].detail_markdown。生成本轮新日期，不沿用旧报告。所有业务正文为简体中文；素材名、Campaign名和指标保留原文。不要发送消息、写数据库、修改广告或创建会话。素材原图和实际视频帧可读取media-index.json。'};
await mkdir(join(root,'inputs'),{recursive:true});await mkdir(join(root,'results'),{recursive:true});await mkdir(join(root,'prompts'),{recursive:true});
await writeFile(join(root,'inputs/google-pmax.json'),JSON.stringify(packet,null,2));
await writeFile(join(root,'manifest.json'),JSON.stringify({run_id:packet.run_id,language:'zh-CN',status:'prepared',period,reports:[{report_id:'google-pmax',period}]}));
console.log(JSON.stringify({period,comparison,campaigns:tests.length,totals:packet.totals,datasets:Object.keys(datasets).length}));
