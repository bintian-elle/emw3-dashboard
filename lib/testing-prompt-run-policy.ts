/** Private prompt discussions stay on their existing shared chat transport, never in trial history or Overview sources. */
export function reviewLocalPromptQueueEnabled(environment:NodeJS.ProcessEnv=process.env){return environment.NODE_ENV==='development'||environment.LOCAL_PRODUCTION_PREVIEW==='1';}
export function promptRunRouting(channel:string,frozen:unknown,local:boolean){
 const chat=!!frozen&&typeof frozen==='object'&&!!(frozen as {chat?:unknown}).chat;
 return {queue:local&&!chat?'local' as const:'shared' as const,visibleTrial:!chat,overviewSources:channel==='overview'&&!chat};
}
