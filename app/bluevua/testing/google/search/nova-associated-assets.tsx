'use client';

import {useState} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
import type {AssetCategory,AssetScope} from '@/lib/google-associated-assets';
import {NovaButton,NovaCard} from '../../nova-preview-ui';
import {NovaMediaPreview} from '../../nova-testing-asset';
import styles from './nova-search-detail.module.css';

function safeUrl(raw?:string){try{const url=new URL(raw??'');return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
function Category({category,scope}:{category:AssetCategory;scope:AssetScope}){
 const [open,setOpen]=useState(false),id=`associated-${scope.key}-${category.key}`;
 return <div className={styles.category}><NovaButton variant="outline" className={styles.disclosure} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{category.label} · {category.items.length}{open?<ChevronDown/>:<ChevronRight/>}</NovaButton>{open&&<div id={id} className={styles.assetGrid}>{category.items.map(({asset})=>{const src=asset.localMediaPath||safeUrl(asset.imageAsset?.fullSize?.url);return <article key={asset.id} className={styles.asset}><div><span className={styles.status}>{scope.key==='ad-group'?'Ad Group':'Campaign'}</span> <small>Asset {asset.id}</small></div>{src&&<NovaMediaPreview src={src} title={asset.name||`Asset ${asset.id}`}/>}<p>{asset.textAsset?.text||asset.calloutAsset?.calloutText||asset.sitelinkAsset?.linkText||asset.name||`${category.label} · ${asset.id}`}</p>{asset.sitelinkAsset&&<p>{asset.sitelinkAsset.description1} {asset.sitelinkAsset.description2}</p>}{asset.finalUrls?.map(raw=>{const url=safeUrl(raw);return url?<a key={raw} href={url} target="_blank" rel="noopener noreferrer">{url}</a>:null;})}{asset.youtubeVideoAsset&&<a href={`https://www.youtube.com/watch?v=${encodeURIComponent(asset.youtubeVideoAsset.youtubeVideoId)}`} target="_blank" rel="noopener noreferrer">Watch video</a>}<small>Source {scope.key==='ad-group'?'Ad Group':'Campaign'}: {scope.sourceName}</small></article>;})}</div>}</div>;
}
function Scope({scope}:{scope:AssetScope}){
 const [open,setOpen]=useState(false),id=`associated-${scope.key}`;
 return <NovaCard className={styles.scope}><NovaButton variant="outline" className={styles.disclosure} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{scope.label} · {scope.count}{open?<ChevronDown/>:<ChevronRight/>}</NovaButton><p>{scope.sourceName}</p><small>{scope.key==='ad-group'?'Associated directly with this ad group.':'Shared across ad groups in this campaign.'}</small><div className={styles.pills}>{scope.categories.map(category=><span className={styles.status} key={category.key}>{category.label} · {category.items.length}</span>)}</div>{open&&<div id={id} className={styles.categories}>{scope.categories.length?scope.categories.map(category=><Category key={category.key} category={category} scope={scope}/>):<p>No assets associated at this level.</p>}</div>}</NovaCard>;
}
export function NovaAssociatedAssets({scopes}:{scopes:AssetScope[]}){
 return <section className={styles.associated} aria-label="Associated assets"><header><h2>Associated assets</h2><p>Grouped by where they are linked. These assets are available to the ad group and are not individually bound to every RSA.</p></header>{scopes.map(scope=><Scope key={scope.key} scope={scope}/>)}</section>;
}
