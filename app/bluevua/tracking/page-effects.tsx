'use client';
import {ReportStats} from './report-stats';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Table,TableHeader,TableColumn,TableBody,TableRow,TableCell} from '@/components/base/table/table';
import {TrackingTrend} from './tracking-trend';
import {featureDefinitions,featureInventory} from '@/lib/website-tracking-inventory';
import {eventLabel,pageDefinition,pageEventValue,pageFeatureValue,pageVisitorRate,pageDailySeries,pageEventNames,trackingEventDefinitions,usablePageReport,type TrackingPageData,type TrackingPageScope} from '@/lib/website-tracking-pages';
import type {TrackingPeriod,TrackingReport} from '@/lib/website-tracking';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {pageNamesZh} from './labels';
export const trackingNumber=(value:number|null)=>value===null?'—':value.toLocaleString('en-US');
export const trackingPercent=(value:number|null)=>value===null?'—':value>0&&value<0.0001?'<0.01%':`${(value*100).toLocaleString('en-US',{maximumFractionDigits:2})}%`;
function PercentTable({title,rows,denominator,denominatorLabel}:{title:string;rows:Array<{id:string;label:string;event:string;events:number|null;users:number|null}>;denominator:number|null;denominatorLabel:string}){
 return <Table aria-label={title}><TableHeader><TableColumn isRowHeader>Behaviour</TableColumn><TableColumn>Events</TableColumn><TableColumn>Visitors</TableColumn><TableColumn>{denominatorLabel}</TableColumn></TableHeader><TableBody>{rows.map(row=><TableRow id={row.id} key={row.id}><TableCell><span className="block text-body-2-medium text-text-primary">{row.label}</span><span className="block text-caption-1-regular text-text-tertiary">{row.event}</span></TableCell><TableCell>{trackingNumber(row.events)}</TableCell><TableCell>{trackingNumber(row.users)}</TableCell><TableCell>{trackingPercent(pageVisitorRate(row.users,denominator))}</TableCell></TableRow>)}</TableBody></Table>;
}
export function FeatureBehaviours({report,sources,visitors,cart=false}:{report?:TrackingReport;sources:string[];visitors:number|null;cart?:boolean}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 return <div className="space-y-5">{featureDefinitions.filter(feature=>sources.includes(feature.id)).map(feature=>{
 const checks=featureInventory.filter(row=>row.feature===feature.id&&(row.kind==='event'||row.kind==='operation')&&row.page!=='collection');
 const rows=checks.map(check=>({id:check.id,label:check.label,event:check.event,...pageFeatureValue(report,feature.id,check.event,check.action,check.result)}));
 return <Card key={feature.id} id={`feature-${feature.id}`} className="rounded-[10px]"><CardHeader><CardTitle>{feature.name}</CardTitle><CardDescription>{cart?(zh?'占当前页面范围内打开购物车的访客比例。':'Share of visitors who opened the cart in this page scope.'):(zh?'占所选页面或页面类型访客的比例。':'Share of visitors to the selected page or page type.')}</CardDescription></CardHeader><CardContent className="mt-4"><PercentTable title={`${feature.name} behaviour`} rows={rows} denominator={visitors} denominatorLabel={cart?'Share of cart visitors':'Share of page visitors'}/></CardContent></Card>;
 })}</div>;
}
export function PageEffects({scope,data,period,deviceLabel}:{scope:TrackingPageScope;data?:TrackingPageData;period:TrackingPeriod;deviceLabel:string}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const definition=pageDefinition(scope.page),denominatorEvent=scope.page==='cart'?'view_cart':'page_view';
 const visitors=pageEventValue(data?.events,denominatorEvent).users;
 const primary=definition.primary==='select_item'?pageFeatureValue(data?.features,definition.sources[0],definition.primary):pageEventValue(data?.events,definition.primary);
 const exposure=scope.page==='cart'?pageFeatureValue(data?.features,'cart_bundle_upgrade','cart_feature_action','upgrade'):pageEventValue(data?.events,scope.page==='collection'?'compare_entry_view':'scroll');
 const outbound=scope.page==='cart'?pageFeatureValue(data?.features,'promo_code','cart_feature_action','apply'):pageEventValue(data?.events,'click');
 const ratio=pageVisitorRate(primary.users,visitors),daily=pageDailySeries(data?.daily,period,denominatorEvent,definition.primary);
 const stats=[
 {label:scope.page==='cart'?'Cart visitors':'Page visitors',value:trackingNumber(visitors),delta:'Distinct visitors',deltaColor:'neutral' as const},
 {label:scope.page==='collection'?'Collection → Compare click rate':definition.primaryLabel,value:trackingPercent(ratio),delta:`${trackingNumber(primary.users)} visitors`,deltaColor:'neutral' as const},
 {label:scope.page==='cart'?'Submitted a Bundle upgrade':scope.page==='collection'?'Saw the Compare entry':'Reached page bottom',value:trackingPercent(pageVisitorRate(exposure.users,visitors)),delta:`${trackingNumber(exposure.users)} visitors`,deltaColor:'neutral' as const},
 {label:scope.page==='cart'?'Submitted a promo code':'Clicked an outbound link',value:trackingPercent(pageVisitorRate(outbound.users,visitors)),delta:`${trackingNumber(outbound.users)} visitors`,deltaColor:'neutral' as const},
 ];
 const allNames=pageEventNames(data?.events,scope.page==='cart');
 const eventRows=allNames.map(event=>({id:event,label:eventLabel(event),event,...pageEventValue(data?.events,event)}));
 const featureSources=scope.page==='pdp'?['pdp_addons']:scope.page==='compare'?['compare']:[];
 const cartVisitors=pageEventValue(data?.events,'view_cart').users;
 const warning=data?.events.warnings??[];
 return <div className="space-y-6">
 <section id="page-effects" aria-label={zh?'页面表现':'Page performance'} className="scroll-mt-6 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-title-2-medium text-text-primary">{zh?pageNamesZh[scope.page]:definition.label}</h2><p className="mt-1 break-all text-body-2-regular text-text-secondary">{scope.path||(zh?`全部${pageNamesZh[scope.page]}`:`All ${definition.label.toLowerCase()}`)}</p></div><span className="text-body-2-medium text-text-secondary">{deviceLabel}</span></div><ReportStats stats={stats}/>
 <p className="text-body-2-regular text-text-secondary">{trackingNumber(primary.users)} of {trackingNumber(visitors)} {scope.page==='cart'?'cart':'page'} visitors {definition.primaryLabel.toLowerCase()} · {trackingPercent(ratio)}.{scope.page==='collection'?' Clicks from the Compare page are excluded.':''}</p>
 {warning.map(text=><p key={text} className="text-body-2-regular text-text-secondary">{text}</p>)}
 </section>
 {daily&&<section aria-label="Daily page trends" className="grid gap-5 xl:grid-cols-2"><Card className="rounded-[10px]"><CardHeader><CardTitle>Daily visitors</CardTitle></CardHeader><CardContent className="mt-4"><TrackingTrend dates={daily.dates} series={[{name:'Visitors',values:daily.visitors,color:'var(--color-chart-1)'}]}/></CardContent></Card><Card className="rounded-[10px]"><CardHeader><CardTitle>{definition.primaryLabel} · daily share</CardTitle></CardHeader><CardContent className="mt-4"><TrackingTrend dates={daily.dates} valueFormat="percent" series={[{name:definition.primaryLabel,values:daily.rate,color:'var(--color-chart-2)'}]}/></CardContent></Card></section>}
 {featureSources.length>0&&<FeatureBehaviours report={data?.features} sources={featureSources} visitors={visitors}/>}
 <Card id="page-events" className="scroll-mt-6 rounded-[10px]"><CardHeader><CardTitle>{zh?'此页面的全部行为':'All behaviour on this page'}</CardTitle><CardDescription>{zh?'访客占比使用相同的页面、日期和设备范围，数据可能包含在此页面打开的购物车。':'Visitor shares use the same page, dates and device. Rows can include the cart opened on this page.'}</CardDescription></CardHeader><CardContent className="mt-4"><PercentTable title="Page behaviour and visitor shares" rows={eventRows} denominator={visitors} denominatorLabel={scope.page==='cart'?'Share of cart visitors':'Share of page visitors'}/>{!usablePageReport(data?.events)&&<p role="status" className="mt-3 text-body-2-regular text-text-secondary">{data?.events.error?(zh?'页面报告暂不可用。':'Page reports are temporarily unavailable.'):(zh?'正在加载报告…':'Loading reports…')}</p>}</CardContent></Card>
 <section id="cart-drawer" aria-label="Cart drawer behaviour" className="scroll-mt-6 space-y-4"><div><h2 className="text-title-2-medium text-text-primary">Cart drawer</h2><p className="mt-1 text-body-2-regular text-text-secondary">{trackingNumber(cartVisitors)} visitors opened the cart{scope.page==='cart'?'':` from ${scope.path||definition.label.toLowerCase()}`}.</p></div><FeatureBehaviours report={data?.features} sources={['cart_bundle_upgrade','cart_recommendations','promo_code']} visitors={cartVisitors} cart/></section>
 </div>;
}
export function AllSiteEvents({report,visitors}:{report?:TrackingReport;visitors:number|null}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const events=Array.from(new Set([...trackingEventDefinitions.map(row=>row.event),...(report?.rows.map(row=>row.dimensions[0])??[])]));
 const rows=events.map(event=>({id:event,label:eventLabel(event),event,...pageEventValue(report,event)}));
 return <Card id="all-events" className="scroll-mt-6 rounded-[10px]"><CardHeader><CardTitle>{zh?'全部网站事件':'All website events'}</CardTitle><CardDescription>{zh?'全部页面类型 · 27 个已定义事件及其他接收到的事件。':'All page types · 27 existing event definitions and any other received events.'}</CardDescription></CardHeader><CardContent className="mt-4"><PercentTable title="All website events and visitor shares" rows={rows} denominator={visitors} denominatorLabel="Share of site visitors"/></CardContent></Card>;
}
