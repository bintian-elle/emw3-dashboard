/** Generate missing channel analyses before overview; never reuse results from another period. */
export async function orchestrateManualReports({scope,campaign,temporary,channels,saved,generate}){
 const output={};
 if(scope!=='overview'){output[scope]=await generate(scope,[],campaign?{campaign}:undefined);return output;}
 if(temporary){output.overview=await generate('overview',channels.filter(channel=>saved[channel]).map(channel=>({channel,content:saved[channel]})));return output;}
 const reports=[];
 for(const channel of channels){const report=saved[channel]??await generate(channel,[]);if(!report?.en||!report?.zh)throw Error(`Incomplete channel: ${channel}`);if(!saved[channel])output[channel]=report;reports.push({channel,content:report});}
 output.overview=await generate('overview',reports);return output;
}
