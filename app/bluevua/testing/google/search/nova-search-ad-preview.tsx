'use client';

import {useState} from 'react';
import Image from 'next/image';
import {Menu,Search,UserRound} from 'lucide-react';
import type {ArchivedAsset,CreativeArchive} from '@/lib/google-creative-archive';
import {previewDestination,previewTextCombination} from '@/lib/search-ad-preview';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {NovaButton,NovaCard} from '../../nova-preview-ui';
import {TestingChannelBrand} from '../../testing-channel-brand';
import styles from './nova-search-detail.module.css';

type Ad=CreativeArchive['ads'][number]['adGroupAd']['ad'];
export function NovaSearchAdPreview({ad,variant,businessName,logo,sitelinks}:{ad:Ad;variant:number;businessName:string;logo?:string;sitelinks:ArchivedAsset[]}){
 const [expanded,setExpanded]=useState(false),{language}=useSiteLanguage(),rsa=ad.responsiveSearchAd;
 const titles=previewTextCombination(rsa?.headlines??[],'HEADLINE',3,variant),descriptions=previewTextCombination(rsa?.descriptions??[],'DESCRIPTION',2,variant);
 const destination=previewDestination(ad.finalUrls?.[0],rsa?.path1,rsa?.path2);
 const links=sitelinks.slice(variant,variant+2).length===2?sitelinks.slice(variant,variant+2):sitelinks.slice(0,2);
 return <NovaCard className={styles.preview}><h3>Example {variant+1}</h3><div className={styles.phone}><div className={styles.phoneTop} aria-hidden="true"><Menu/><TestingChannelBrand name="Google Search"/><UserRound/><div><Search/></div></div><div className={styles.adContent}><strong>Sponsored</strong><div className={styles.adBusiness}>{logo?<Image src={logo} alt="" width={28} height={28} unoptimized/>:<span>{businessName.slice(0,1)}</span>}<div><b>{businessName}</b><small title={destination.display}>{destination.display}</small></div></div>{destination.href?<a className={styles.adTitle} href={destination.href} target="_blank" rel="noopener noreferrer">{titles.join(' - ')||'No search headlines available'}</a>:<p className={styles.adTitle}>{titles.join(' - ')||'No search headlines available'}</p>}<p>{descriptions.join(' ')||'No search descriptions available.'}</p>{links.length>0&&<div className={styles.sitelinks}>{links.map(asset=>{const url=previewDestination(asset.finalUrls?.[0]).href;return url?<a key={asset.id} href={url} target="_blank" rel="noopener noreferrer">{asset.sitelinkAsset?.linkText}</a>:<span key={asset.id}>{asset.sitelinkAsset?.linkText}</span>;})}</div>}</div></div><NovaButton variant="outline" className={styles.fullCopy} aria-expanded={expanded} aria-controls={`ad-copy-${ad.id}-${variant}`} onClick={()=>setExpanded(!expanded)}>{expanded?(language==='zh'?'收起完整广告文案':'Hide full ad copy'):(language==='zh'?'查看完整广告文案':'View full ad copy')}</NovaButton>{expanded&&<div id={`ad-copy-${ad.id}-${variant}`} className={styles.copy}><h4>Headlines</h4><ul>{rsa?.headlines?.map((item,index)=><li key={index}>{item.text}{item.pinnedField&&<small> {item.pinnedField}</small>}</li>)}</ul><h4>Descriptions</h4><ul>{rsa?.descriptions?.map((item,index)=><li key={index}>{item.text}</li>)}</ul>{ad.finalUrls?.map(raw=>{const url=previewDestination(raw).href;return url?<a key={raw} href={url} target="_blank" rel="noopener noreferrer">{url}</a>:null;})}</div>}</NovaCard>;
}
