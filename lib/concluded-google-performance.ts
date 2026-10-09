import "server-only";
import {concludedTestsForChannel} from "@/lib/concluded-tests";
import {readConcludedSnapshot} from "@/lib/concluded-test-snapshot";
import {concludedReportForPeriod} from "@/lib/concluded-test-period";

/** Shared reporting scope for channel detail and Performance Overview. */
export async function getConcludedGooglePerformance(period:{start:string;end:string}|null|undefined,periodLabel:string) {
 if(!period)return [];
 const selected=await Promise.all(concludedTestsForChannel("Google").map(async definition=>{
  const snapshot=await readConcludedSnapshot(definition.id);
  const report=snapshot?concludedReportForPeriod(snapshot.report,snapshot.dailyGroups??[],period,periodLabel):null;
  return report?{definition,report,concludedOn:snapshot?.report.period?.end??definition.lifetime?.end}:null;
 }));
 return selected.filter(item=>item!==null);
}
