const DAY = 86400000;
const format = (date) => date.toISOString().slice(0, 10);
const shift = (date, days) => new Date(date.getTime() + days * DAY);
function parseDate(value) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid report date');
 const date = new Date(`${value}T00:00:00Z`);
 if (!Number.isFinite(date.getTime()) || format(date) !== value) throw new Error('Invalid report date');
 return date;
}
export function scheduledReports(reportingDate) {
 const date = parseDate(reportingDate), yesterday = shift(date, -1), before = shift(date, -2);
 const reports = [{kind:'daily',start:format(yesterday),end:format(yesterday),compareStart:format(before),compareEnd:format(before)}];
 if (date.getUTCDay() === 2) reports.push({kind:'weekly',start:format(shift(date,-7)),end:format(yesterday),compareStart:format(shift(date,-14)),compareEnd:format(shift(date,-8))});
 if (date.getUTCDate() === 1) {
  const year=date.getUTCFullYear(), month=date.getUTCMonth();
  reports.push({kind:'monthly',start:format(new Date(Date.UTC(year,month-1,1))),end:format(yesterday),compareStart:format(new Date(Date.UTC(year,month-2,1))),compareEnd:format(new Date(Date.UTC(year,month-1,0)))});
 }
 return reports;
}
