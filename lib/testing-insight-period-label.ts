/** Display dates only; comparison data coverage is validated separately. */
export function testingInsightPeriodLabel(period:{start:string;end:string},language:string='zh'){
 const start=new Date(`${period.start}T12:00:00Z`),end=new Date(`${period.end}T12:00:00Z`);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start)return '';
 const days=Math.round((end.getTime()-start.getTime())/86400000)+1;
 const previousEnd=new Date(start.getTime()-86400000),previousStart=new Date(start.getTime()-days*86400000);
 const short=(date:Date)=>`${date.getUTCMonth()+1}/${String(date.getUTCDate()).padStart(2,'0')}`;
 return `${language==='zh'?'本期':'Current'} ${short(start)}–${short(end)} · ${language==='zh'?'对比':'Compare'} ${short(previousStart)}–${short(previousEnd)}`;
}
