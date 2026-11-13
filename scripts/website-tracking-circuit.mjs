// A failed shared connection/quota must not trigger another request for every scope.
export function trackingRefreshCircuit(){
 let blocked;
 const sharedCodes=new Set(['rate_limited','network_error','upstream_unavailable','authentication_failed','permission_denied','queue_timeout']);
 return {
  failure(device,scope,detail={code:'refresh_failed'}){
   const failure={...detail,device,scope};
   if(sharedCodes.has(detail.code))blocked={...detail};
   return failure;
  },
  skipped(device,scope){return blocked?{...blocked,device,scope,skippedAfterSharedFailure:true}:undefined;},
 };
}
