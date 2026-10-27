import {AsyncLocalStorage} from 'node:async_hooks';
import path from 'node:path';
import {PROJECTS,type ProjectId} from './ai-dashboard-options.ts';
const context=new AsyncLocalStorage<ProjectId>();
export function validateDashboardProject(value:unknown):ProjectId{if(!PROJECTS.some(p=>p.id===value))throw Error('Unknown project.');return value as ProjectId;}
export function dashboardProject():ProjectId{return context.getStore()||validateDashboardProject(process.env.AI_DASHBOARD_PROJECT||'bluevua');}
export function runWithDashboardProject<T>(project:unknown,work:()=>T):T{return context.run(validateDashboardProject(project),work);}
export const PROJECT_SOURCES:Record<ProjectId,readonly string[]>={bluevua:['google_ads','meta_ads','tiktok_ads','microsoft_ads','reddit_ads','chatgpt_ads','edm','store','paid_media'],biceek:['google_ads','meta_ads','ga4','store','edm','paid_media'],ringconn:['ga4']};
export function assertProjectSource(source:string){if(!PROJECT_SOURCES[dashboardProject()].includes(source))throw Error(`${source} is not connected for ${dashboardProject()}.`);}
export function projectOverviewDirectory(project=dashboardProject()){return path.join(process.env.AI_DASHBOARD_PROJECTS_DIR||path.join(process.cwd(),'.state/ai-dashboard/projects'),project,'overview');}

export const PROJECT_ACCOUNT_REFS:Partial<Record<ProjectId,Record<string,string>>>={biceek:{ga4:'ga4.biceek',google_ads:'google-ads.biceek',meta_ads:'meta-ads.biceek',store:'shopify.biceek',edm:'klaviyo.biceek'},ringconn:{ga4:'ga4.ringconn'}};
