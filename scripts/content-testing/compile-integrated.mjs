import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {validateInsightPresentation} from '../../lib/testing-insight-presentation.ts';
const partial=process.argv.includes('--check-available');
const root=path.resolve(process.argv[2]),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),media=JSON.parse(await fs.readFile(path.join(root,'media-index.json'),'utf8')),bundle={run_id:manifest.run_id,period:manifest.period,reports:{}};
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');const hashes={};
for(const m of media){const raw=await fs.readFile(path.join(root,'media',m.file));if(hash(raw)!==m.sha256)throw Error(`Media digest mismatch ${m.key}`);}
function urls(value,out=new Set()){if(typeof value==='string'&&value.startsWith('https://')){try{out.add(new URL(value).href);}catch{}}else if(Array.isArray(value))for(const v of value)urls(v,out);else if(value&&typeof value==='object')for(const v of Object.values(value))urls(v,out);return out;}
function sum(rows){const result={};for(const key of ['spend','revenue','orders','clicks','impressions'])result[key]=rows.some(r=>r[key]==null)?null:rows.reduce((s,r)=>s+Number(r[key]??0),0);result.roas=result.spend>0?result.revenue/result.spend:null;return result;}
for(const entry of manifest.reports){
 let raw;try{raw=await fs.readFile(path.join(root,`results/${entry.report_id}.json`));}catch(error){if(partial&&error.code==='ENOENT')continue;throw error;}hashes[entry.report_id]=hash(raw);const result=JSON.parse(raw),packet=JSON.parse(await fs.readFile(path.join(root,`inputs/${entry.report_id}.json`),'utf8'));
 if(result.run_id!==manifest.run_id||result.period.start!==entry.period.start||result.period.end!==entry.period.end)throw Error('Mixed result identity');
 let totals=entry.report_id==='overview'?manifest.overview_display_totals.paid:entry.scope==='period'?manifest.overview_display_totals.channels[entry.channel]:undefined;
 const history=entry.report_id==='meta'?packet.supporting_data.meta_daily_history:Object.values(packet.supporting_data.daily_history??{}).flat();let comparison_totals;
 if(totals&&Array.isArray(history)&&packet.comparison){const selected=history.filter(r=>r.date>=packet.period.start&&r.date<=packet.period.end),prev=history.filter(r=>r.date>=packet.comparison.start&&r.date<=packet.comparison.end),now=sum(selected);if(prev.length&&selected.length&&['spend','revenue','orders'].every(k=>Math.abs(now[k]-totals[k])<.02))comparison_totals=sum(prev);}

 bundle.reports[entry.report_id]={};
 for(const language of ['en','zh']){const v=result[language],analysis={executive_summary:v.presentation.summary,campaigns:v.campaigns},scopes=new Set(['channel',...packet.tests.map(t=>t.test_id)]);
 if(v.campaigns.length!==packet.tests.length||new Set(v.campaigns.map(c=>c.test_id)).size!==packet.tests.length||v.campaigns.some(c=>!scopes.has(c.test_id)))throw Error('Campaign identity coverage mismatch');
 const accounts=packet.currency_verification?.accounts??[],currencyChannel=entry.channel.startsWith('Google')||entry.channel==='Demand Gen'?'Google':entry.channel;const currency=entry.report_id==='overview'?(accounts.length&&accounts.every(a=>a.verified&&a.currency==='USD')?'USD':null):(accounts.find(a=>a.channel===currencyChannel&&a.verified)?.currency??null);
 const report={run_id:manifest.run_id,currency,channel:entry.channel,language,scope:entry.scope,period:packet.period,comparison:packet.comparison??{start:'',end:''},totals:totals??{},comparison_totals,datasets:{input:{id:'input',scopes:[...scopes],xKey:'category',columns:{category:'category'},rows:[]}},source_urls:[...urls(packet)],media:media.map(({source_path,...entry})=>entry),presentation:v.presentation,analysis};
 validateInsightPresentation(report.presentation,{...report,sections:packet.sections});bundle.reports[entry.report_id][language]=report;
 }
}
if(partial){console.log(JSON.stringify({validated_available:Object.keys(bundle.reports)}));process.exit(0);}
if(manifest.status!=='completed')throw Error('Remote batch not complete; do not activate partial output');
await fs.writeFile(path.join(root,'compiled.json'),JSON.stringify(bundle),{mode:0o600});await fs.writeFile(path.join(root,'checksums.json'),JSON.stringify({run_id:manifest.run_id,results:hashes,compiled:hash(await fs.readFile(path.join(root,'compiled.json')))},null,2),{mode:0o600});console.log(JSON.stringify({validated:Object.keys(bundle.reports),languages:['en','zh']}));
