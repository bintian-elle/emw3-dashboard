"use client";
import {useMetricSortReady} from "../metric-sorting";
import {useState} from "react";
import {nextMetricSort,sortMetricRows,type MetricSort} from "@/lib/testing-metric-sort";
import {ArrowDown,ArrowUp,ChevronsUpDown} from "lucide-react";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import Image from "next/image";
import {type SocialPost,socialMetrics} from "@/lib/instagram-posts";
import styles from "../channel-content.module.css";

const number=new Intl.NumberFormat("en-US");
const labels={views:"Views",reach:"Reach",likes:"Likes",comments:"Comments",shares:"Shares",saved:"Saves",follows:"Follows"};
const trafficTypes=["Organic","Paid"] as const;
export function SocialPostTable({posts}:{posts:SocialPost[]}){
 const [sort,setSort]=useState<MetricSort>(null),{language}=useSiteLanguage(),ready=useMetricSortReady();
 const ordered=sortMetricRows(posts.map((post,index)=>({...post,displayIndex:index+1})),sort,post=>Object.fromEntries(socialMetrics.flatMap(metric=>trafficTypes.map(traffic=>[`${traffic}:${metric}`,traffic==='Paid'?post.paid?.metrics[metric]:post.metrics[metric]]))));
 return <div className={styles.tableWrap}><table aria-label="Instagram post performance" className={styles.table}><thead><tr><th scope="col">Post</th><th scope="col">Published</th><th scope="col">Format</th><th scope="col">Traffic</th>{socialMetrics.map(metric=><th scope="col" key={metric} aria-sort={sort?.key.endsWith(`:${metric}`)?sort.direction:'none'}>{labels[metric]}<div className={styles.sort}>{trafficTypes.map(traffic=>{const key=`${traffic}:${metric}`,active=sort?.key===key,Icon=active?(sort.direction==='ascending'?ArrowUp:ArrowDown):ChevronsUpDown;return <button key={traffic} type="button" aria-label={`${labels[metric]} · ${traffic}: ${language==='zh'?'切换排序':'Toggle sorting'}`} disabled={!ready} onClick={()=>setSort(previous=>nextMetricSort(previous,key))}>{traffic} <Icon aria-hidden="true"/></button>;})}</div></th>)}</tr></thead><tbody>{ordered.map(post=><tr key={post.code}>
  <td><a href={post.url} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>{post.thumbnailUrl&&<Image unoptimized width={64} height={64} src={post.thumbnailUrl} alt="" className={styles.thumbnail} loading="lazy" referrerPolicy="no-referrer"/>}<span className={styles.identityText}>Post {post.displayIndex}<br/><span className={styles.muted}>{post.caption||post.code}</span></span></a></td>
  <td>{post.publishedAt?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(post.publishedAt)):"—"}</td><td>{post.mediaType??"—"}</td>
  <td><div className={styles.traffic}>{trafficTypes.map(traffic=><span className={styles.badge} key={traffic}>{traffic}</span>)}</div></td>
  {socialMetrics.map(metric=><td key={metric}><div className={styles.traffic}>{trafficTypes.map(traffic=>{const value=traffic==="Paid"?post.paid?.metrics[metric]:post.metrics[metric];return <span key={traffic} aria-label={`${traffic}: ${value==null?'unavailable':number.format(value)}`}>{value==null?"—":number.format(value)}</span>;})}</div></td>)}
 </tr>)}</tbody></table></div>;
}
