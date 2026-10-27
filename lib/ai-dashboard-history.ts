export type LayoutState={order:string[];hidden:string[]};
export type LayoutHistoryEntry={label:string;before:LayoutState;after:LayoutState};
const copy=(state:LayoutState):LayoutState=>({order:[...state.order],hidden:[...state.hidden]});
export function recordLayoutChange(history:LayoutHistoryEntry[],before:LayoutState,after:LayoutState,label:string){
 if(JSON.stringify(before)===JSON.stringify(after))return history;
 return [...history,{label,before:copy(before),after:copy(after)}];
}
export function undoLayoutChange(current:LayoutState,history:LayoutHistoryEntry[],future:LayoutHistoryEntry[]=[]){
 if(!history.length)return{layout:copy(current),history,future};
 const entry=history[history.length-1];
 return{layout:copy(entry.before),history:history.slice(0,-1),future:[...future,{label:entry.label,before:copy(entry.before),after:copy(entry.after)}]};
}
export function redoLayoutChange(current:LayoutState,history:LayoutHistoryEntry[],future:LayoutHistoryEntry[]){
 if(!future.length)return{layout:copy(current),history,future};
 const entry=future[future.length-1];
 return{layout:copy(entry.after),history:[...history,{label:entry.label,before:copy(entry.before),after:copy(entry.after)}],future:future.slice(0,-1)};
}
export function commitLayoutChange(before:LayoutState,history:LayoutHistoryEntry[],future:LayoutHistoryEntry[],after:LayoutState,label:string){
 const next=recordLayoutChange(history,before,after,label);
 return{layout:copy(after),history:next,future:next===history?future:[]};
}
export function parseLayoutHistory(value:unknown):LayoutHistoryEntry[]{
 const layout=(v:unknown):v is LayoutState=>!!v&&typeof v==='object'&&['order','hidden'].every(key=>Array.isArray((v as Record<string,unknown>)[key])&&((v as Record<string,string[]>)[key]).every(id=>typeof id==='string'));
 return Array.isArray(value)?value.filter((item):item is LayoutHistoryEntry=>!!item&&typeof item.label==='string'&&layout(item.before)&&layout(item.after)):[];
}
