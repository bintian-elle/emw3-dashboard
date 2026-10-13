import type {TestingPeriodInput} from "./testing-google";

const iso = (date:Date) => date.toISOString().slice(0,10);
const moveDays = (value:string,days:number) => { const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return iso(date); };
const validDate = (value?:string) => Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));

export function resolveTestingPeriod(latest:string,input:TestingPeriodInput) {
  const preset=input.preset??"lastWeek";
  if(preset==="custom"&&validDate(input.start)&&validDate(input.end)) {
    const end=input.end!>latest?latest:input.end!;
    return {start:input.start!<=end?input.start!:end,end};
  }
  if(preset==="last7")return {start:moveDays(latest,-6),end:latest};
  if(preset==="last30")return {start:moveDays(latest,-29),end:latest};
  if(preset==="last90")return {start:moveDays(latest,-89),end:latest};
  const latestDate=new Date(`${latest}T12:00:00Z`);
  if(preset==="mtd")return {start:iso(new Date(Date.UTC(latestDate.getUTCFullYear(),latestDate.getUTCMonth(),1))),end:latest};
  if(preset==="ytd")return {start:iso(new Date(Date.UTC(latestDate.getUTCFullYear(),0,1))),end:latest};
  const today=moveDays(latest,1);
  const todayDate=new Date(`${today}T12:00:00Z`);
  const daysSinceTuesday=(todayDate.getUTCDay()+5)%7;
  const currentTuesday=moveDays(today,-daysSinceTuesday);
  if(preset==="wtd")return {start:currentTuesday,end:latest<currentTuesday?currentTuesday:latest};
  return {start:moveDays(currentTuesday,-7),end:moveDays(currentTuesday,-1)};
}


export function testingLatestCompleteDate(){return new Date(Date.now()-86400000).toISOString().slice(0,10);}
