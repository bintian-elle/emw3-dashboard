import Link from 'next/link';
import { Suspense } from 'react';
import { DeviceBreakdown } from './device-breakdown';
import { TrackingDisclosure } from './tracking-disclosure';
import { TrackingStats } from './tracking-stats';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { trackingPeriod, trackingDeviceLabel, trackingFilter, trackingFeatures, type TrackingReport } from '@/lib/website-tracking';
import { getWebsiteTracking, type TrackingData } from '@/lib/website-tracking-api';
import { TrackingCacheStatus } from './cache-status';
import type { TrackingCacheState } from '@/lib/website-tracking-cache';
import { TrackingFilters } from './tracking-filters';
import { TrackingReportTable } from './tracking-report';
export const metadata={title:'Website Tracking · Bluevua'};
const empty:TrackingReport={rows:[],warnings:[],error:'This report is being prepared in the background.'};
export default function TrackingPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 return <Suspense fallback={<div className="p-8 text-body-regular text-text-secondary">Loading website tracking…</div>}><TrackingContent searchParams={searchParams}/></Suspense>;
}
async function TrackingContent({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;
 const value=(key:string)=>typeof query[key]==='string'?query[key] as string:undefined;
 let period=trackingPeriod({}),device=value('device')??'all',validation:string|undefined;
 try{period=trackingPeriod({start:value('start'),end:value('end')});trackingFilter(device);}catch(error){validation=error instanceof Error?error.message:'Invalid filters.';device='all';}
 let data:TrackingData|undefined,connectionError:string|undefined,cache:TrackingCacheState|undefined;
 if(!validation)try{cache=await getWebsiteTracking(period,device);data=cache.data;}catch(error){connectionError=error instanceof Error?error.message:'Tracking data is temporarily unavailable.';}
 const unavailable:TrackingReport={...empty,error:cache?.error??connectionError??empty.error};
 const events=data?.events??unavailable;
 const scopeLabel=trackingDeviceLabel(device);
 const overall=data?.overview??unavailable;
 const overallValues=[0,1,2,3].map(index=>overall.error?"—":(overall.rows[0]?.metrics[index]??0).toLocaleString("en-US"));
 const metric=(event:string,index=0)=>events.error?'—':String(events.rows.find(row=>row.dimensions[0]===event)?.metrics[index]?.toLocaleString('en-US')??'0');
 return <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto flex max-w-7xl flex-col gap-6">
 <header id="overview"><p className="text-caption-1-semibold text-text-tertiary"><Link href="/bluevua">Bluevua</Link> / Website tracking</p><h1 className="mt-2 text-title-1-semibold text-text-primary">Website Tracking</h1><p className="mt-2 text-body-regular text-text-secondary">See which website features get used, where actions fail, and which product sources lead to purchases.</p><p className="mt-3 text-body-regular text-text-secondary">Tracked website: <a href="https://bluevua.com/" target="_blank" rel="noopener noreferrer" aria-label="Visit bluevua.com (opens in a new tab)" className="rounded-sm text-body-medium text-text-primary underline underline-offset-4 outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring">bluevua.com</a><span className="text-body-2-regular text-text-tertiary"> · Includes www.bluevua.com</span></p><div className="mt-5"><TrackingFilters period={period} device={device}/></div><p className="mt-3 text-caption-1-regular text-text-tertiary">{period.start} – {period.end} · {data?.timeZone??'GA4 property time zone'}{data?.fetchedAt?` · Retrieved ${new Date(data.fetchedAt).toLocaleString('en-US',{timeZone:'America/Chicago'})} CT`:''}</p></header>
 {!validation&&!connectionError&&cache&&<TrackingCacheStatus key={`${period.start}:${period.end}:${device}`} refreshing={cache.refreshing} stale={cache.stale} capturedAt={data?.fetchedAt} error={cache.error}/>}
 {(validation||connectionError)&&<Card className="rounded-3xl"><CardHeader><CardTitle>{validation?'Check reporting filters':'Tracking data unavailable'}</CardTitle><CardDescription>{validation??connectionError}</CardDescription></CardHeader><CardContent className="mt-4"><p className="text-body-regular text-text-secondary">Reports will populate after the connection is available. No sample data is displayed.</p></CardContent></Card>}
 <section aria-label="Overall activity" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-title-3-semibold text-text-primary">Overall activity</h2><span className="text-body-2-medium text-text-secondary">{scopeLabel}</span></div><TrackingStats kind="overall" values={overallValues}/>{overall.error&&<p role="status" className="text-body-regular text-text-secondary">{overall.error}</p>}{overall.warnings.map(warning=><p key={warning} role="status" className="text-caption-1-regular text-text-secondary">{warning}</p>)}</section>
 {device==='all'&&<DeviceBreakdown report={data?.devices??unavailable}/>}
 <Card className="rounded-3xl"><CardHeader><CardTitle>Feature coverage</CardTitle><CardDescription>Track the five website features confirmed in the latest implementation notes.</CardDescription></CardHeader><CardContent className="mt-4 flex flex-wrap gap-2">{trackingFeatures.map(feature=><span key={feature} className="rounded-full bg-background-secondary-default px-3 py-2 text-body-2-medium text-text-secondary">{feature}</span>)}</CardContent></Card>
 <TrackingReportTable scopeLabel={scopeLabel} id="actions" title="Feature actions & outcomes" description="Submitted actions and returned results are separate events. Source, action, result and entry point retain the exact GA4 values; a result event does not necessarily mean success." columns={['Event','Feature source','Action','Result','Entry point','Events','Users']} report={data?.actions??unavailable}/>
 <TrackingReportTable scopeLabel={scopeLabel} id="lists" title="Recommendation activity" description="Item-list exposure, product clicks and add-to-cart quantities by source. Item quantities are not distinct users or event counts." columns={['Item list ID','Product','Items viewed in list','Items clicked in list','Items added to cart']} report={data?.lists??unavailable}/>
 <section aria-label="Compare and feature activity" className="space-y-4"><h2 className="text-title-3-semibold text-text-primary">Compare & feature activity</h2><TrackingStats values={[metric('compare_entry_view'),metric('compare_click'),metric('compare_view',1),metric('cart_feature_result')]}/></section>
 <TrackingReportTable scopeLabel={scopeLabel} id="compare" title="Compare & event overview" description="Period-level counts and distinct users per event. Compare clicks can include different entrances; these totals are not a sequential user funnel. view_item_list and select_item include other site lists." columns={['Event','Events','Users']} report={events}/>
 <TrackingReportTable scopeLabel={scopeLabel} id="purchases" emptyMessage="No purchase-source attribution rows returned for this period and device. This does not mean the website had no orders." title="Purchases by product source" description="GA4 item-list attribution, including Cart recommendations, PDP Add-ons and Compare when recorded. Attribution does not establish incremental lift. Unset sources remain visible." columns={['Item list ID','Product','Items purchased',data?.currency?`Item revenue (${data.currency})`:'Item revenue (property currency)']} report={data?.purchases??unavailable} currency={data?.currency}/>
 <TrackingDisclosure id="definitions" title="Metric definitions & statistical rules" detailLabel="definitions"><div className="space-y-3 text-body-regular text-text-secondary"><p><strong>Events</strong> count occurrences, including repeated actions by the same user. Overall Events includes all production-site events; feature tables list their named events.</p><p><strong>Users</strong> counts distinct users reported by GA4 within the selected period and query. The same user can appear in multiple feature, event or device rows, so Users cannot be added across rows. All devices Unique Users is queried independently without a device breakdown.</p><p><strong>Quantity</strong> counts product units viewed, clicked, added to cart or purchased. Adding three units can be one add-to-cart event with a quantity of three. The overall Add to Cart and Purchases cards count events, not product units.</p><p><strong>Success Rate</strong> requires a matched set of submissions and confirmed outcomes for the same operation and scope. Result events can be repeated, delayed or unverified; dividing aggregate result counts by action counts does not establish a valid success rate.</p></div></TrackingDisclosure>

 </div></main>;
}
