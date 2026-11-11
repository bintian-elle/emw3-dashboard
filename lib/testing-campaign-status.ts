export function testingCampaignStatus(status:string,zh:boolean){
 const normalized=status.trim().toUpperCase();
 if(['ACTIVE','ENABLED','SERVING'].includes(normalized))return {tone:'active',label:zh?'投放中':'Active'} as const;
 if(['PAUSED','CAMPAIGN_PAUSED'].includes(normalized))return {tone:'paused',label:zh?'已暂停':'Paused'} as const;
 if(['SENT','COMPLETED'].includes(normalized))return {tone:'sent',label:zh?'已发送':'Sent'} as const;
 if(['ENDED','REMOVED','ARCHIVED'].includes(normalized))return {tone:'ended',label:zh?'已结束':'Ended'} as const;
 if(normalized==='CONCLUDED')return {tone:'ended',label:zh?'已结束':'Concluded'} as const;
 return {tone:'unknown',label:normalized&&normalized!=='UNKNOWN'?status:(zh?'状态未知':'Unknown')} as const;
}

/** Put active campaigns first while preserving the original order within each group. */
export function activeCampaignsFirst<T>(items:readonly T[],status:(item:T)=>string):T[]{
 return [...items].sort((a,b)=>Number(testingCampaignStatus(status(b),false).tone==='active')-Number(testingCampaignStatus(status(a),false).tone==='active'));
}
