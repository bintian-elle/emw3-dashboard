import {consultBrandAssistant,type BrandAssistantInput} from '../lib/ai-dashboard-brand-assist.ts';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>180000)throw Error('input_size');}
try{const request=JSON.parse(input) as BrandAssistantInput;if(typeof request.project!=='string'||typeof request.prompt!=='string')throw Error('input');process.stdout.write(JSON.stringify(await consultBrandAssistant(request,{mode:'anc'})));}catch{process.stdout.write(JSON.stringify({assistant:'',notes:[],sources:[],status:'unavailable'}));}
