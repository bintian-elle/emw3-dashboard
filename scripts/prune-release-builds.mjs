import {execFileSync} from 'node:child_process';
import {existsSync,readdirSync,rmSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const [active]=process.argv.slice(2);
const isRelease=name=>/^\.next-release(?:-[a-zA-Z0-9][a-zA-Z0-9._-]*)?$/.test(name);
if(!active||!isRelease(active)||!existsSync(path.join(root,active,'BUILD_ID')))throw Error('Expected a completed Dashboard release');

const apps=JSON.parse(execFileSync('pm2',['jlist'],{encoding:'utf8',maxBuffer:10*1024*1024}));
const directory=({pm2_env:env})=>path.resolve(env.pm_cwd||root,env.NEXT_DIST_DIR||env.env?.NEXT_DIST_DIR||'.next');
const production=apps.find(app=>app.name==='emw3-dashboard'&&app.pm2_env?.status==='online'&&path.resolve(app.pm2_env.pm_cwd)===root);
if(!production||directory(production)!==path.join(root,active))throw Error('Production is not running the selected release');

const referenced=new Set(apps.filter(app=>app.pm2_env).map(directory));
for(const entry of readdirSync(root,{withFileTypes:true})){
 if(!entry.isDirectory()||(!isRelease(entry.name)&&entry.name!=='.next'))continue;
 const target=path.join(root,entry.name);
 if(referenced.has(target))continue;
 rmSync(target,{recursive:true});
 console.log(`Removed old build ${entry.name}`);
}
