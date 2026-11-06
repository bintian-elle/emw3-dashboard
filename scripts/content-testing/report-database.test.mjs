import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDatabaseConfig} from './report-database.mjs';
test('uses isolated local database without TLS and keeps remote data source separate',()=>{
 const cfg=reportDatabaseConfig({CONTENT_TESTING_REPORTS_DATABASE_URL:'postgresql://test@127.0.0.1/reports',KLAVIYO_DATABASE_URL:'postgresql://test@remote.example/source'});
 assert.equal(cfg.connectionString,'postgresql://test@127.0.0.1/reports');assert.equal(cfg.ssl,false);
});
test('preserves the existing cloud fallback',()=>{
 const cfg=reportDatabaseConfig({KLAVIYO_DATABASE_URL:'postgresql://test@remote.example/source'});
 assert.deepEqual(cfg.ssl,{rejectUnauthorized:false});assert.equal(cfg.connectionString,'postgresql://test@remote.example/source');
});
test('fails clearly when no database is configured',()=>assert.throws(()=>reportDatabaseConfig({}),/Report database/));
