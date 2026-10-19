const months=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
export function campaignNameDate(name:string):number{
 const matches=[...name.matchAll(/(?:^|[^a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[ _-]?(\d{4}|\d{2})(?=$|[^0-9])/gi)];
 const match=matches.at(-1);if(!match)return 0;const year=Number(match[2]);return (year<100?2000+year:year)*12+months.indexOf(match[1].slice(0,3).toLowerCase());
}
export function compareCampaignNamesNewestFirst(a:string,b:string):number{return campaignNameDate(b)-campaignNameDate(a)||a.localeCompare(b);}
