import {test} from 'node:test';import assert from 'node:assert/strict';
import {projectFor,moveWidget,validateWidgetOrder} from './ai-dashboard-options.ts';
import {resolveAutomaticTheme,resolveThemePreference,THEME_BOOTSTRAP,THEME_PREFERENCE_STORAGE_KEY} from './theme-policy.ts';
test('project selection never substitutes Bluevua for another brand',()=>{assert.equal(projectFor('bluevua').available,true);assert.equal(projectFor('biceek').available,true);assert.equal(projectFor('ringconn').available,true);assert.throws(()=>projectFor('other'),/project/i);});
test('reordering preserves all widgets and rejects injected export ids',()=>{assert.deepEqual(moveWidget(['a','b','c'],'a','c'),['b','c','a']);assert.deepEqual(moveWidget(['a','b'],'unknown','a'),['a','b']);assert.deepEqual(validateWidgetOrder(['b','a'],['a','b']),['b','a']);assert.throws(()=>validateWidgetOrder(['a','a'],['a','b']),/order/i);assert.throws(()=>validateWidgetOrder(['a','secret'],['a','b']),/order/i);});
test('device appearance wins, local time is fallback, manual choice is respected',()=>{assert.equal(resolveAutomaticTheme(true,12),'dark');assert.equal(resolveAutomaticTheme(false,23),'light');assert.equal(resolveAutomaticTheme(null,23),'dark');assert.equal(resolveAutomaticTheme(null,8),'light');assert.equal(resolveThemePreference('light',true,23),'light');assert.equal(resolveThemePreference('auto',true,12),'dark');});
test('visible layout preserves placement while deleted components stay hidden',async()=>{
 const {visibleWidgetIds}=await import('./ai-dashboard-options.ts');
 assert.deepEqual(visibleWidgetIds(['a','b','c'],['c','a','b'],['a']),['c','b']);
 assert.deepEqual(visibleWidgetIds(['a','b'],['b','b','unknown'],[]),['b','a']);
 assert.deepEqual(visibleWidgetIds(['a'],[],['a']),[]);
});

test('first paint follows browser appearance despite the legacy resolved-mode cache',async()=>{
 const {runInNewContext}=await import('node:vm');
 const boot=(saved:Record<string,string>,dark:boolean,light:boolean)=>{let mode=false;const style:{colorScheme?:string}={};runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem:(key:string)=>saved[key]??null},matchMedia:(query:string)=>({matches:query.includes(': dark')?dark:light}),Date,document:{documentElement:{style,classList:{toggle:(_name:string,value:boolean)=>{mode=value;}}}}});return{mode,scheme:style.colorScheme};};
 assert.deepEqual(boot({'boardui:theme':'light'},true,false),{mode:true,scheme:'dark'});
 assert.deepEqual(boot({'boardui:theme':'dark'},false,true),{mode:false,scheme:'light'});
 assert.deepEqual(boot({[THEME_PREFERENCE_STORAGE_KEY]:'light'},true,false),{mode:false,scheme:'light'});
 assert.deepEqual(boot({[THEME_PREFERENCE_STORAGE_KEY]:'auto'},true,false),{mode:true,scheme:'dark'});
 let blockedStorageMode=false;runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem:()=>{throw Error('Storage blocked');}},matchMedia:(query:string)=>({matches:query.includes(': dark')}),Date,document:{documentElement:{style:{},classList:{toggle:(_name:string,value:boolean)=>{blockedStorageMode=value;}}}}});assert.equal(blockedStorageMode,true);
});
