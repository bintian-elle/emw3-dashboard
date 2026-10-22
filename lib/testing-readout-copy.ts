/** Checklist tags remain in the generation job for coverage validation, never in dashboard copy. */
export function cleanTestingReadoutCopy<T>(value:T):T {
 if(typeof value==='string'){
  if(value.startsWith('[FRAMEWORK] '))return value;
  return value.replace(/\[(?:(?:OV|GS|PM|DG|MT|RD|SM|ED)-[A-Z-]+(?:[, ]+)*)+\]\s*/g,'').replace(/\b(?:OV|GS|PM|DG|MT|RD|SM|ED)-[A-Z-]+:\s*/g,'') as T;
 }
 if(Array.isArray(value))return value.map(item=>cleanTestingReadoutCopy(item)) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cleanTestingReadoutCopy(item)])) as T;
 return value;
}
