export const overviewChannels = ['Google', 'Meta', 'Reddit', 'EDM'] as const;
export type OverviewChannel = typeof overviewChannels[number];
export type OverviewAssetType = 'Mixed' | 'Message' | 'Picture' | 'Video';
export type OverviewDailyRow = {
  date: string; entityId: string; assetType: OverviewAssetType;
  spend: number; revenue: number; orders: number; clicks: number; impressions: number | null;
  delivered?: number; cvrEntityId?: string; excludeFromAdCtr?: boolean;
};
export type OverviewDailySource = {
  channel: OverviewChannel; rows: OverviewDailyRow[];
  totals?: Array<Omit<OverviewDailyRow, "entityId" | "assetType">>;
  reach?: Array<{date: string; value: number | null}>;
};
export type OverviewTrendPoint = {date: string} & Partial<Record<OverviewChannel | OverviewAssetType, number | null>>;
export type OverviewTrendMetric = 'assets' | 'revenue' | 'orders' | 'reach' | 'uniqueReach' | 'ctr' | 'roas' | 'cvr';
export type OverviewDailyMetrics = Record<OverviewTrendMetric, OverviewTrendPoint[]>;
export type OverviewTrends = {metrics: OverviewDailyMetrics; issues: string[]};
export function overviewDates(period: {start: string; end: string}): string[] {
  const dates: string[] = [];
  for (let time = Date.parse(`${period.start}T00:00:00Z`); time <= Date.parse(`${period.end}T00:00:00Z`); time += 86400000) dates.push(new Date(time).toISOString().slice(0,10));
  return dates;
}
const ratio = (a: number, b: number) => b > 0 ? a / b : null;
export function buildOverviewDailyMetrics(period: {start: string; end: string}, sources: OverviewDailySource[]): OverviewDailyMetrics {
  const dates = overviewDates(period);
  const metrics = Object.fromEntries(['assets','revenue','orders','reach','uniqueReach','ctr','roas','cvr'].map(key => [key, dates.map(date => ({date}))])) as OverviewDailyMetrics;
  for (const channel of overviewChannels) {
    const source = sources.find(item => item.channel === channel);
    const byDate = new Map<string, OverviewDailyRow[]>();
    for (const row of source?.rows ?? []) byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
    const reach = source?.reach ? new Map<string, number | null>() : null;
    for (const row of source?.reach ?? []) {
      const previous = reach!.get(row.date);
      reach!.set(row.date, previous === null || row.value === null ? null : (previous ?? 0) + row.value);
    }
    dates.forEach((date,index) => {
      const assetRows = byDate.get(date) ?? [];
      const rows = source?.totals ? source.totals.filter(row => row.date === date) : assetRows;
      const sum = (key: 'spend'|'revenue'|'orders'|'clicks'|'delivered') => rows.reduce((total,row) => total + (row[key] ?? 0), 0);
      const ctrRows=rows.filter(row=>!row.excludeFromAdCtr);
      const ctrImpressions=ctrRows.some(row=>row.impressions===null)?null:ctrRows.reduce((sum,row)=>sum+(row.impressions??0),0);
      const ctrClicks=ctrRows.reduce((sum,row)=>sum+row.clicks,0);
      const entities = new Map<string, {orders:number; clicks:number}>();
      for (const row of assetRows) {
        const id=row.cvrEntityId??row.entityId,previous=entities.get(id)??{orders:0,clicks:0};
        entities.set(id,{orders:previous.orders+row.orders,clicks:previous.clicks+row.clicks});
      }
      const values = [...entities.values()].filter(row => row.clicks > 0).map(row => row.orders / row.clicks);
      const dailyReach = reach ? (reach.has(date) ? reach.get(date)! : 0) : null;
      const valuesByMetric = {
        revenue: sum('revenue'), orders: sum('orders'),
        reach: channel === 'EDM' ? sum('delivered') : dailyReach,
        uniqueReach: dailyReach,
        ctr: channel === 'EDM' ? ratio(sum('clicks'),sum('delivered')) : ctrImpressions === null ? null : ratio(ctrClicks,ctrImpressions),
        roas: channel === 'EDM' ? null : ratio(sum('revenue'), sum('spend')),
        cvr: values.length ? values.reduce((a,b) => a+b,0) / values.length : null,
      };
      for (const [key,value] of Object.entries(valuesByMetric)) metrics[key as Exclude<OverviewTrendMetric,'assets'>][index][channel] = source ? value : null;
    });
  }
  for (const assetType of ['Mixed','Message','Picture','Video'] as const) {
    const rows = sources.flatMap(source => source.rows.filter(row => row.assetType === assetType).map(row => ({...row, entityId:`${source.channel}:${row.entityId}`})));
    dates.forEach((date,index) => {
      metrics.assets[index][assetType] = rows.length ? new Set(rows.filter(row => row.date === date && (row.spend > 0 || (row.impressions ?? 0) > 0 || row.clicks > 0 || (row.delivered ?? 0) > 0)).map(row => row.entityId)).size : null;
    });
  }
  return metrics;
}
