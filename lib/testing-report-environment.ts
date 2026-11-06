/** Local staging can explicitly review the same saved reports as local production. */
export function reportDatabaseEnvironment(environment:NodeJS.ProcessEnv=process.env):'staging'|'production'{
 if(environment.DEPLOYMENT_ENV==='staging'&&environment.STAGING_USE_PRODUCTION_REPORTS==='1')return 'production';
 if(environment.NODE_ENV==='development'&&environment.DEPLOYMENT_ENV==='staging'&&environment.LOCAL_STAGING_REPORT_ENV==='production')return 'production';
 return environment.DEPLOYMENT_ENV==='staging'?'staging':'production';
}
export function usesUnifiedLocalReports(environment:NodeJS.ProcessEnv=process.env):boolean{
 return environment.LOCAL_PRODUCTION_PREVIEW==='1'||(environment.NODE_ENV==='development'&&environment.DEPLOYMENT_ENV==='staging'&&environment.LOCAL_STAGING_REPORT_ENV==='production');
}
export function usesUnifiedReports(environment:NodeJS.ProcessEnv=process.env):boolean{
 return usesUnifiedLocalReports(environment)||(environment.DEPLOYMENT_ENV==='staging'&&environment.STAGING_USE_PRODUCTION_REPORTS==='1');
}
