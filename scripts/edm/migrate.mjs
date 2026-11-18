import nextEnv from '@next/env';
import pg from 'pg';
import {edmDatabaseConfig} from '../../lib/edm-database.mjs';
nextEnv.loadEnvConfig(process.cwd());
const tables=['dim_campaign','dim_campaign_message','dim_flow','dim_flow_message','dim_email_template','dim_creative_asset','dim_email_creative','fact_campaign_daily','fact_campaign_link_daily','fact_campaign_performance','fact_flow_daily','fact_metric_daily','fact_email_link_daily','fact_subscriber_daily','ai_insight_cache'];
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const targetConfig=edmDatabaseConfig();
if(!process.env.EDM_DATABASE_URL||targetConfig.ssl!==false)throw Error('Migration requires an explicit host-local EDM database.');
if(targetConfig.connectionString===process.env.KLAVIYO_DATABASE_URL)throw Error('Source and target must differ.');
const source=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,statement_timeout:60000});
const target=new pg.Client({...targetConfig,connectionTimeoutMillis:15000,statement_timeout:60000});
try{
 await source.connect();await target.connect();await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 for(const table of tables){
  const columns=(await source.query(`select a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull required,pg_get_expr(d.adbin,d.adrelid) expression from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='public' and c.relname=$1 and a.attnum>0 and not a.attisdropped order by a.attnum`,[table])).rows;
  if(!columns.length)throw Error(`Missing required source table: ${table}`);
  const constraints=(await source.query(`select pg_get_constraintdef(oid) definition from pg_constraint where conrelid=$1::regclass and contype in ('p','u')`,[`public.${table}`])).rows;
  await target.query('BEGIN');
  try{
   // No remote functions, policies or credentials are copied; only warehouse columns and keys.
   const defs=columns.map(c=>`${quote(c.name)} ${c.type}${c.required?' NOT NULL':''}${c.expression&&!c.expression.includes('nextval(')?' DEFAULT '+c.expression:''}`);
   await target.query(`CREATE TABLE IF NOT EXISTS ${quote(table)} (${[...defs,...constraints.map(c=>c.definition)].join(',')})`);
   let offset=0;
   const keys=(await source.query(`select a.attname name from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid=$1::regclass and i.indisprimary order by a.attnum`,[`public.${table}`])).rows.map(r=>quote(r.name));
   const indexes=(await source.query(`select pg_get_indexdef(indexrelid) definition from pg_index where indrelid=$1::regclass and indisunique and not indisprimary`,[`public.${table}`])).rows;
   for(const index of indexes)await target.query(index.definition.replace('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS '));
   if(!keys.length)keys.push(...columns.map(c=>quote(c.name)));
   while(true){
    const batch=(await source.query(`select row_to_json(t)::text document from ${quote(table)} t order by ${keys.join(',')} limit 2000 offset $1`,[offset])).rows;
    if(!batch.length)break;
    await target.query(`INSERT INTO ${quote(table)} SELECT * FROM json_populate_recordset(NULL::${quote(table)},$1::json) ON CONFLICT DO NOTHING`,['['+batch.map(r=>r.document).join(',')+']']);
    offset+=batch.length;
   }
   const sourceCount=(await source.query(`SELECT count(*)::text count FROM ${quote(table)}`)).rows[0].count;
   const targetCount=(await target.query(`SELECT count(*)::text count FROM ${quote(table)}`)).rows[0].count;
   if(BigInt(targetCount)<BigInt(sourceCount))throw Error(`Incomplete table copy: ${table}`);
   await target.query('COMMIT');console.log(JSON.stringify({table,sourceRows:sourceCount,targetRows:targetCount}));
  }catch(error){await target.query('ROLLBACK');throw error;}
 }
 await source.query('ROLLBACK');
}finally{await source.end().catch(()=>{});await target.end().catch(()=>{});}
