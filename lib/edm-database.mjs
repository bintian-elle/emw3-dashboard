/** The EDM warehouse is independent of the shared Testing/AI application stores. */
export function edmDatabaseConfig(env=process.env){
 const connectionString=(env.EDM_DATABASE_URL||env.KLAVIYO_DATABASE_URL||'').trim();
 if(!connectionString)throw Error('EDM database is not configured.');
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Invalid EDM database connection.');
 return {connectionString,ssl:['localhost','127.0.0.1','[::1]','::1'].includes(url.hostname)?false:{rejectUnauthorized:false}};
}
