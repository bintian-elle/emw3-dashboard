"use client";

import {useState} from "react";
import {RiArrowDownSLine,RiArrowRightSLine} from "@remixicon/react";
import {Button} from "@/components/base/buttons/button";
import {Chip} from "@/components/base/badges/chip";
import {ImageLightbox} from "@/components/application/media/image-lightbox";
import type {AssetCategory,AssetScope} from "@/lib/google-associated-assets";

function safeUrl(raw?:string){try{const url=new URL(raw??"");return ["https:","http:"].includes(url.protocol)?url.href:null;}catch{return null;}}
function AssetTypeGroup({category,scope}:{category:AssetCategory;scope:AssetScope}){
 const [open,setOpen]=useState(false);
 const id=`associated-${scope.key}-${category.key}`;
 return <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-3"><Button variant="secondary" className="w-full justify-between" trailingIcon={open?RiArrowDownSLine:RiArrowRightSLine} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{category.label} · {category.items.length}</Button>{open&&<div id={id} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{category.items.map(({asset})=><article key={asset.id} className="min-w-0 rounded-2xl border border-border-button-default bg-background-secondary-default p-4"><div className="flex flex-wrap items-center gap-2"><Chip color={scope.key==="ad-group"?"purple":"blue"} variant="caption">{scope.key==="ad-group"?"Ad Group":"Campaign"}</Chip><span className="text-caption-1-regular text-text-tertiary">Asset {asset.id}</span></div>{asset.localMediaPath&&<div className="mt-3"><ImageLightbox unoptimized src={asset.localMediaPath} alt={asset.name||`Asset ${asset.id}`} size="lg"/></div>}<p className="mt-3 break-words text-body-medium text-text-primary">{asset.textAsset?.text||asset.calloutAsset?.calloutText||asset.sitelinkAsset?.linkText||asset.name||`${category.label} · ${asset.id}`}</p>{asset.sitelinkAsset&&<p className="mt-2 text-body-regular text-text-secondary">{asset.sitelinkAsset.description1} {asset.sitelinkAsset.description2}</p>}{asset.finalUrls?.map(raw=>{const url=safeUrl(raw);return url?<a key={raw} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-body-regular text-text-secondary underline">{url}</a>:null;})}{asset.youtubeVideoAsset&&<a href={`https://www.youtube.com/watch?v=${encodeURIComponent(asset.youtubeVideoAsset.youtubeVideoId)}`} target="_blank" rel="noopener noreferrer" className="mt-2 block text-body-medium text-text-secondary underline">Watch video</a>}<p className="mt-4 break-words border-t border-separator-border pt-3 text-caption-1-regular text-text-tertiary">Source {scope.key==="ad-group"?"Ad Group":"Campaign"}: {scope.sourceName}</p></article>)}</div>}</div>;
}
function AssetScopeGroup({scope}:{scope:AssetScope}){
 const [open,setOpen]=useState(false);
 const id=`associated-${scope.key}`;
 return <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-5"><Button variant="secondary" className="w-full justify-between" trailingIcon={open?RiArrowDownSLine:RiArrowRightSLine} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{scope.label} · {scope.count}</Button><p className="mt-3 break-words text-body-regular text-text-secondary">{scope.sourceName}</p><p className="mt-1 text-caption-1-regular text-text-tertiary">{scope.key==="ad-group"?"Associated directly with this ad group.":"Shared across ad groups in this campaign."}</p><div className="mt-3 flex flex-wrap gap-2">{scope.categories.map(category=><Chip key={category.key} color="soft" variant="caption">{category.label} · {category.items.length}</Chip>)}</div>{open&&<div id={id} className="mt-4 grid gap-3">{scope.categories.length?scope.categories.map(category=><AssetTypeGroup key={category.key} category={category} scope={scope}/>):<p className="text-body-regular text-text-tertiary">No assets associated at this level.</p>}</div>}</div>;
}
export function AssociatedAssets({scopes}:{scopes:AssetScope[]}){
 return <section className="mt-8 grid gap-4" aria-label="Associated assets"><header><h2 className="text-title-2-medium text-text-primary">Associated assets</h2><p className="mt-2 text-body-regular text-text-secondary">Grouped by where they are linked. These assets are available to the ad group and are not individually bound to every RSA.</p></header>{scopes.map(scope=><AssetScopeGroup key={scope.key} scope={scope}/>)}</section>;
}
