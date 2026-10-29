import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceSnapshotVersions,shouldAttemptSnapshotRefresh,testingSnapshotChannels,testingSnapshotInput,testingSnapshotScopes,testingSnapshotView,testingSnapshotWatchKey} from './testing-snapshot-watch.ts';
import {testingDataSnapshotKey} from './testing-data-cache-contract.ts';

test('selects page-specific scopes and excludes fixed concluded tests',()=>{
 assert.equal(testingSnapshotView('/bluevua/testing'),'overview');
 assert.equal(testingSnapshotView('/bluevua/testing/inventory'),'inventory');
 assert.equal(testingSnapshotView('/bluevua/testing/google/pmax/campaign'),'google-pmax');
 assert.equal(testingSnapshotView('/bluevua/testing/reddit/group'),'reddit');
 assert.equal(testingSnapshotView('/bluevua/testing/concluded/google-search'),null);
 assert.equal(testingSnapshotView('/bluevua/testing/google/concluded/test/arm'),null);
 assert.equal(testingSnapshotView('/bluevua/testing/google/search/group','/bluevua/testing/concluded/google-search'),null);
 assert.equal(testingSnapshotView('/elsewhere'),null);
 assert.equal(testingSnapshotChannels('overview').length,7);
 assert.equal(testingSnapshotChannels('inventory').includes('social'),false);
 assert.deepEqual(testingSnapshotChannels('meta'),['meta']);
 assert.deepEqual(testingSnapshotScopes('inventory').map(scope=>'latest' in scope&&scope.latest),[false,false,false,true,true,true]);
 assert.equal(testingSnapshotWatchKey('inventory','custom','2026-10-01','2026-10-20'),'view=inventory');
 assert.equal(testingSnapshotWatchKey('overview','custom','2026-10-01','2026-10-20'),'view=overview&period=custom&start=2026-10-01&end=2026-10-20');
});

test('deduplicates an unchanged target while allowing a later retry or newer target',()=>{
 assert.equal(shouldAttemptSnapshotRefresh('v2',null,0),true);
 assert.equal(shouldAttemptSnapshotRefresh('v2','v2',500),false);
 assert.equal(shouldAttemptSnapshotRefresh('v2','v2',10_000),true);
 assert.equal(shouldAttemptSnapshotRefresh('v3','v2',500),true);
});

test('detects a publication during period rollover and limits retries against a stale instance',()=>{
 const rendered=['2026-10-28T23:59:59.000Z'];
 const observed=['2026-10-29T00:00:01.000Z'];
 const comparison=advanceSnapshotVersions(rendered,observed);
 assert.equal(comparison.changed,true);
 const target=JSON.stringify(comparison.versions);
 assert.equal(shouldAttemptSnapshotRefresh(target,null,0),true);
 assert.equal(shouldAttemptSnapshotRefresh(target,target,1000),false);
 assert.equal(shouldAttemptSnapshotRefresh(target,target,10_000),true);
 assert.equal(advanceSnapshotVersions(observed,observed).changed,false);
});

test('keeps channel baselines isolated by reporting range and uses Reddit lifetime by default',()=>{
 const now=new Date('2026-10-29T12:00:00Z');
 const custom=testingSnapshotInput('meta','custom','2026-10-01','2026-10-10');
 assert.notEqual(testingDataSnapshotKey('meta',custom,now),testingDataSnapshotKey('meta',testingSnapshotInput('meta','lastWeek'),now));
 assert.equal(testingSnapshotInput('reddit').preset,'sinceSep24');
 assert.equal(testingSnapshotInput('reddit','invalid').preset,'sinceSep24');
 assert.equal(testingSnapshotInput('meta','invalid').preset,'lastWeek');
 assert.equal(testingDataSnapshotKey('google-search',custom,now),'all');
});

test('refreshes on a changed, rolled-back or explicitly deleted published version',()=>{
 const old='2026-10-20T00:00:00.000Z',newer='2026-10-21T00:00:00.000Z';
 assert.deepEqual(advanceSnapshotVersions([old,null],[old,null]),{versions:[old,null],changed:false});
 assert.deepEqual(advanceSnapshotVersions([old,null],[newer,null]),{versions:[newer,null],changed:true});
 assert.deepEqual(advanceSnapshotVersions([old,null],[null,newer]),{versions:[null,newer],changed:true});
 assert.deepEqual(advanceSnapshotVersions([newer],[old]),{versions:[old],changed:true});
 assert.deepEqual(advanceSnapshotVersions([old],[null]),{versions:[null],changed:true});
 assert.deepEqual(advanceSnapshotVersions([old],[]),{versions:[old],changed:false});
});
