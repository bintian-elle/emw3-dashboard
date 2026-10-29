"use client";

import type {ArchivedAsset,CreativeArchive} from "@/lib/google-creative-archive";
import {NovaSearchAdPreview} from "./nova-search-ad-preview";

type Ad=CreativeArchive["ads"][number]["adGroupAd"]["ad"];
export function SearchAdPreview(props:{ad:Ad;variant:number;businessName:string;logo?:string;sitelinks:ArchivedAsset[]}){
 return <NovaSearchAdPreview {...props}/>;
}
