export function validTestingReadoutKeys(rawKeys:readonly string[]){
 const keys=[...new Set(rawKeys)].filter(key=>/^(period:concluded:[a-z0-9-]+|period:social-lifetime|period:reddit-lifetime|period:[a-z-]+:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}(?::\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2})?)$/.test(key));
 return keys.length>0&&keys.length<=8&&keys.length===rawKeys.length?keys:null;
}
