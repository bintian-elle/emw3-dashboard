"use client";
import {useMetricSortReady} from "../metric-sorting";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {nextMetricSort,sortMetricRows,type MetricSort} from "@/lib/testing-metric-sort";
import {resolveTestingPeriod,testingLatestCompleteDate} from "@/lib/testing-period";
import type {TestingPeriodInput} from "@/lib/testing-google";
import {ArrowDown,ArrowUp,ChevronsUpDown} from "lucide-react";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import Image from "next/image";
import {type SocialPost,socialMetrics,cachedInstagramThumbnail} from "@/lib/instagram-posts";
import styles from "../channel-content.module.css";

const number=new Intl.NumberFormat("en-US");
const labels={views:"Views",reach:"Reach",likes:"Likes",comments:"Comments",shares:"Shares",saved:"Saves",follows:"Follows"};
const trafficTypes=["Organic","Paid"] as const;
export function SocialPostTable({posts,loading=false,dataVersion=""}:{posts:SocialPost[];loading?:boolean;dataVersion?:string}){
 const [sort,setSort]=useState<MetricSort>(null),{language}=useSiteLanguage(),ready=useMetricSortReady(),query=useSearchParams();
 const preset=query.get('period'),lifetime=!preset||preset==='lifetime';
 const period=resolveTestingPeriod(testingLatestCompleteDate(),{preset:(preset??'lastWeek') as TestingPeriodInput['preset'],start:query.get('start')??undefined,end:query.get('end')??undefined});
 const key=`${period.start}:${period.end}`;
 const [periodData,setPeriodData]=useState<{key:string;posts:Array<Pick<SocialPost,'code'|'paid'>>;error:boolean;limited?:boolean}|null>(null);
 useEffect(()=>{
  if(lifetime||loading)return;
  const controller=new AbortController(),params=new URLSearchParams({start:period.start,end:period.end});
  void fetch(`/api/testing/social-period?${params}`,{signal:controller.signal}).then(async response=>{
   if(!response.ok){if(!controller.signal.aborted)setPeriodData(previous=>previous?.key===key?{...previous,error:true,limited:response.status===429}:{key,posts:[],error:true,limited:response.status===429});return;}
   const result=await response.json() as {posts:Array<Pick<SocialPost,'code'|'paid'>>;stale?:boolean;limited?:boolean};
   if(!controller.signal.aborted)setPeriodData({key,posts:result.posts,error:!!result.stale,limited:result.limited});
  }).catch(()=>{if(!controller.signal.aborted)setPeriodData(previous=>previous?.key===key?{...previous,error:true}:{key,posts:[],error:true});});
  return()=>controller.abort();
 },[lifetime,loading,key,period.start,period.end,dataVersion]);
 const current=!lifetime&&periodData?.key===key?periodData:null;
 const namedPosts=posts.map((post,index)=>({...post,displayIndex:index+1,metrics:lifetime?post.metrics:Object.fromEntries(socialMetrics.map(metric=>[metric,null])) as SocialPost['metrics'],paid:lifetime?post.paid:current?.posts.find(item=>item.code===post.code)?.paid}));
 const ordered=sortMetricRows(namedPosts,sort,post=>Object.fromEntries(socialMetrics.flatMap(metric=>trafficTypes.map(traffic=>[`${traffic}:${metric}`,traffic==='Paid'?post.paid?.metrics[metric]:post.metrics[metric]]))));
 return <div data-review-target="social-post-order">
  {!lifetime&&!loading&&<div className={styles.socialStatus} role="status">{language==='zh'?`所选周期 ${period.start} – ${period.end}。Organic 历史周期数据不可用。`:`Selected period ${period.start} – ${period.end}. Historical Organic period data is unavailable.`}{!current&&(language==='zh'?' 正在加载 Paid 数据…':' Loading Paid data…')}{current?.error&&current.posts.length>0&&(language==='zh'?' 已显示上次保存的 Paid 数据。':' Showing previously saved Paid data.')}{current?.error&&(current.limited?(language==='zh'?' 达到 API 限额，请稍后再试。':' API rate limit reached. Please try again later.'):current.posts.length>0?(language==='zh'?' 更新失败，请稍后再试。':' Update failed. Please try again later.'):(language==='zh'?' Paid 数据暂时不可用，请稍后再试。':' Paid data is temporarily unavailable. Please try again later.'))}</div>}
  <div className={styles.tableWrap}><table aria-label="Instagram post performance" className={`${styles.table} ${styles.socialTable}`}>
   <thead><tr><th scope="col" rowSpan={2}>Post</th><th scope="col" rowSpan={2}>Published</th><th scope="col" rowSpan={2}>Format</th><th scope="col" rowSpan={2} className={styles.socialTraffic}>Traffic</th>{socialMetrics.map(metric=><th scope="colgroup" colSpan={2} className={styles.socialMetric} key={metric}>{labels[metric]}</th>)}</tr>
   <tr>{socialMetrics.flatMap(metric=>trafficTypes.map(traffic=>{const key=`${traffic}:${metric}`,active=sort?.key===key,Icon=active?(sort.direction==='ascending'?ArrowUp:ArrowDown):ChevronsUpDown;return <th scope="col" className={styles.socialMetric} key={key} aria-sort={active?sort.direction:'none'}><button className={styles.socialSort} type="button" aria-label={`${labels[metric]} · ${traffic}: ${language==='zh'?'切换排序':'Toggle sorting'}`} disabled={!ready||loading} onClick={()=>setSort(previous=>nextMetricSort(previous,key))}>{traffic} <Icon aria-hidden="true"/></button></th>;}))}</tr></thead>
   {loading&&<tbody><tr><td colSpan={18} className={styles.socialStatus} role="status">{language==='zh'?'正在加载数据…':'Loading data…'}</td></tr></tbody>}
   {ordered.map(post=><tbody key={post.code}>
    <tr className={styles.socialOrganic}><td rowSpan={2}><a href={post.url} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title={post.caption||post.code}>{(cachedInstagramThumbnail(post.code)??post.thumbnailUrl)&&<Image unoptimized width={64} height={64} src={(cachedInstagramThumbnail(post.code)??post.thumbnailUrl)!} alt="" className={styles.thumbnail} loading="lazy" referrerPolicy="no-referrer"/>}<span className={styles.identityText}>Post {post.displayIndex}<span className={`${styles.muted} ${styles.socialCaption}`}>{post.caption||post.code}</span></span></a></td>
    <td rowSpan={2}>{post.publishedAt?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(post.publishedAt)):"—"}</td><td rowSpan={2}>{post.mediaType??"—"}</td>
    <td className={styles.socialTraffic}><span className={`${styles.badge} ${styles.organicBadge}`}>Organic</span></td>{socialMetrics.flatMap(metric=>[<td className={styles.socialMetric} key={`${metric}:organic`} aria-label={loading?`${labels[metric]} Organic: ${language==='zh'?'加载中':'loading'}`:post.metrics[metric]==null?`${labels[metric]} Organic: ${language==='zh'?'数据不可用':'unavailable'}`:undefined}>{loading?'…':post.metrics[metric]==null?'—':number.format(post.metrics[metric]!)}</td>,<td className={styles.socialMetric} key={`${metric}:empty`} aria-hidden="true"/>])}</tr>
    <tr className={styles.socialPaid}><td className={styles.socialTraffic}><span className={`${styles.badge} ${styles.paidBadge}`}>Paid</span></td>{socialMetrics.flatMap(metric=>[<td className={styles.socialMetric} key={`${metric}:empty`} aria-hidden="true"/>,<td className={styles.socialMetric} key={`${metric}:paid`} aria-label={(loading||(!lifetime&&!current))?`${labels[metric]} Paid: ${language==='zh'?'加载中':'loading'}`:post.paid?.metrics[metric]==null?`${labels[metric]} Paid: ${language==='zh'?'数据不可用':'unavailable'}`:undefined}>{(loading||(!lifetime&&!current))?'…':post.paid?.metrics[metric]==null?'—':number.format(post.paid.metrics[metric]!)}</td>])}</tr>
   </tbody>)}
  </table></div>
 </div>;
}
