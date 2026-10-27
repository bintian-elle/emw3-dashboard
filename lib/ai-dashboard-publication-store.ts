import {readFile} from 'node:fs/promises';
import {validateDashboardProject} from './ai-dashboard-project.ts';
import type {ProjectId} from './ai-dashboard-options.ts';
import type {PublishedOverview} from './ai-dashboard-published.ts';
export type PublicationSqlResult={rows:Array<Record<string,unknown>>;rowCount?:number|null};
export type PublicationSqlClient={query:(sql:string,values?:unknown[])=>Promise<PublicationSqlResult>;release:()=>void};
export type PublicationClientFactory=()=>Promise<PublicationSqlClient>;
export function publicationStoreMode(){const mode=process.env.AI_DASHBOARD_PUBLICATION_STORE||'files';if(mode!=='files'&&mode!=='postgres')throw Error('Unknown overview publication store.');return mode;}
export function publicationTlsOptions(connectionString:string,ca?:string){let url:URL;try{url=new URL(connectionString);}catch{throw Error('Overview publication database must use a PostgreSQL URL.');}if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Overview publication database must use a PostgreSQL URL.');if(url.searchParams.has('sslcert')||url.searchParams.has('sslkey'))throw Error('Client-certificate URLs require explicit publication TLS configuration.');if(url.searchParams.has('sslrootcert')&&!ca)throw Error('Use AI_DASHBOARD_PUBLICATION_DATABASE_CA_FILE for the publication trust root.');for(const key of ['ssl','sslmode','sslrootcert','sslnegotiation'])url.searchParams.delete(key);return{connectionString:url.toString(),ssl:{rejectUnauthorized:true as const,...ca?{ca}:{}}};}
let databasePool:import('pg').Pool|undefined;
export const publicationDatabaseClient:PublicationClientFactory=async()=>{
 const connectionString=(process.env.AI_DASHBOARD_PUBLICATION_DATABASE_URL||process.env.KLAVIYO_DATABASE_URL)?.trim();if(!connectionString)throw Error('Overview publication database connection is not configured.');
 if(!databasePool){const caFile=process.env.AI_DASHBOARD_PUBLICATION_DATABASE_CA_FILE?.trim();const ca=caFile?await readFile(caFile,'utf8'):undefined;if(caFile&&!ca?.trim())throw Error('Publication database CA file is empty.');const {Pool}=await import('pg');databasePool=new Pool({...publicationTlsOptions(connectionString,ca),max:4,idleTimeoutMillis:30000,connectionTimeoutMillis:12000});}
 const client=await databasePool.connect();return{query:async(sql,values)=>{const result=await client.query(sql,values);return{rows:result.rows,rowCount:result.rowCount};},release:()=>client.release()};
};
export async function closePublicationDatabase(){if(databasePool){const pool=databasePool;databasePool=undefined;await pool.end();}}
export async function upsertPublicationInTransaction(client:PublicationSqlClient,snapshot:PublishedOverview){validateDashboardProject(snapshot.project);const result=await client.query(`insert into public.dashboard_overview_publications(project,range_start,range_end,payload,generated_at)
 values($1,$2::date,$3::date,$4::jsonb,$5::timestamptz)
 on conflict(project) do update set range_start=excluded.range_start,range_end=excluded.range_end,payload=excluded.payload,generated_at=excluded.generated_at
 where dashboard_overview_publications.range_end<excluded.range_end
 or (dashboard_overview_publications.range_end=excluded.range_end and dashboard_overview_publications.range_start=excluded.range_start and dashboard_overview_publications.generated_at<=excluded.generated_at)
 returning project`,[snapshot.project,snapshot.range.start,snapshot.range.end,JSON.stringify(snapshot),snapshot.generatedAt]);if(result.rowCount!==1)throw Error('A newer overview is already published; stale replacement rejected.');}
export function createPostgresPublicationStore(connect:PublicationClientFactory=publicationDatabaseClient){return{
 async read(project:ProjectId):Promise<unknown|null>{validateDashboardProject(project);const client=await connect();try{const result=await client.query('select payload from public.dashboard_overview_publications where project=$1 limit 1',[project]);const raw=result.rows[0]?.payload;if(raw==null)return null;const value=typeof raw==='string'?JSON.parse(raw):raw;if(!value||typeof value!=='object'||(value as {project?:unknown}).project!==project)throw Error('Published database row belongs to another project.');return value;}finally{client.release();}},
 async write(snapshot:PublishedOverview){validateDashboardProject(snapshot.project);const client=await connect();try{await client.query('begin');await upsertPublicationInTransaction(client,snapshot);await client.query('commit');}catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}}
};}
