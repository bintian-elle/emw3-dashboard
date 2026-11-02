'use client';
import {createContext,useContext,useMemo,useState,type ReactNode,type ComponentProps,Children} from 'react';
import {HoverCard,Popover} from 'radix-ui';
import Image from 'next/image';
import {ExternalLink} from 'lucide-react';
import {Streamdown} from 'streamdown';
import {cjk} from '@streamdown/cjk';
import {code} from '@streamdown/code';
import {math} from '@streamdown/math';
import {mermaid} from '@streamdown/mermaid';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {splitInsightAssetText,type InsightAsset} from '@/lib/testing-insight-assets';
import styles from './insight-assets.module.css';
const Context=createContext<readonly InsightAsset[]>([]);
export function InsightAssetsProvider({assets,children}:{assets:InsightAsset[];children:ReactNode}){return <Context.Provider value={assets}>{children}</Context.Provider>;}
export function InsightAssetReference({asset}:{asset:InsightAsset}){
 const {language}=useSiteLanguage(),zh=language==='zh';const [failed,setFailed]=useState(false),[hovered,setHovered]=useState(false),[expanded,setExpanded]=useState(false);
 const name=asset.channel==='unknown'?(zh?'素材信息待补全':'Creative · details pending'):asset.name;
 const content=<><strong>{name}</strong>{asset.image&&!failed&&<Image unoptimized src={asset.image} alt={asset.name} width={296} height={180} onError={()=>setFailed(true)}/>}<small>{asset.kind} · ID: {asset.id}</small>{asset.description&&<p>{asset.description}</p>}{asset.url?<a href={asset.url} target="_blank" rel="noopener noreferrer">{zh?'打开素材 / 原帖':'Open creative / original post'}<ExternalLink aria-hidden="true"/></a>:<small>{zh?'暂无可用预览链接':'Preview link unavailable'}</small>}</>;
 return <Popover.Root open={expanded} onOpenChange={value=>{setExpanded(value);setHovered(false);}}><HoverCard.Root open={hovered&&!expanded} onOpenChange={setHovered} openDelay={250} closeDelay={150}><HoverCard.Trigger asChild><Popover.Trigger asChild><button className={styles.trigger} type="button">{name}</button></Popover.Trigger></HoverCard.Trigger><HoverCard.Portal><HoverCard.Content sideOffset={6} collisionPadding={16} className={styles.preview}>{content}</HoverCard.Content></HoverCard.Portal></HoverCard.Root><Popover.Portal><Popover.Content sideOffset={6} collisionPadding={16} className={styles.preview}>{content}</Popover.Content></Popover.Portal></Popover.Root>;
}
export function InsightText({children,channel}:{children:ReactNode;channel?:string}){
 const all=useContext(Context),assets=useMemo(()=>channel&&channel!=='overview'?all.filter(asset=>asset.channel===channel||(channel.startsWith('reddit')&&asset.channel==='reddit')):all,[all,channel]);
 return <>{Children.map(children,child=>typeof child==='string'?splitInsightAssetText(child,assets).map((part,index)=>typeof part==='string'?part:<InsightAssetReference key={`${part.channel}:${part.id}:${index}`} asset={part}/>):child)}</>;
}
export function InsightAssetLink({href,children,...props}:ComponentProps<'a'>){
 const assets=useContext(Context),label=Children.toArray(children).filter(child=>typeof child==='string').join('');
 const matches=assets.filter(asset=>asset.url===href&&(asset.name===label||asset.aliases?.includes(label)||asset.id===label));
 if(matches.length===1)return <InsightAssetReference asset={matches[0]}/>;
 if(href&&(/^(https?:\/\/)/.test(href)||href.startsWith('/bluevua/testing')))return <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
 return <span>{children}</span>;
}
const plugins={cjk,code,math,mermaid};
/** Only leaf text is enriched; links and code blocks retain their original semantics. */
export function InsightMarkdown({children,channel}:{children:string;channel?:string}){
 const components=useMemo(()=>({
  a:InsightAssetLink,
  p:({children,...props}:ComponentProps<'p'>)=><p {...props}><InsightText channel={channel}>{children}</InsightText></p>,
  li:({children,...props}:ComponentProps<'li'>)=><li {...props}><InsightText channel={channel}>{children}</InsightText></li>,
  td:({children,...props}:ComponentProps<'td'>)=><td {...props}><InsightText channel={channel}>{children}</InsightText></td>,
  strong:({children,...props}:ComponentProps<'strong'>)=><strong {...props}><InsightText channel={channel}>{children}</InsightText></strong>,
  em:({children,...props}:ComponentProps<'em'>)=><em {...props}><InsightText channel={channel}>{children}</InsightText></em>,
  code:({children,...props}:ComponentProps<'code'>)=>typeof children==='string'&&/^\d{10,}$/.test(children)?<InsightText channel={channel}>{children}</InsightText>:<code {...props}><InsightText channel={channel}>{children}</InsightText></code>,
 }),[channel]);
 return <Streamdown components={components} plugins={plugins} isAnimating={false} controls={{table:false}} tableMaxHeight={0}>{children}</Streamdown>;
}
