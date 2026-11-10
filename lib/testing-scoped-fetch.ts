import {testingReportScope,type TestingReportChannel,type TestingReportRange} from './testing-report-scope.ts';

type Request={channel:TestingReportChannel;current:TestingReportRange;previous:TestingReportRange|null;period:'current'|'previous'};
/** Providers receive only a server-computed period and must return its exact bounds. */
export async function fetchTestingPeriod<T extends {period:TestingReportRange}>(request:Request,provider:(range:TestingReportRange)=>Promise<T>):Promise<T|null>{
 const scope=testingReportScope(request.channel,request.current,request.previous);
 const range=scope[request.period];
 if(!range)return null;
 const data=await provider({...range});
 if(data.period?.start!==range.start||data.period?.end!==range.end)throw Error('Testing data period mismatch');
 return data;
}

/** Bind channel and dates on the server; a caller can select a period, not define one. */
export function createTestingDataGateway<T extends {period:TestingReportRange}>(report:Omit<Request,'period'>,provider:(range:TestingReportRange)=>Promise<T>){
 const bound={...report,current:{...report.current},previous:report.previous?{...report.previous}:null};
 return async (period:'current'|'previous')=>{
  if(period!=='current'&&period!=='previous')throw Error('Invalid period selector');
  return fetchTestingPeriod({...bound,period},provider);
 };
}
