"use client";
import {useState} from "react";
import type {SortDescriptor} from "react-aria-components";
import {RiArrowDownLine,RiArrowUpLine,RiArrowUpDownLine} from "@remixicon/react";
import {Table,TableHeader,TableColumn,TableBody,TableRow,TableCell} from "@/components/base/table/table";
import {Chip} from "@/components/base/badges/chip";
import {ImageLightbox} from "@/components/application/media/image-lightbox";
import {VideoLightbox} from "@/components/application/media/video-lightbox";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import type {PmaxAssetPerformance,TestingAsset} from "@/lib/google-expanded-content-testing";
import type {GoogleAdMetrics} from "@/lib/google-ad-performance";
const columns=orderTestingMetrics([{key:"spend",label:"Spend"},{key:"revenue",label:"Revenue"},{key:"roas",label:"ROAS"},{key:"orders",label:"#Purchase"},{key:"cvr",label:"CVR"},{key:"impressions",label:"Impressions"},{key:"clicks",label:"Clicks"},{key:"ctr",label:"CTR"},{key:"cpa",label:"CPA"},{key:"cpc",label:"CPC"}]);
function format(metrics:GoogleAdMetrics,key:string){const value=metrics[key as keyof GoogleAdMetrics];if(value==null)return "—";if(["ctr","cvr"].includes(key))return new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2}).format(value);if(key==="roas")return value.toFixed(2);return new Intl.NumberFormat("en-US",{...(["spend","revenue","cpa","cpc"].includes(key)?{style:"currency",currency:"USD"}:{}),maximumFractionDigits:2}).format(value);}
const fieldName=(value:string)=>value.toLowerCase().replaceAll("_"," ").replace(/^./,v=>v.toUpperCase());
type Props={rows:PmaxAssetPerformance[];assets:TestingAsset[];videoNames:Record<string,string>};
export function PmaxAssetPerformanceTable(props:Props){
 const groups=[
  {title:"Images",matches:(asset:TestingAsset)=>Boolean(asset.imageAsset)},
  {title:"Videos",matches:(asset:TestingAsset)=>Boolean(asset.youtubeVideoAsset)},
  {title:"Text assets",matches:(asset:TestingAsset)=>Boolean(asset.textAsset)},
 ];
 return <div className="grid gap-6">{groups.map(({title,matches})=>{
  const ids=new Set(props.assets.filter(matches).map(asset=>asset.id));
  return <AssetTypePerformanceTable key={title} {...props} title={title} rows={props.rows.filter(row=>ids.has(row.assetId))}/>;
 })}</div>;
}
function AssetTypePerformanceTable({rows,assets,videoNames,title}:Props&{title:string}){
 const [sort,setSort]=useState<SortDescriptor>();
 const ordered=[...rows].sort((a,b)=>{
  if(!sort)return Number(b.status==="ENABLED")-Number(a.status==="ENABLED")||a.assetId.localeCompare(b.assetId);
  const key=sort.column as keyof GoogleAdMetrics,x=a.metrics[key],y=b.metrics[key];if(x==null)return y==null?0:1;if(y==null)return -1;return (sort.direction==="descending"?-1:1)*(x-y);
 });
 return <section className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default"><div className="border-b border-border-table p-5"><h2 className="text-title-3-semibold text-text-primary">{title} · {rows.length}</h2></div><Table aria-label={`${title} performance`} sortDescriptor={sort} onSortChange={setSort} className="min-w-6xl"><TableHeader><TableColumn isRowHeader className="w-80">Asset</TableColumn>{columns.map(column=><TableColumn key={column.key} id={column.key} allowsSorting className="text-right">{({sortDirection})=>{const Icon=sortDirection==="ascending"?RiArrowUpLine:sortDirection==="descending"?RiArrowDownLine:RiArrowUpDownLine;return <span className="inline-flex items-center gap-1 whitespace-nowrap">{column.label}<Icon className="size-3 text-foreground-icon-tertiary" aria-hidden/></span>;}}</TableColumn>)}</TableHeader><TableBody items={ordered} renderEmptyState={()=>`No ${title.toLowerCase()} attached to this asset group.`}>{row=>{
  const asset=assets.find(a=>a.id===row.assetId);
  const name=asset?.youtubeVideoAsset?.youtubeVideoTitle||videoNames[row.assetId]||asset?.name||asset?.textAsset?.text||`Asset ${row.assetId}`;
  const video=asset?.youtubeVideoAsset?.youtubeVideoId;
  return <TableRow id={`${row.assetId}-${row.fieldType}`}><TableCell><div id={`asset-${row.assetId}`} className="flex min-w-0 items-start gap-3 py-2">{video?<VideoLightbox size="md" src={`https://www.youtube.com/embed/${video}`} thumbnailUrl={`/api/google/creative-media/youtube/${video}`} title={name}/>:asset?.imageAsset?<ImageLightbox src={asset.imageAsset.fullSize?.url??null} alt={name} unoptimized/>:null}<div className="min-w-0"><p className="break-words text-body-regular text-text-primary">{name}</p><p className="mt-1 text-caption-1-regular text-text-tertiary">{fieldName(row.fieldType)}</p><div className="mt-2"><Chip variant="caption" color={row.status==="ENABLED"?"lime":"soft"}>{row.status}</Chip></div></div></div></TableCell>{columns.map(column=><TableCell key={column.key} className="text-right tabular-nums">{format(row.metrics,column.key)}</TableCell>)}</TableRow>;
 }}</TableBody></Table></section>;
}
