import test from 'node:test';
import assert from 'node:assert/strict';
import {edmDatabaseConfig} from './edm-database.mjs';
test('EDM uses the dedicated EC2 database without redirecting shared stores',()=>{
 const env={EDM_DATABASE_URL:'postgresql://user:secret@127.0.0.1/emw3_edm',KLAVIYO_DATABASE_URL:'postgresql://user:secret@remote.example/postgres'};
 const cfg=edmDatabaseConfig(env);assert.equal(cfg.connectionString,env.EDM_DATABASE_URL);assert.equal(cfg.ssl,false);assert.equal(env.KLAVIYO_DATABASE_URL,'postgresql://user:secret@remote.example/postgres');
});
test('existing deployments retain the prior source until a dedicated database is configured',()=>{
 assert.deepEqual(edmDatabaseConfig({KLAVIYO_DATABASE_URL:'postgresql://user@remote.example/postgres'}),{connectionString:'postgresql://user@remote.example/postgres',ssl:{rejectUnauthorized:false}});
 assert.throws(()=>edmDatabaseConfig({}),/not configured/);
 assert.throws(()=>edmDatabaseConfig({EDM_DATABASE_URL:'invalid',KLAVIYO_DATABASE_URL:'postgresql://user@remote.example/postgres'}));
});
