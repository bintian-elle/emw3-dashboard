import test from 'node:test';
import assert from 'node:assert/strict';
import {stagedDailyDatabase} from './daily-staged-policy.mjs';

test('ordinary daily generation retains its existing database and flow',()=>{
 assert.equal(stagedDailyDatabase({DEPLOYMENT_ENV:'production',KLAVIYO_DATABASE_URL:'prod'}),null);
});
test('staged daily generation requires a distinct staging database',()=>{
 const prod='postgres://user:secret@db.example/production',stage='postgres://user:secret@db.example/staging';
 assert.throws(()=>stagedDailyDatabase({DEPLOYMENT_ENV:'production',STAGING_CONTENT_TESTING_STAGED_DAILY:'1',STAGING_CONTENT_TESTING_DATABASE_URL:stage,KLAVIYO_DATABASE_URL:prod}));
 assert.throws(()=>stagedDailyDatabase({DEPLOYMENT_ENV:'staging',STAGING_CONTENT_TESTING_STAGED_DAILY:'1',KLAVIYO_DATABASE_URL:prod}));
 assert.throws(()=>stagedDailyDatabase({DEPLOYMENT_ENV:'staging',STAGING_CONTENT_TESTING_STAGED_DAILY:'1',STAGING_CONTENT_TESTING_DATABASE_URL:'postgres://other:pass@db.example:5432/production?sslmode=require',KLAVIYO_DATABASE_URL:prod}));
 assert.equal(stagedDailyDatabase({DEPLOYMENT_ENV:'staging',STAGING_CONTENT_TESTING_STAGED_DAILY:'1',STAGING_CONTENT_TESTING_DATABASE_URL:stage,KLAVIYO_DATABASE_URL:prod}),stage);
});
