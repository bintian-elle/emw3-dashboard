export function singleBucketUniqueRecipients(values:number[]):number|null{
 const active=values.filter(value=>value>0);
 return active.length>1?null:active[0]??0;
}
