import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import pg from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {stagingSnapshotFile} from '../../lib/staging-data-snapshots.ts';
loadEnvConfig(process.cwd());
if(process.env.DEPLOYMENT_ENV!=='staging'||!existsSync('.staging-checkout'))throw Error('Only run inside the isolated staging checkout');
const directory=resolve(process.argv[2]||'.state/staging-data-snapshots');
if(!directory.startsWith(process.cwd()+'/.state/'))throw Error('Export must remain inside staging .state');
const url=new URL(process.env.KLAVIYO_DATABASE_URL||'');
if(!decodeURIComponent(url.username).startsWith('emw3_staging_reader'))throw Error('Use the dedicated SELECT-only connection');
const client=new pg.Client({connectionString:url.toString(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:30000});
try{
 await client.connect();
 const result=await client.query('select channel,scope_key,payload,updated_at from testing_data_snapshots order by updated_at asc');
 if(!result.rows.some(row=>row.channel==='google-search')||!result.rows.some(row=>row.channel==='meta'))throw Error('Required report snapshots are not readable');
 await mkdir(directory,{recursive:true,mode:0o700});
 const latest=new Map();let bytes=0;
 for(const row of result.rows){const value={channel:row.channel,scope:row.scope_key,payload:row.payload,updatedAt:new Date(row.updated_at).toISOString()},data=JSON.stringify(value);await writeFile(join(directory,stagingSnapshotFile(row.channel,row.scope_key)),data,{mode:0o600});latest.set(row.channel,value);bytes+=Buffer.byteLength(data);}
 for(const [channel,value] of latest)await writeFile(join(directory,stagingSnapshotFile(channel,'latest')),JSON.stringify(value),{mode:0o600});
 await writeFile(join(directory,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),snapshots:result.rows.length,channels:[...latest.keys()],bytes}),{mode:0o600});
 console.log(JSON.stringify({snapshots:result.rows.length,channels:latest.size,bytes}));
}finally{await client.end();}
