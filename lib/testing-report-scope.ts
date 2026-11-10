/** First day included in this round of Content Testing, in the channel's reporting date. */
export const contentTestingStartDates = {
  'google-search': '2026-10-08',
  'google-pmax': '2026-10-19',
  'google-demand-gen': '2026-10-19',
  meta: '2026-10-12',
  reddit: '2026-09-24',
  'social-media': '2026-09-07',
  edm: '2026-09-18',
} as const;

export type TestingReportChannel = keyof typeof contentTestingStartDates;
export type TestingReportRange = {start:string;end:string};

/** Null means the selected period is wholly before the test, not zero performance. */
export function testingReportScope(channel:TestingReportChannel,current:TestingReportRange,previous:TestingReportRange|null){
 const start=contentTestingStartDates[channel];
 const clip=(range:TestingReportRange|null):TestingReportRange|null=>!range||range.end<start?null:{start:range.start<start?start:range.start,end:range.end};
 return {testStart:start,current:clip(current),previous:clip(previous)};
}

/** Preserve post identity and creative context, never current lifetime metrics. */
export function socialPostsForReport(posts:Array<{code:string;publishedAt:string|null;id?:string;url?:string;caption?:string;mediaType?:string|null;thumbnailUrl?:string|null}>,range:TestingReportRange|null){
 if(!range)return [];
 return posts.filter(post=>post.publishedAt&&post.publishedAt.slice(0,10)>=contentTestingStartDates['social-media']&&post.publishedAt.slice(0,10)<=range.end).map(({code,publishedAt,id,url,caption,mediaType,thumbnailUrl})=>({code,publishedAt,...(id?{id}:{}),...(url?{url}:{}),...(caption?{caption}:{}),...(mediaType?{mediaType}:{}),...(thumbnailUrl?{thumbnailUrl}:{})}));
}
