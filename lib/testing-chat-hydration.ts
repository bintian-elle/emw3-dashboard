/** Keep remote private history dormant until a user opens it or a saved job needs recovery. */
export function shouldSyncTestingChatHistory(ready:boolean,opened:boolean,activeJobId:string|undefined,conversationId:string,loadedFor:string){
 return ready&&(opened||Boolean(activeJobId))&&conversationId!==loadedFor;
}

/** A directly submitted insight waits until its original conversation is resolved. */
export function testingDirectAskState(input:{opened:boolean;ready:boolean;historyLoading:boolean;conversationId:string;busy:boolean}):'wait'|'send'|'reject'{
 if(!input.opened)return 'reject';
 if(!input.ready||input.historyLoading)return 'wait';
 if(input.conversationId==='latest'||input.busy)return 'reject';
 return 'send';
}
