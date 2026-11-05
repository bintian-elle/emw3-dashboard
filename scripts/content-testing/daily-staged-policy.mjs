export function stagedDailyDatabase(env){
 if(env.STAGING_CONTENT_TESTING_STAGED_DAILY!=='1')return null;
 if(env.DEPLOYMENT_ENV!=='staging')throw Error('Staged daily generation is only available in staging.');
 const target=env.STAGING_CONTENT_TESTING_DATABASE_URL;
 if(!target||!env.KLAVIYO_DATABASE_URL)throw Error('Both staging and existing database identities are required.');
 const identity=value=>{const url=new URL(value);if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.pathname||url.pathname==='/')throw Error('Invalid database identity.');return `${url.hostname.toLowerCase()}:${url.port||'5432'}${url.pathname}`;};
 if(identity(target)===identity(env.KLAVIYO_DATABASE_URL))throw Error('A distinct staging readout database is required.');
 return target;
}
