import {projectReadiness} from './ai-dashboard-overview.ts';
import {materializeReport,type ReportSpec,type Query} from './ai-dashboard.ts';
import {defaultDashboardRange} from './ai-dashboard-periods.ts';
import {dashboardProject,runWithDashboardProject} from './ai-dashboard-project.ts';
import type {ProjectId} from './ai-dashboard-options.ts';
export async function loadDashboardPreview(project:ProjectId=dashboardProject(),range=defaultDashboardRange()){return runWithDashboardProject(project,async()=>{
 const DEFAULT_RANGE=range;
 const spec:ReportSpec={title:'Bluevua · All-channel overview',summary:`Last completed Tuesday–Monday week, ${range.start} through ${range.end}. Marketing attribution and store revenue are separate. Missing sources and comparison baselines remain unavailable.`,range:DEFAULT_RANGE,widgets:[
 {id:'overview-paid-spend',title:'Paid spend',kind:'metric',source:'paid_media',groupBy:'overview',metrics:['spend']},
 {id:'overview-store-sales',title:'Store revenue',kind:'metric',source:'store',groupBy:'overview',metrics:['revenue']},
 {id:'overview-store-orders',title:'Store orders',kind:'metric',source:'store',groupBy:'overview',metrics:['conversions']},
 {id:'overview-edm-revenue',title:'EDM attributed revenue',kind:'metric',source:'edm',groupBy:'overview',metrics:['revenue']},
 {id:'overview-paid-trend',title:'Daily paid spend',kind:'line',source:'paid_media',groupBy:'day',metrics:['spend']},
 {id:'overview-store-trend',title:'Daily store revenue',kind:'line',source:'store',groupBy:'day',metrics:['revenue']},
 {id:'overview-channels',title:'Paid channels · PoP & YoY spend comparison',kind:'table',source:'paid_media',groupBy:'channel',metrics:['spend','spend_pop','spend_yoy','revenue','roas','conversions']},
 {id:'overview-channel-roas',title:'Platform-attributed ROAS by channel',kind:'bar',source:'paid_media',groupBy:'channel',metrics:['roas']},
 {id:'overview-edm-trend',title:'Daily EDM attributed revenue',kind:'line',source:'edm',groupBy:'day',metrics:['revenue']},
 {id:'overview-edm-channels',title:'Email & SMS · PoP & YoY revenue comparison',kind:'table',source:'edm',groupBy:'channel',metrics:['revenue','revenue_pop','revenue_yoy','conversions','delivered','clicks']},
 ]};
 if(project==='biceek'){spec.title='Biceek · Marketing overview';spec.widgets=[
 {id:'biceek-paid-spend',title:'Paid spend',kind:'metric',source:'paid_media',groupBy:'overview',metrics:['spend']},
 {id:'biceek-store-revenue',title:'Store revenue',kind:'metric',source:'store',groupBy:'overview',metrics:['revenue']},
 {id:'biceek-store-orders',title:'Store orders',kind:'metric',source:'store',groupBy:'overview',metrics:['conversions']},
 {id:'biceek-edm-revenue',title:'EDM attributed revenue',kind:'metric',source:'edm',groupBy:'overview',metrics:['revenue']},
 {id:'biceek-paid-trend',title:'Daily paid spend',kind:'line',source:'paid_media',groupBy:'day',metrics:['spend']},
 {id:'biceek-store-trend',title:'Daily store revenue',kind:'line',source:'store',groupBy:'day',metrics:['revenue']},
 {id:'biceek-channels',title:'Paid channel performance',kind:'table',source:'paid_media',groupBy:'channel',metrics:['spend','spend_pop','spend_yoy','revenue','roas','conversions']},
 {id:'biceek-site-traffic',title:'Website sessions',kind:'line',source:'ga4',groupBy:'day',metrics:['sessions']},
 {id:'biceek-edm-channels',title:'Email & SMS attributed revenue',kind:'bar',source:'edm',groupBy:'channel',metrics:['revenue']},
 ];const ready=await projectReadiness(project,range);if(!ready.sources.some(s=>s==='google_ads'||s==='meta_ads')){spec.widgets=spec.widgets.filter(w=>w.source!=='paid_media');spec.widgets.unshift({id:'biceek-sessions',title:'Website sessions',kind:'metric',source:'ga4',groupBy:'overview',metrics:['sessions']});}}
 if(project==='ringconn'){spec.title='RingConn · Website overview';spec.widgets=[
 {id:'ringconn-revenue',title:'GA4 purchase revenue',kind:'metric',source:'ga4',groupBy:'overview',metrics:['revenue']},
 {id:'ringconn-purchases',title:'GA4 purchases',kind:'metric',source:'ga4',groupBy:'overview',metrics:['conversions']},
 {id:'ringconn-sessions',title:'Website sessions',kind:'metric',source:'ga4',groupBy:'overview',metrics:['sessions']},
 {id:'ringconn-traffic-trend',title:'Daily website sessions',kind:'line',source:'ga4',groupBy:'day',metrics:['sessions']},
 {id:'ringconn-revenue-trend',title:'Daily GA4 purchase revenue',kind:'line',source:'ga4',groupBy:'day',metrics:['revenue']},
 {id:'ringconn-purchases-trend',title:'Daily GA4 purchases',kind:'line',source:'ga4',groupBy:'day',metrics:['conversions']},
 {id:'ringconn-daily',title:'Website performance by day',kind:'table',source:'ga4',groupBy:'day',metrics:['sessions','conversions','revenue']},
 ];spec.summary=`RingConn main website ${range.start} through ${range.end}, filtered to ringconn.com and www.ringconn.com. Revenue and purchases use GA4 attribution; advertising and Shopify sources are not connected.`;}
 const queries:Query[]=spec.widgets.map(w=>({source:w.source,groupBy:w.groupBy,...DEFAULT_RANGE}));return materializeReport(spec,queries);
});}
