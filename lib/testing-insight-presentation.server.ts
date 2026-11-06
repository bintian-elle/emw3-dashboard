import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {validateInsightPresentation,type PmaxReadableReport,type InsightPresentation,type PresentationMedia} from './testing-insight-presentation';
import {usesUnifiedLocalReports} from './testing-report-environment';
export function localPresentationDirectory(){return !usesUnifiedLocalReports()&&process.env.NODE_ENV==='development'&&process.env.DEPLOYMENT_ENV==='staging'?process.env.CONTENT_TESTING_PRESENTATION_DIR:null;}
export async function readPmaxReadableReport(period:{start:string;end:string}):Promise<PmaxReadableReport|null>{
 const directory=localPresentationDirectory();if(!directory)return null;
 try{
  const [packet,analysis,presentation,media]=await Promise.all(['inputs/google-pmax.json','results/google-pmax.json','results/presentation.json','media-index.json'].map(async file=>JSON.parse(await readFile(path.join(directory,file),'utf8'))));
  if(packet.period.start!==period.start||packet.period.end!==period.end)return null;
  if(analysis.run_id!==packet.run_id||analysis.period.start!==period.start||analysis.period.end!==period.end)throw Error('Preview report identity mismatch');
  const report:PmaxReadableReport={run_id:packet.run_id,period:packet.period,comparison:packet.comparison,totals:packet.totals,comparison_totals:packet.comparison_totals,datasets:packet.datasets,media:(media as PresentationMedia[]).map(({key,asset_id,name,kind,timestamp_seconds,width,height,file,sha256,url,campaigns})=>({key,asset_id,name,kind,timestamp_seconds,width,height,file,sha256,url,campaigns})),analysis:{executive_summary:analysis.executive_summary,campaigns:analysis.campaigns},presentation:presentation as InsightPresentation};
  const structure=report.presentation.schema_version!=='insight-presentation-v1'?JSON.parse(await readFile(path.join(directory,'presentation-structure.json'),'utf8')):null;
  validateInsightPresentation(report.presentation,{...report,...(structure?{sections:structure.sections}:{})});return report;
 }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
