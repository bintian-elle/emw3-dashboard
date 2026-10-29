"use client";

import type {ArchivedAsset,CreativeArchive} from "@/lib/google-creative-archive";
import type {GoogleAdMetrics} from "@/lib/google-ad-performance";
import {NovaAdPerformanceList} from "./nova-ad-performance-list";

export function AdPerformanceList(props:{ads:CreativeArchive["ads"];metrics:Record<string,GoogleAdMetrics>|null;businessName:string;logo?:string;sitelinks:ArchivedAsset[]}){
 return <NovaAdPerformanceList {...props}/>;
}
