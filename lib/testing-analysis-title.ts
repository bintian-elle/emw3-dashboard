const channelNames:Record<string,string>={
 'google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Google Demand Gen',
 'demand gen':'Google Demand Gen',meta:'Meta',reddit:'Reddit','reddit-lifetime':'Reddit','reddit lifetime':'Reddit',
 'reddit-awareness':'Reddit','reddit-conversion':'Reddit',edm:'EDM',social:'Social Media','social-media':'Social Media',
};

export function testingAnalysisTitle(channel:string|undefined,language:string,campaign?:string){
 const zh=language==='zh';
 if(campaign&&campaign!=='overview'&&campaign!=='social-selected-posts')return `${zh?'Campaign 分析':'Campaign Analysis'} · ${campaign}`;
 const key=(channel??'overview').toLowerCase();
 if(key==='overview')return zh?'分析 · 总览':'Analysis · Overview';
 return `${zh?'渠道分析':'Channel Analysis'} · ${channelNames[key]??channel}`;
}
