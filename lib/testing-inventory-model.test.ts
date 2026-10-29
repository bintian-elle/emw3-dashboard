import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {buildTestingInventory,testingInventoryCount,type InventorySources} from './testing-inventory-model.ts';

function sources():InventorySources{
 return {
  'google-search':[
   {id:'101',name:'Search campaign',status:'ENABLED'},
   {id:'101',name:'Search campaign',status:'ENABLED'},
   {id:'102',name:'Other search campaign',status:'PAUSED'},
  ],
  'google-pmax':[{id:'201',name:'PMax campaign',status:'ENABLED'}],
  'google-demand-gen':[],
  meta:[{id:'301',name:'Meta campaign',status:'ACTIVE'}],
  reddit:[],
  edm:[{id:'401',name:'Email campaign',status:'SENT'}],
 };
}

test('counts each campaign once per channel, excludes social, and retains statuses and destinations',()=>{
 const withSocial={...sources(),social:[{id:'501',name:'Instagram',status:'ACTIVE'}]};
 const inventory=buildTestingInventory(withSocial);
 assert.equal(inventory.items.length,5);
 assert.equal(testingInventoryCount(inventory),5);
 assert.equal(testingInventoryCount(inventory,'google-search'),2);
 assert.equal(testingInventoryCount(inventory,'google-pmax'),1);
 assert.equal(testingInventoryCount(inventory,'meta'),1);
 assert.equal(testingInventoryCount(inventory,'reddit'),0);
 assert.equal(inventory.items.some(item=>item.name==='Instagram'),false);
 const campaign=inventory.items.find(item=>item.name==='Other search campaign');
 assert.equal(campaign?.status,'PAUSED');
 const link=new URL(campaign!.href,'https://example.test');
 assert.equal(link.pathname,'/bluevua/testing/google/search');
 assert.equal(link.searchParams.get('campaign'),'Other search campaign');
});

test('unavailable snapshots have unknown counts, while available empty channels have zero',()=>{
 const input=sources();input.meta=null;input.edm=null;
 const inventory=buildTestingInventory(input);
 assert.deepEqual(inventory.unavailable,['meta','edm']);
 assert.equal(testingInventoryCount(inventory),null);
 assert.equal(testingInventoryCount(inventory,'meta'),null);
 assert.equal(testingInventoryCount(inventory,'edm'),null);
 assert.equal(testingInventoryCount(inventory,'reddit'),0);
 assert.equal(testingInventoryCount(inventory,'google-search'),2);
});
