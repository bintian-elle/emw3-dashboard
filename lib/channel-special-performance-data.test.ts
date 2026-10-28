import test from 'node:test';
import assert from 'node:assert/strict';
import {edmSpecialMetrics,socialSpecialMetrics} from './channel-special-performance-data.ts';

test('EDM rates combine the selected variation numerators and delivered denominator',()=>{
 const result=edmSpecialMetrics([
  {hasData:true,delivered:100,openRate:0.2,clicks:10,orders:2,revenue:80},
  {hasData:true,delivered:300,openRate:0.4,clicks:30,orders:1,revenue:50},
 ]);
 assert.deepEqual(result,{delivered:400,openRate:0.35,clickRate:0.1,orders:3,revenue:130});
});
test('EDM unavailable metrics and zero delivered remain unknown',()=>{
 assert.deepEqual(edmSpecialMetrics([]),{delivered:null,openRate:null,clickRate:null,orders:null,revenue:null});
 const zero=edmSpecialMetrics([{hasData:true,delivered:0,openRate:null,clicks:0,orders:0,revenue:0}]);
 assert.equal(zero.delivered,0);assert.equal(zero.openRate,null);assert.equal(zero.clickRate,null);
 const incomplete=edmSpecialMetrics([{hasData:true,delivered:100,openRate:null,clicks:null,orders:0,revenue:0}]);
 assert.equal(incomplete.openRate,null);assert.equal(incomplete.clickRate,null);
});
test('social sums each organic post metric only when all selected posts have it',()=>{
 const result=socialSpecialMetrics([{metrics:{views:20,likes:2,comments:1,shares:0,saved:1}},{metrics:{views:30,likes:3,comments:2,shares:null,saved:2}}]);
 assert.deepEqual(result,{views:50,likes:5,comments:3,shares:null,saved:3});
});
