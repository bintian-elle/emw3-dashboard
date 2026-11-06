import 'server-only';
import {readIntegratedReports as readStagingReports} from './testing-integrated-reports';
import {localProductionReportRun,readStoredRun,readStoredWeeklyRun} from './testing-report-store.server';
import {resolveTestingPeriod,testingLatestCompleteDate} from './testing-period';
import {reportDatabaseEnvironment} from './testing-report-environment';
export {integratedReportDirectory,type IntegratedReportBundle} from './testing-integrated-reports';
export async function readIntegratedReports(){
 if(process.env.LOCAL_PRODUCTION_PREVIEW==='1'&&process.env.LOCAL_PRODUCTION_REPORT_DIR)return readStagingReports();
 const run=localProductionReportRun();
 if(run)return readStoredRun(run);
 if(process.env.DEPLOYMENT_ENV==='staging'&&reportDatabaseEnvironment()==='staging')return readStagingReports();
 const period=resolveTestingPeriod(testingLatestCompleteDate(),{preset:'lastWeek'});
 try{return await readStoredWeeklyRun(period.start,period.end);}catch{return null;}
}
