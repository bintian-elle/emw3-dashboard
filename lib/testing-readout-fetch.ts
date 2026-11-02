import {createInsightCache} from './testing-insight-browser-cache.ts';
/** Bound readout requests so a stalled connection cannot stop subsequent polling. */
async function networkReadoutJson<T>(url: string, signal?: AbortSignal, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Readout request failed');
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

let browserCache:ReturnType<typeof createInsightCache>|undefined;
export async function fetchTestingReadoutJson<T>(url:string,signal?:AbortSignal,timeoutMs=12000):Promise<T>{
 if(typeof document==='undefined'||!/^\/api\/testing\/(?:preview|readouts)\?/.test(url))return networkReadoutJson<T>(url,signal,timeoutMs);
 const owner=document.documentElement.dataset.insightCacheOwner;
 if(!owner)return networkReadoutJson<T>(url,signal,timeoutMs);
 if(!browserCache){let store:Pick<Storage,'getItem'|'setItem'>;try{store=localStorage;}catch{store={getItem:()=>null,setItem:()=>{}};}browserCache=createInsightCache(store,url=>networkReadoutJson(url,undefined,timeoutMs));}
 return browserCache.read(url,owner) as Promise<T>;
}

/** A completed manual generation invalidates remembered empty periods. */
export function invalidateMissingTestingReadouts(periodKey?:string){
 const owner=typeof document==='undefined'?undefined:document.documentElement.dataset.insightCacheOwner;
 if(owner){browserCache?.invalidateMissing(owner);if(periodKey)browserCache?.invalidatePeriod(owner,periodKey);}
}
