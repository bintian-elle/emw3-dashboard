/** The current Social table is a Lifetime snapshot through its actual capture date. */
export function socialSnapshotPeriod(snapshot:{capturedAt:string;posts:readonly {publishedAt:string|null|undefined}[]}):{start:string;end:string}|null{
 const captured=Date.parse(snapshot.capturedAt);if(!Number.isFinite(captured))return null;
 const end=new Date(captured).toISOString().slice(0,10);
 const dates=snapshot.posts.flatMap(post=>{const value=Date.parse(post.publishedAt??'');return Number.isFinite(value)?[new Date(value).toISOString().slice(0,10)]:[];}).filter(day=>day<=end).sort();
 return dates[0]?{start:dates[0],end}:null;
}
