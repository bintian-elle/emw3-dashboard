import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportDatabaseEnvironment,usesUnifiedLocalReports} from './testing-report-environment.ts';
test('only local staging can opt into production reports',()=>{
 assert.equal(reportDatabaseEnvironment({NODE_ENV:'development',DEPLOYMENT_ENV:'staging',LOCAL_STAGING_REPORT_ENV:'production'}),'production');
 assert.equal(reportDatabaseEnvironment({NODE_ENV:'production',DEPLOYMENT_ENV:'staging',LOCAL_STAGING_REPORT_ENV:'production'}),'staging');
 assert.equal(reportDatabaseEnvironment({NODE_ENV:'production',DEPLOYMENT_ENV:'staging',STAGING_USE_PRODUCTION_REPORTS:'1'}),'production');
 assert.equal(reportDatabaseEnvironment({NODE_ENV:'development',DEPLOYMENT_ENV:'staging'}),'staging');
 assert.equal(reportDatabaseEnvironment({NODE_ENV:'production',DEPLOYMENT_ENV:'production'}),'production');
});
test('legacy insight fallbacks are disabled only in the two local previews',()=>{
 assert.equal(usesUnifiedLocalReports({NODE_ENV:'development',DEPLOYMENT_ENV:'staging',LOCAL_STAGING_REPORT_ENV:'production'}),true);
 assert.equal(usesUnifiedLocalReports({NODE_ENV:'production',LOCAL_PRODUCTION_PREVIEW:'1'}),true);
 assert.equal(usesUnifiedLocalReports({NODE_ENV:'production',DEPLOYMENT_ENV:'staging',LOCAL_STAGING_REPORT_ENV:'production'}),false);
 assert.equal(usesUnifiedLocalReports({NODE_ENV:'production',DEPLOYMENT_ENV:'production'}),false);
});
