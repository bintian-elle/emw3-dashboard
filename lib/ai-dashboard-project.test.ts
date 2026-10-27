import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {lastCompletedWeek,dashboardToday} from './ai-dashboard-periods.ts';
import {runWithDashboardProject,dashboardProject} from './ai-dashboard-project.ts';
import {querySnapshot,queryKey} from './ai-dashboard.ts';
import {projectReadiness} from './ai-dashboard-overview.ts';
test('last week rolls only after Monday has fully ended in the reporting timezone',()=>{
 assert.deepEqual(lastCompletedWeek('2026-10-26'),{start:'2026-10-13',end:'2026-10-19'});
 assert.deepEqual(lastCompletedWeek('2026-10-27'),{start:'2026-10-20',end:'2026-10-26'});
 assert.deepEqual(lastCompletedWeek('2026-10-25'),{start:'2026-10-13',end:'2026-10-19'});
 assert.deepEqual(lastCompletedWeek('2026-01-01'),{start:'2025-12-23',end:'2025-12-29'});
 assert.equal(dashboardToday(new Date('2026-10-27T00:30:00Z')),'2026-10-26');
 assert.deepEqual(lastCompletedWeek(new Date('2026-10-27T00:30:00Z')),{start:'2026-10-13',end:'2026-10-19'});
});
test('project query contexts stay isolated concurrently and ignore foreign cache payloads',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'builder-projects-')),old=process.env.AI_DASHBOARD_PROJECTS_DIR;process.env.AI_DASHBOARD_PROJECTS_DIR=directory;
 const range={start:'2026-10-13',end:'2026-10-19'},query={source:'ga4' as const,groupBy:'overview' as const,...range};
 try{for(const [project,value]of [['biceek',70],['ringconn',700]] as const){const root=path.join(directory,project,'overview');await mkdir(root,{recursive:true});await writeFile(path.join(root,`ga4-${range.start}-${range.end}.json`),JSON.stringify({project,source:'ga4',accountRef:`ga4.${project}`,identityVerified:true,...range,fetchedAt:'2026-10-26',status:'ready',complete:true,currency:'USD',timezone:'America/Los_Angeles',origin:'test',rows:[{date:range.start,sessions:9999}],totals:{sessions:value,revenue:value*2,conversions:7}}));}
 const [biceek,ringconn]=await Promise.all([runWithDashboardProject('biceek',()=>querySnapshot(query)),runWithDashboardProject('ringconn',()=>querySnapshot(query))]);assert.equal(biceek.rows[0].sessions,70);assert.equal(ringconn.rows[0].sessions,700);assert.notEqual(runWithDashboardProject('biceek',()=>queryKey(query)),runWithDashboardProject('ringconn',()=>queryKey(query)));assert.equal(dashboardProject(),'bluevua');
 await assert.rejects(()=>runWithDashboardProject('ringconn',()=>querySnapshot({...query,source:'google_ads'})),/not connected/);
 const file=path.join(directory,'ringconn','overview',`ga4-${range.start}-${range.end}.json`);const wrong=JSON.parse(await import('node:fs/promises').then(fs=>fs.readFile(file,'utf8')));wrong.project='biceek';await writeFile(file,JSON.stringify(wrong));assert.equal((await projectReadiness('ringconn',range)).available,false);const absent=await runWithDashboardProject('ringconn',()=>querySnapshot(query));assert.equal(absent.rows[0].sessions,null);
 }finally{if(old===undefined)delete process.env.AI_DASHBOARD_PROJECTS_DIR;else process.env.AI_DASHBOARD_PROJECTS_DIR=old;await rm(directory,{recursive:true,force:true});}
});

test('native EDM totals and channel breakdowns work without inventing daily partitions',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'builder-edm-')),old=process.env.AI_DASHBOARD_PROJECTS_DIR;process.env.AI_DASHBOARD_PROJECTS_DIR=directory;const range={start:'2026-10-13',end:'2026-10-19'};
 try{const root=path.join(directory,'biceek','overview');await mkdir(root,{recursive:true});await writeFile(path.join(root,`edm-${range.start}-${range.end}.json`),JSON.stringify({project:'biceek',source:'edm',accountRef:'klaviyo.biceek',identityVerified:true,...range,status:'ready',complete:true,origin:'native reports',currency:'USD',timezone:'America/Los_Angeles',fetchedAt:'2026-10-26',rows:[],totals:{revenue:119.01,delivered:433},breakdowns:{channel:[{label:'Email',revenue:119.01,delivered:433}]}}));
 const overview=await runWithDashboardProject('biceek',()=>querySnapshot({source:'edm',groupBy:'overview',...range}));assert.equal(overview.rows[0].revenue,119.01);const channel=await runWithDashboardProject('biceek',()=>querySnapshot({source:'edm',groupBy:'channel',...range}));assert.equal(channel.rows[0].label,'Email');assert.equal(channel.rows[0].revenue,119.01);const daily=await runWithDashboardProject('biceek',()=>querySnapshot({source:'edm',groupBy:'day',...range}));assert.equal(daily.rows.length,7);assert.equal(daily.rows[0].revenue,null);
 }finally{if(old===undefined)delete process.env.AI_DASHBOARD_PROJECTS_DIR;else process.env.AI_DASHBOARD_PROJECTS_DIR=old;await rm(directory,{recursive:true,force:true});}
});
