import type { GoogleSearchTest, GoogleTestGroup } from "./testing-google";

type DailyMetrics = Pick<GoogleTestGroup,"spend"|"revenue"|"orders"|"impressions"|"clicks"> & {date:string};
export type SnapshotDailyGroup = Pick<GoogleTestGroup,"label"|"name"|"adGroupId"> & {days: DailyMetrics[]};

export function concludedReportForPeriod(report: GoogleSearchTest, dailyGroups: SnapshotDailyGroup[], period: {start:string;end:string}, periodLabel:string):GoogleSearchTest|null {
  if(!report.period || period.start>report.period.end || period.end<report.period.start)return null;
  const groups = dailyGroups.flatMap(group=>{
    const days = group.days.filter(day=>day.date>=period.start&&day.date<=period.end&&day.date>=report.period!.start&&day.date<=report.period!.end);
    if(!days.length)return [];
    const sum=days.reduce((total,day)=>({spend:total.spend+Number(day.spend),revenue:total.revenue+Number(day.revenue),orders:total.orders+Number(day.orders),impressions:total.impressions+Number(day.impressions),clicks:total.clicks+Number(day.clicks)}),{spend:0,revenue:0,orders:0,impressions:0,clicks:0});
    const ratio=(a:number,b:number)=>b>0?a/b:null;
    return [{label:group.label,name:group.name,adGroupId:group.adGroupId,...sum,cpa:ratio(sum.spend,sum.orders),cvr:ratio(sum.orders,sum.clicks),roas:ratio(sum.revenue,sum.spend),ctr:ratio(sum.clicks,sum.impressions),cpc:ratio(sum.spend,sum.clicks)}];
  });
  return groups.length?{...report,period,periodLabel,groups}:null;
}
