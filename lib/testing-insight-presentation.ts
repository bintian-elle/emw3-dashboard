export type PresentationDataset={id:string;scopes?:string[];labels?:Record<string,string>;xKey:string;columns:Record<string,string>;rows:Record<string,string|number|null>[]};
export type PresentationMedia={key:string;asset_id:string;name:string;kind:'frame'|'image';timestamp_seconds:number|null;width:number;height:number;file:string;sha256:string;url?:string;campaigns:string[]};
export type PresentationMarker={x:number;y:number;width:number;height:number;label:string;observation:string;recommendation:string;confidence:string};
export type PresentationChart={chart_type:string;dataset_ref:string;x_key:string;y_keys:string[];reason:string;annotations:{category:string;label:string}[]};
export type PresentationSection={id:string;title:string};
export type PresentationBlock={id:string;scope:string;section_id?:string;type:'highlight'|'chart'|'creative'|'actions'|'text'|'document';html?:string;charts?:{id:string;spec:PresentationChart}[];dataset_refs?:string[];media_keys?:string[];design_reason?:string;title:string;text:string;chart:PresentationChart|null;creative:{asset_id:string;media_key:string;markers:PresentationMarker[]}|null;actions:{priority:string;target:string;action:string;evidence:string;validation:string}[]};
export type InsightPresentation={schema_version:'insight-presentation-v1'|'insight-presentation-v2'|'insight-presentation-v3';title:string;summary:string;sections?:PresentationSection[];styles_per_scope?:boolean;blocks:PresentationBlock[]};
export type PmaxReadableReport={run_id:string;media_url_base?:string;channel?:string;currency?:string|null;language?:string;scope?:string;source_urls?:string[];period:{start:string;end:string};comparison:{start:string;end:string};totals:Record<string,number|null>;comparison_totals?:Record<string,number|null>;datasets:Record<string,PresentationDataset>;media:PresentationMedia[];presentation:InsightPresentation;analysis:{executive_summary:string;campaigns:{test_id:string;summary:string;detail_markdown:string}[]}};
export const presentationUnit=(unit:string)=>['count','views','reach','impressions','clicks','orders','likes','comments','shares','saves','follows'].includes(unit)?'count':unit;
export const presentationCharts=['line','area','bar','column','pie','scatter','composed','radar','funnel','treemap'] as const;
export function insightPresentationGroups(value:InsightPresentation,scope:string){
 const blocks=value.blocks.filter(block=>block.scope===scope);
 return value.schema_version!=='insight-presentation-v1'?(value.sections??[]).map(section=>({...section,blocks:blocks.filter(block=>block.section_id===section.id)})):blocks.map(block=>({id:block.id,title:block.title,blocks:[block]}));
}
export function validateInsightPresentation(value:InsightPresentation,packet:Pick<PmaxReadableReport,'datasets'|'media'|'analysis'>&{sections?:PresentationSection[];source_urls?:string[]}){
 if(!['insight-presentation-v1','insight-presentation-v2','insight-presentation-v3'].includes(value.schema_version)||!value.title?.trim()||!value.summary?.trim()||!Array.isArray(value.blocks)||!value.blocks.length||value.blocks.length>60)throw Error('Invalid presentation envelope');
 const scopes=new Set(['channel',...packet.analysis.campaigns.map(c=>c.test_id)]),ids=new Set<string>();
 if(value.schema_version!=='insight-presentation-v1'){
  if(!packet.sections?.length||value.sections?.length!==packet.sections.length||packet.sections.some((section,index)=>section.id!==value.sections?.[index]?.id||!value.sections?.[index]?.title?.trim())||new Set(packet.sections.map(section=>section.id)).size!==packet.sections.length)throw Error('Presentation changed the authoritative chapter structure');
  for(const scope of scopes){
   const blocks=value.blocks.filter(block=>block.scope===scope),indexes=blocks.map(block=>packet.sections!.findIndex(section=>section.id===block.section_id));
   if(indexes.some((index,i)=>index<0||i>0&&index<indexes[i-1])||packet.sections.some((_,index)=>!indexes.includes(index)))throw Error('Presentation omitted or reordered a required scope chapter');
  }
 }
 for(const block of value.blocks){
  if(!block.id||ids.has(block.id)||!scopes.has(block.scope)||!block.title?.trim()||!['highlight','chart','creative','actions','text','document'].includes(block.type))throw Error('Invalid presentation scope or block identity');ids.add(block.id);
  if(block.type==='document'){
   if(value.schema_version!=='insight-presentation-v3'||!block.html?.trim()||block.html.length>250000||!block.design_reason?.trim()||!Array.isArray(block.dataset_refs)||!Array.isArray(block.media_keys))throw Error('Invalid free composition');
   if(/<\s*(script|iframe|object|embed|form|base|meta|link)\b|\bon[a-z]+\s*=|javascript\s*:|@import|url\s*\(/i.test(block.html))throw Error('Executable or externally loaded composition');
   for(const ref of block.dataset_refs)if(!packet.datasets[ref]||block.scope!=='channel'&&!ref.startsWith(block.scope+'.')&&!packet.datasets[ref].scopes?.includes(block.scope))throw Error('Unverified composition data');
   const chartIds=new Set<string>();
   for(const item of block.charts??[]){
    const slotIds=[...block.html.matchAll(/\bdata-insight-chart\s*=\s*(["'])(.*?)\1/g)].map(match=>match[2]);
    if(!item.id||item.id.length>256||/[\u0000-\u001f\u007f]/.test(item.id)||chartIds.has(item.id)||!slotIds.includes(item.id))throw Error('Invalid interactive chart slot');chartIds.add(item.id);
    validateInsightPresentation({schema_version:'insight-presentation-v1',title:value.title,summary:value.summary,blocks:[{...block,type:'chart',chart:item.spec}]},packet);
   }
   for(const key of block.media_keys)if(!packet.media.some(m=>m.key===key&&(block.scope==='channel'||m.campaigns.includes(block.scope))))throw Error('Unverified composition media');
   for(const match of block.html.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi))if(!packet.media.some(m=>block.media_keys!.includes(m.key)&&match[1]===`/api/testing/presentation/media/${m.key}?v=${m.sha256.slice(0,12)}`))throw Error('Unverified composition image');
   for(const match of block.html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)){const href=match[1].replaceAll('&amp;','&');if(href.startsWith('#'))continue;if(/^\/bluevua\/testing\/[a-zA-Z0-9_/-]+$/.test(href)&&!href.includes('//')&&packet.source_urls?.includes(href))continue;const url=new URL(href);if(url.protocol!=='https:'||!(packet.source_urls?.includes(href)||packet.media.some(m=>m.url&&new URL(m.url).origin===url.origin&&new URL(m.url).pathname===url.pathname&&new URL(m.url).searchParams.get('v')===url.searchParams.get('v'))))throw Error('Unverified composition link');}
  }
  if(block.type==='chart'){
   const chart=block.chart,dataset=chart&&packet.datasets[chart.dataset_ref];
   if(!chart||!dataset||!(presentationCharts as readonly string[]).includes(chart.chart_type)||chart.x_key!==dataset.xKey||!chart.y_keys.length||chart.y_keys.some(key=>!Object.hasOwn(dataset.columns,key)||key===dataset.xKey))throw Error('Unverified chart data reference');
   if(chart.y_keys.some(key=>!dataset.rows.some(row=>typeof row[key]==='number'&&Number.isFinite(row[key]))))throw Error('Chart metric has no available data');
   if(new Set(chart.y_keys.map(key=>presentationUnit(dataset.columns[key]))).size>1&&chart.chart_type!=='composed')throw Error('Mixed chart units require explicit dual axes');
   if(chart.chart_type==='pie'&&chart.y_keys.length!==1)throw Error('Pie chart needs one metric');
   if(chart.annotations.some(note=>!dataset.rows.some(row=>String(row[chart.x_key])===note.category)))throw Error('Unknown chart annotation category');
   if(block.scope!=='channel'&&!chart.dataset_ref.startsWith(block.scope+'.')&&!dataset.scopes?.includes(block.scope))throw Error('Campaign chart points to a different scope');
  }
  if(block.type==='creative'){
   const creative=block.creative,media=creative&&packet.media.find(m=>m.key===creative.media_key&&m.asset_id===creative.asset_id);
   if(!creative||!media||!creative.markers.length||creative.markers.length>8||block.scope!=='channel'&&!media.campaigns.includes(block.scope))throw Error('Unverified creative evidence');
   for(const box of creative.markers)if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.x<0||box.y<0||box.width<=0||box.height<=0||box.x+box.width>1.00001||box.y+box.height>1.00001||!box.observation||!box.recommendation)throw Error('Invalid creative annotation geometry');
  }
  if(block.type==='actions'&&(!Array.isArray(block.actions)||!block.actions.length))throw Error('Missing actionable recommendations');
 }
 return value;
}

/** Each isolated document receives the AI report's shared stylesheet, without imposing a layout. */
export function presentationDocumentHtml(presentation:InsightPresentation,block:PresentationBlock){
 const shared=presentation.blocks.filter(item=>item.type==='document'&&(!presentation.styles_per_scope||item.scope===block.scope)).flatMap(item=>item.html?.match(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)??[]).join('\n');
 // A body container also prevents the HTML parser dropping leading style elements.
 return `<div>${shared}${(block.html??'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'')}</div>`;
}

export function presentationPop(current:number|null|undefined,previous:number|null|undefined,language='zh'){
 if(current==null||previous==null||!Number.isFinite(current)||!Number.isFinite(previous))return language==='en'?'PoP unavailable':'PoP 不可用';
 if(current===previous)return language==='en'?'PoP unchanged':'PoP 持平';
 if(previous===0)return language==='en'?'PoP: prior 0':'PoP 前期为 0';
 const percent=(current-previous)/Math.abs(previous)*100;
 return `PoP ${percent>0?'↑ +':'↓ −'}${Math.abs(percent).toFixed(1)}%`;
}
