"use client";
import {useMetricSortReady} from "../metric-sorting";
import {useState} from "react";
import {nextMetricSort,sortMetricRows,type MetricSort} from "@/lib/testing-metric-sort";
import {Button} from "@/components/base/buttons/button";
import {RiArrowDownLine,RiArrowUpLine,RiExpandUpDownLine} from "@remixicon/react";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import {Table,TableHeader,TableColumn,TableBody,TableRow,TableCell} from "@/components/base/table/table";
import Image from "next/image";
import {Chip} from "@/components/base/badges/chip";
import {type SocialPost,socialMetrics} from "@/lib/instagram-posts";
const number=new Intl.NumberFormat("en-US");
const labels={views:"Views",reach:"Reach",likes:"Likes",comments:"Comments",shares:"Shares",saved:"Saves",follows:"Follows"};
const trafficTypes=["Organic","Paid"] as const;
export function SocialPostTable({posts}:{posts:SocialPost[]}){
 const [sort,setSort]=useState<MetricSort>(null),{language}=useSiteLanguage(),ready=useMetricSortReady();
 const ordered=sortMetricRows(posts.map((post,index)=>({...post,displayIndex:index+1})),sort,post=>Object.fromEntries(socialMetrics.flatMap(metric=>trafficTypes.map(traffic=>[`${traffic}:${metric}`,traffic==='Paid'?post.paid?.metrics[metric]:post.metrics[metric]]))));

 return <Table aria-label="Instagram post performance" className="min-w-max"><TableHeader><TableColumn isRowHeader>Post</TableColumn><TableColumn>Published</TableColumn><TableColumn>Format</TableColumn><TableColumn>Traffic</TableColumn>{socialMetrics.map(metric=><TableColumn key={metric} aria-sort={sort?.key.endsWith(`:${metric}`)?sort.direction:'none'}><span className="block">{labels[metric]}</span><div className="mt-1 flex gap-2">{trafficTypes.map(traffic=>{const key=`${traffic}:${metric}`,active=sort?.key===key,Icon=active?(sort.direction==='ascending'?RiArrowUpLine:RiArrowDownLine):RiExpandUpDownLine;return <Button key={traffic} type="button" variant="ghost" size="small" trailingIcon={Icon} aria-label={`${labels[metric]} · ${traffic}: ${language==='zh'?'切换排序':'Toggle sorting'}`} disabled={!ready} onClick={()=>setSort(previous=>nextMetricSort(previous,key))} className="h-auto min-h-8 bg-transparent p-0 text-caption-1-semibold text-text-secondary">{traffic}</Button>;})}</div></TableColumn>)}</TableHeader><TableBody>{ordered.map(post=><TableRow key={post.code}>
  <TableCell className="align-middle"><a href={post.url} target="_blank" rel="noopener noreferrer" className="flex w-56 items-center gap-3 rounded-md text-body-medium text-status-blue-text underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">{post.thumbnailUrl&&<Image unoptimized width={64} height={64} src={post.thumbnailUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" loading="lazy" referrerPolicy="no-referrer"/>}<span className="min-w-0"><span className="block">Post {post.displayIndex}</span><span className="line-clamp-2 text-caption-1-regular text-text-secondary">{post.caption||post.code}</span></span></a></TableCell>
  <TableCell className="align-middle">{post.publishedAt?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(post.publishedAt)):"—"}</TableCell>
  <TableCell className="align-middle">{post.mediaType??"—"}</TableCell>
  <TableCell><div className="grid gap-2">{trafficTypes.map(traffic=><div key={traffic} className="flex h-8 items-center"><Chip variant="caption" color={traffic==="Organic"?"lime":"purple"}>{traffic}</Chip></div>)}</div></TableCell>
  {socialMetrics.map(metric=><TableCell key={metric}><div className="grid gap-2">{trafficTypes.map(traffic=>{const value=traffic==="Paid"?post.paid?.metrics[metric]:post.metrics[metric];return <div key={traffic} className="flex h-8 items-center"><span className="sr-only">{traffic}: </span>{value==null?"—":number.format(value)}</div>;})}</div></TableCell>)}
 </TableRow>)}</TableBody></Table>;
}
