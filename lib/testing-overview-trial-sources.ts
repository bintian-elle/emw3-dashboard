export const overviewSourceChannels=['google-search','google-pmax','google-demand-gen','meta','reddit','social-media','edm'] as const;
export type OverviewInsightSource={channel:string;kind:'trial'|'saved';id:string;created_at:string;priority?:number;period:{start:string;end:string};comparison?:{start:string;end:string}|null;scope?:string;content:unknown};
export function selectOverviewInsightSources(period:{start:string;end:string},comparison:{start:string;end:string}|null,trials:OverviewInsightSource[],saved:OverviewInsightSource[]){
 const same=(a:{start:string;end:string}|null|undefined,b:{start:string;end:string}|null|undefined)=>!!a&&!!b&&a.start===b.start&&a.end===b.end;
 return overviewSourceChannels.map(channel=>{
  const matches=(source:OverviewInsightSource)=>source.channel===channel&&!(channel==='reddit'&&source.scope==='lifetime')&&(channel==='social-media'&&source.scope==='lifetime'||same(source.period,period)&&(source.kind==='saved'&&!source.comparison||!comparison||same(source.comparison,comparison)));
  const latest=(items:OverviewInsightSource[]):OverviewInsightSource|undefined=>items.filter(matches).sort((a,b)=>(b.priority??0)-(a.priority??0)||(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0))[0];
  return latest(trials)??latest(saved)??{channel,kind:'unavailable' as const,reason:'No completed insight with matching reporting scope.'};
 });
}
