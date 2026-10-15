export const instagramPostCodes=["Dc_e4Z-BK5c","DdEoeBPAfCh","DdHC5tMlDYj","DdJyCDsAEhZ","DdWfe6gm0qZ","Ddbq5u9m4MQ","Ddg4Hnzz8sr","DdmD9fETqmA","DdwXrfWT7ci","Dd9OpQ6FI6x"] as const;
export const socialMetrics=["views","reach","likes","comments","shares","saved","follows"] as const;
export type SocialMetric=(typeof socialMetrics)[number];
export type SocialPost={code:string;id?:string;url:string;caption:string;publishedAt:string|null;mediaType:string|null;thumbnailUrl:string|null;metrics:Record<SocialMetric,number|null>;status:"available"|"partial"|"unavailable"};
export type MediaInsight={name:string;values?:Array<{value:unknown}>;total_value?:{value:unknown}};
export function insightValues(rows:MediaInsight[]):Record<SocialMetric,number|null>{
 return Object.fromEntries(socialMetrics.map(metric=>{const row=rows.find(item=>item.name===metric);const raw=row?.total_value?.value??row?.values?.[0]?.value;return [metric,typeof raw==="number"&&Number.isFinite(raw)?raw:null];})) as Record<SocialMetric,number|null>;
}
