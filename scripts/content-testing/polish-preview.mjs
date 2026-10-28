import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {conclusionOnlySections,conclusionOnlyMarkdown} from '../../lib/testing-prompt-presentation.ts';
const folder=path.resolve(process.argv[2]??'.state/content-testing-preview/20261028-zh/results');
await mkdir(path.join(folder,'audit-original'),{recursive:true,mode:0o700});
for(const name of await readdir(folder)){
 if(!name.endsWith('.json'))continue;
 const file=path.join(folder,name),report=JSON.parse(await readFile(file,'utf8'));
 if(report.schema_version!=='channel-prompt-preview-v1')continue;
 try{await copyFile(file,path.join(folder,'audit-original',name),1);}catch(error){if(error.code!=='EEXIST')throw error;}
 report.sections=conclusionOnlySections(report.sections);
 report.campaigns=report.campaigns.map(campaign=>({...campaign,detail_markdown:conclusionOnlyMarkdown(campaign.detail_markdown)}));
 await writeFile(file,JSON.stringify(report,null,2),{mode:0o600});
 const markdown=`# ${report.title}\n\n${report.executive_summary}\n\n`+report.sections.map(section=>`## ${section.title}\n\n${section.markdown}`).join('\n\n');
 await writeFile(file.replace(/\.json$/,'.md'),markdown,{mode:0o600});
}
