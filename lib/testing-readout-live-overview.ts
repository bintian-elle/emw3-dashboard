import {formatOverviewHeadlineMetrics,type OverviewHeadlineMetrics} from './overview-headline-metrics.ts';

const metricPatterns=[/\bspend\b|\bspent\b|花费|支出|投放费用/i,/\breach\b|触达|触及|覆盖人数/i,
 /\brevenue\b|\bconversion value\b|收入|营收|转化价值/i,/\bROAS\b|广告支出回报|投放回报/i,
 /\bpurchases?\b|\borders?\b|购买|订单/i,/\bCTR\b|点击率/i];
const channelStart=/^[\s“"'（(]*(?:Meta|Reddit|PMax|Google|Search|Demand Gen|EDM|Social|Video\s*\d|Image\s*\d|谷歌|社交媒体|视频\s*\d|图片\s*\d)\b/i;
const overallScope=/\btotal\b|\boverall\b|\bpaid\b|\bspend\b|\bspent\b|总触达|总收入|总花费|总购买|整体|总体|合计|共花费|付费/i;

function isOverallLead(text:string){
 if(channelStart.test(text.trim()))return false;
 if(/\bprevious\b|\bprior\b|\bversus\b|\bcompared\b|上期|前一周期|相比|对比/i.test(text))return false;
 if(!/\d|\bunavailable\b|not available|未知|缺失|无法计算|不可用|未提供|暂无|[零〇一二两三四五六七八九十百千万亿]+(?:美元|次|笔|人)/i.test(text))return false;
 if(/\bimprov|\bdeclin|\bbecause\b|\bdriven\b|\bdue to\b|提升|改善|下降|由于|因为/i.test(text))return false;
 const count=metricPatterns.filter(pattern=>pattern.test(text)).length;
 return count>=3||(count>=2&&overallScope.test(text))||(count===1&&overallScope.test(text));
}

/** Only remove a contiguous overall-metrics opening. All later AI evidence stays verbatim. */
export function overviewAnalysisWithoutTotals(summary:string|null|undefined):string{
 if(!summary)return '';
 const segments=new Intl.Segmenter('en',{granularity:'sentence'}).segment(summary);
 let removed=0;
 for(const segment of segments){
  const text=segment.segment;
  // A channel insight may share the opening sentence after a semicolon.
  const insight=text.search(/[;；]\s*(?=(?:Meta|Reddit|PMax|Google|Search|Demand Gen|EDM|Social|Video\s*\d|Image\s*\d|谷歌|视频|图片)\b)/i);
  if(insight>=0&&isOverallLead(text.slice(0,insight))){
   const offset=summary.indexOf(text,removed)+insight+1;
   return summary.slice(offset).trimStart();
  }
  if(!isOverallLead(text))break;
  removed=segment.index+text.length;
 }
 return removed?summary.slice(removed).trimStart():summary;
}

export function liveOverviewExecutiveSummary(summary:string|null|undefined,metrics:OverviewHeadlineMetrics,language:'en'|'zh'){
 const value=formatOverviewHeadlineMetrics(metrics);
 const lead=language==='zh'
  ?`花费：${value.spend}；总触达：${value.totalReach}；收入：${value.revenue}；付费 ROAS：${value.roas}；购买数：${value.orders}；CTR：${value.ctr}。`
  :`Spend: ${value.spend} · Total Reach: ${value.totalReach} · Revenue: ${value.revenue} · Paid ROAS: ${value.roas} · Purchases: ${value.orders} · CTR: ${value.ctr}.`;
 const analysis=overviewAnalysisWithoutTotals(summary);
 return analysis?`${lead}\n\n${analysis}`:lead;
}
