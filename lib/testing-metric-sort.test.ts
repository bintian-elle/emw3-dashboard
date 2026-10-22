import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextMetricSort,sortMetricRows} from './testing-metric-sort.ts';
test('metric buttons cycle descending, ascending and original order',()=>{
 const down=nextMetricSort(null,'spend'),up=nextMetricSort(down,'spend');
 assert.equal(down?.direction,'descending');assert.equal(up?.direction,'ascending');assert.equal(nextMetricSort(up,'spend'),null);assert.equal(nextMetricSort(up,'roas')?.direction,'descending');
});
test('sort exact numeric values, keep missing last in either direction and stabilize ties',()=>{
 const rows=[{id:'empty',value:null},{id:'small',value:0.011},{id:'large',value:0.014},{id:'tie',value:0.011},{id:'zero',value:0},{id:'nan',value:NaN}];
 const values=(row:typeof rows[number])=>({value:row.value});
 assert.deepEqual(sortMetricRows(rows,{key:'value',direction:'descending'},values).map(r=>r.id),['large','small','tie','zero','empty','nan']);
 assert.deepEqual(sortMetricRows(rows,{key:'value',direction:'ascending'},values).map(r=>r.id),['zero','small','tie','large','empty','nan']);
 assert.deepEqual(sortMetricRows(rows,null,values),rows);assert.equal(rows[0].id,'empty');
});
