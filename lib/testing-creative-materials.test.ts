import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeNamesIndex,externalizeCreativeNames,restoreCreativeNames} from './testing-creative-materials.ts';

test('known fixed creative names round-trip; changed and unknown names and metrics remain intact',()=>{
 const index=creativeNamesIndex([{channel:'meta',id:'123',name:'Known ad'}]);
 const original={ads:[{adId:'123',name:'Known ad',spend:12},{adId:'123',name:'Renamed ad',spend:5},{adId:'456',name:'New ad',spend:8}]};
 const stored=externalizeCreativeNames('meta',original,index);
 assert.deepEqual(stored.ads[0],{adId:'123',spend:12,__localCreativeName:'123'});
 assert.deepEqual(stored.ads.slice(1),original.ads.slice(1));
 assert.deepEqual(restoreCreativeNames('meta',stored,index),original);
 assert.throws(()=>restoreCreativeNames('meta',stored,new Map()),/missing/);
 assert.deepEqual(externalizeCreativeNames('reddit',original,index),original);
});
