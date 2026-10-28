/** Validate the Google Ads searchStream envelope before publishing source data. */
export function parseGoogleAdsResponse<T>(body:unknown):T[]{
 if(!Array.isArray(body))throw Error('Google Ads returned an invalid reporting response.');
 const rows:T[]=[];
 for(const item of body){
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Google Ads returned an invalid reporting response.');
  const batch=item as {error?:unknown;results?:unknown};
  if(batch.error)throw Error('Google Ads reporting returned an error.');
  if(batch.results===undefined)continue;
  if(!Array.isArray(batch.results)||batch.results.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Google Ads returned an invalid reporting response.');
  rows.push(...batch.results as T[]);
 }
 return rows;
}
