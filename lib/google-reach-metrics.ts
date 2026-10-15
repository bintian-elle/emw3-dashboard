export type GoogleReachRow={campaign:{name:string};metrics?:{uniqueUsers?:string|number}};
export function googleReachValues(names:readonly string[],rows:GoogleReachRow[]):Record<string,number|null>{
 const values:Record<string,number|null>=Object.fromEntries(names.map(name=>[name,null]));
 for(const row of rows){const raw=row.metrics?.uniqueUsers;if(raw!=null&&Number.isFinite(Number(raw)))values[row.campaign.name]=Number(raw);}
 return values;
}
