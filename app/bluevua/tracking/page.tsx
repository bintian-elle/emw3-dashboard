import Link from 'next/link';
import {Suspense} from 'react';
import {DeviceBreakdown} from './device-breakdown';
import {TrackingDisclosure} from './tracking-disclosure';
import {TrackingStats} from './tracking-stats';
import {Card,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {trackingPeriod,trackingDeviceLabel,trackingFilter,type TrackingReport} from '@/lib/website-tracking';
import {getWebsiteTracking} from '@/lib/website-tracking-api';
import {getTrackingPage} from '@/lib/website-tracking-page-api';
import {trackingPageScope} from '@/lib/website-tracking-pages';
import {TrackingCacheStatus} from './cache-status';
import {TrackingFilters} from './tracking-filters';
import {PageEffects,AllSiteEvents} from './page-effects';
import {SiteOutcomes} from './site-outcomes';
import {TrackingReportTable} from './tracking-report';
export const metadata={title:'Website Tracking · Bluevua'};
const empty:TrackingReport={rows:[],warnings:[],error:'Loading report…'};
export default function TrackingPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 return <Suspense fallback={<div className="p-8 text-body-regular text-text-secondary">Loading website tracking…</div>}><TrackingContent searchParams={searchParams}/></Suspense>;
}
async function TrackingContent({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,value=(key:string)=>typeof query[key]==='string'?query[key] as string:undefined;
 let period=trackingPeriod({}),device=value('device')??'all',scope=trackingPageScope(),validation:string|undefined;
 try{period=trackingPeriod({start:value('start'),end:value('end')});trackingFilter(device);scope=trackingPageScope(value('page'),value('path'));}catch(error){validation=error instanceof Error?error.message:'Invalid filters.';device='all';}
 const results=!validation?await Promise.allSettled([getWebsiteTracking(period,device),getTrackingPage(period,device,scope)]):undefined;
 const general=results?.[0].status==='fulfilled'?results[0].value:undefined,page=results?.[1].status==='fulfilled'?results[1].value:undefined;
 const connectionError=results?.some(result=>result.status==='rejected')?'Reports are temporarily unavailable. Please try again later.':undefined;
 const data=general?.data,pageData=page?.data,overall=data?.overview??empty,scopeLabel=trackingDeviceLabel(device);
 const values=[0,1,2,3].map(index=>overall.error?'—':(overall.rows[0]?.metrics[index]??0).toLocaleString('en-US'));
 const siteVisitors=overall.error?null:overall.rows[0]?.metrics[0]??0;
 const paths=(pageData?.paths.rows??[]).map(row=>row.dimensions[0]).filter(path=>{try{return !!trackingPageScope(scope.page,path);}catch{return false;}});
 const fetchedAt=pageData?.fetchedAt??data?.fetchedAt;
 return <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto flex max-w-7xl flex-col gap-6">
 <header id="overview"><p className="text-caption-1-semibold text-text-tertiary"><Link href="/bluevua">Bluevua</Link> / Website tracking</p><h1 className="mt-2 text-title-1-semibold text-text-primary">Website Tracking</h1><p className="mt-2 text-body-regular text-text-secondary">See what visitors do on each page.</p><p className="mt-3 text-body-2-regular text-text-secondary">Tracked website: <a href="https://bluevua.com/" target="_blank" rel="noopener noreferrer" className="rounded-sm text-body-2-medium text-text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">bluevua.com</a> · Includes www.bluevua.com</p><div className="mt-5"><TrackingFilters period={period} device={device} scope={scope} paths={paths}/></div><p className="mt-3 text-caption-1-regular text-text-tertiary">{period.start} – {period.end} · {pageData?.timeZone??data?.timeZone??'America/Juneau'}{fetchedAt?` · Retrieved ${new Date(fetchedAt).toLocaleString('en-US',{timeZone:'America/Chicago'})} CT`:''}</p></header>
 {!validation&&<TrackingCacheStatus key={`${period.start}:${period.end}:${device}:${scope.page}:${scope.path}`} refreshing={!!(general?.refreshing||page?.refreshing)} capturedAt={pageData?.fetchedAt} error={connectionError??page?.error}/>}
 {(validation||connectionError)&&<Card className="rounded-3xl"><CardHeader><CardTitle>{validation?'Check reporting filters':'Tracking data unavailable'}</CardTitle><CardDescription>{validation??connectionError}</CardDescription></CardHeader></Card>}
 <PageEffects scope={scope} data={pageData} period={period} deviceLabel={scopeLabel}/>
 <section id="site-overview" aria-label="Overall activity" className="scroll-mt-6 space-y-4 border-t border-separator-border pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-title-2-medium text-text-primary">Website totals</h2><p className="mt-1 text-body-2-regular text-text-secondary">All page types · {scopeLabel}</p></div></div><TrackingStats kind="overall" values={values}/></section>
 {device==='all'&&<DeviceBreakdown report={data?.devices??empty}/>}
 <SiteOutcomes data={data} visitors={siteVisitors}/>
 <AllSiteEvents report={data?.events} visitors={siteVisitors}/>
 <TrackingReportTable scopeLabel={`All page types · ${scopeLabel}`} id="source-actions" title="Feature action details" columns={['Event','Feature source','Action','Result','Entry point','Events','Users']} report={data?.actions??empty}/>
 <TrackingReportTable scopeLabel={`All page types · ${scopeLabel}`} id="lists" title="Product recommendation details" columns={['Item list ID','Product','Items viewed in list','Items clicked in list','Items added to cart']} report={data?.lists??empty}/>
 <TrackingReportTable scopeLabel={`All page types · ${scopeLabel}`} id="purchases" title="Purchase source details" emptyMessage="No purchase-source records for this period and device." columns={['Item list ID','Product','Items purchased',data?.currency?`Item revenue (${data.currency})`:'Item revenue']} report={data?.purchases??empty} currency={data?.currency}/>
 <TrackingDisclosure id="definitions" title="Metric definitions & statistical rules" detailLabel="definitions"><div className="space-y-3 text-body-regular text-text-secondary"><p><strong>Visitors and percentages.</strong> Page visitors are distinct users with a page_view in the same page, period and device scope. Cart visitor shares use distinct view_cart users. Daily charts query daily users; period users are queried independently. Visitor counts cannot be added across rows or pages. Shares overlap and do not add to 100%.</p><p><strong>Events and quantities.</strong> Events count occurrences, including repeats. Item reports count product units. Add-to-cart records can include direct-button triggers and derived events, so they are not labelled confirmed operation success. Success, error, not applicable and unverified results remain separate.</p><p><strong>Scope.</strong> Page reports include events recorded with that page path, including a cart opened there. Product feature shares use their exact source/action/result tuple. Website totals and source-attributed quantities below cover all page types, with the same date/device filter.</p><p><strong>Conversions.</strong> These event totals are not a matched sequential user funnel or proof of incremental lift. Coupon purchases are website-wide order context. A missing GA4 purchase record is not evidence that the store had no orders.</p><p><strong>Existing general events.</strong> Scroll measures the configured 90% threshold; click means outbound links. Video events apply to supported embedded YouTube players. An em dash means unavailable or an undefined denominator; zero means no matching record in a complete report.</p></div></TrackingDisclosure>
 </div></main>;
}
