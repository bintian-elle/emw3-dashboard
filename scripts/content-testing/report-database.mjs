/** Isolate durable report storage from the upstream dashboard source database. */
export function reportDatabaseConfig(env=process.env){
 const connectionString=(env.CONTENT_TESTING_REPORTS_DATABASE_URL||env.KLAVIYO_DATABASE_URL||'').trim();
 if(!connectionString)throw Error('Report database is not configured');
 const host=new URL(connectionString).hostname;
 return {connectionString,ssl:['127.0.0.1','localhost','[::1]','::1'].includes(host)?false:{rejectUnauthorized:false}};
}
