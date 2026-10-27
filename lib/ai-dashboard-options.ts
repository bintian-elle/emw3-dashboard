export const PROJECTS=[{id:'bluevua',name:'Bluevua',available:true},{id:'biceek',name:'Biceek',available:true},{id:'ringconn',name:'RingConn',available:true}] as const;
export type ProjectId=typeof PROJECTS[number]['id'];
export function projectFor(id:unknown){const project=PROJECTS.find(p=>p.id===id);if(!project)throw Error('Unknown project.');return project;}
export function moveWidget(order:string[],from:string,target:string){const start=order.indexOf(from),end=order.indexOf(target);if(start<0||end<0||start===end)return order;const next=[...order];next.splice(start,1);next.splice(end,0,from);return next;}
export function validateWidgetOrder(value:unknown,ids:string[]):string[]{if(!Array.isArray(value)||value.length!==ids.length||new Set(value).size!==ids.length||!value.every(id=>typeof id==='string'&&ids.includes(id)))throw Error('Invalid widget order.');return value as string[];}
export function visibleWidgetIds(ids:string[],order:string[],hidden:string[]){const allowed=new Set(ids),removed=new Set(hidden);return [...new Set([...order,...ids])].filter(id=>allowed.has(id)&&!removed.has(id));}
