import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGoogleAdsResponse} from './google-ads-response.ts';

test('Google Ads stream allows an empty report and combines valid batches',()=>{
 assert.deepEqual(parseGoogleAdsResponse([]),[]);
 assert.deepEqual(parseGoogleAdsResponse([{requestId:'id'}]),[]);
 assert.deepEqual(parseGoogleAdsResponse([{results:[{id:1}]},{results:[{id:2}]}]),[{id:1},{id:2}]);
});
test('Google Ads stream rejects malformed or embedded error responses',()=>{
 for(const body of [null,{},[{error:{message:'private'}}],[{results:{}}],[{results:[null]}],[3]]){
  assert.throws(()=>parseGoogleAdsResponse(body),/Google Ads/);
 }
});
