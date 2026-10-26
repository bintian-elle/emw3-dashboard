"use client";

import {useEffect} from "react";

/** Keeps existing table headers visible without changing horizontal scrolling or table semantics. */
export function FloatingTableHeaders(){
 useEffect(()=>{
  const overlay=document.createElement("div");
  overlay.className="fixed z-30 overflow-hidden border-b border-border-table bg-background-secondary-default shadow-card";
  // The original header remains the accessible, keyboard-operable source of truth.
  overlay.setAttribute("aria-hidden","true");
  overlay.hidden=true;
  const scrollbar=document.createElement("div");
  scrollbar.className="fixed z-30 overflow-x-scroll overflow-y-hidden bg-background-secondary-default";
  scrollbar.setAttribute("role","region");
  scrollbar.setAttribute("aria-label","Scroll table horizontally");
  scrollbar.tabIndex=0;
  scrollbar.hidden=true;
  const track=document.createElement("div");
  track.style.height="1px";
  scrollbar.append(track);
  document.body.append(overlay,scrollbar);
  let tables:HTMLTableElement[]=[],active:HTMLTableElement|null=null,frame=0,dirty=true;
  let horizontalSource:HTMLElement|null=null;
  const resize=new ResizeObserver(()=>{dirty=true;schedule();});
  function scan(){
   const next=Array.from(document.querySelectorAll<HTMLTableElement>("table")).filter(table=>!overlay.contains(table)&&table.tHead);
   if(next.length!==tables.length||next.some((table,index)=>table!==tables[index])){
    resize.disconnect();tables=next;
    tables.forEach(table=>resize.observe(table));
    document.querySelectorAll("[data-testing-header]").forEach(header=>resize.observe(header));
   }
  }
  function cloneHeader(table:HTMLTableElement){
   const clone=table.cloneNode(false) as HTMLTableElement;
   const head=table.tHead!.cloneNode(true) as HTMLTableSectionElement;
   clone.removeAttribute("id");
   clone.style.tableLayout="fixed";
   clone.style.minWidth="0";
   clone.style.maxWidth="none";
   clone.append(head);
   head.querySelectorAll<HTMLElement>("[id]").forEach(node=>node.removeAttribute("id"));
   head.querySelectorAll<HTMLElement>("a,button,input,select,textarea,[tabindex]").forEach(node=>node.tabIndex=-1);
   const originals=Array.from(table.tHead!.querySelectorAll("th,td"));
   head.querySelectorAll<HTMLElement>("th,td").forEach((cell,index)=>{
    const original=originals[index] as HTMLElement;
    const style=getComputedStyle(original);
    cell.style.width=`${original.getBoundingClientRect().width}px`;
    cell.style.boxSizing="border-box";
    for(const key of ["paddingLeft","paddingRight","paddingTop","paddingBottom","fontSize","fontWeight","lineHeight","letterSpacing","textAlign"] as const)cell.style[key]=style[key];
    cell.style.backgroundColor="var(--color-background-secondary-default)";
   });
   overlay.replaceChildren(clone);
  }
  function update(){
   frame=0;scan();
   let top=0;
   document.querySelectorAll<HTMLElement>("[data-testing-header]").forEach(header=>{
    const rect=header.getBoundingClientRect();
    if(getComputedStyle(header).position==="sticky"&&rect.bottom>0&&rect.top<=1)top=Math.max(top,rect.bottom);
   });
   let candidate:HTMLTableElement|null=null;
   for(const table of tables){
    const rect=table.getBoundingClientRect(),head=table.tHead!.getBoundingClientRect();
    if(rect.width>0&&head.height>0&&head.top<top&&rect.bottom>top+head.height){candidate=table;break;}
   }
   if(!candidate){overlay.hidden=true;scrollbar.hidden=true;active=null;horizontalSource=null;return;}
   if(active!==candidate||dirty){cloneHeader(candidate);dirty=false;}
   active=candidate;
   const rect=active.getBoundingClientRect(),head=active.tHead!.getBoundingClientRect();
   let left=Math.max(0,rect.left),right=Math.min(window.innerWidth,rect.right);
   horizontalSource=null;
   // Clip the floating header to the same horizontally scrollable viewport as the source.
   for(let parent=active.parentElement;parent;parent=parent.parentElement){
    const overflow=getComputedStyle(parent).overflowX;
    if(!horizontalSource&&/auto|scroll/.test(overflow)&&parent.scrollWidth>parent.clientWidth+1)horizontalSource=parent;
    if(/auto|scroll|hidden|clip/.test(overflow)){
     const bounds=parent.getBoundingClientRect();
     left=Math.max(left,bounds.left+parent.clientLeft);
     right=Math.min(right,bounds.left+parent.clientLeft+parent.clientWidth);
    }
   }
   overlay.hidden=right<=left;
   overlay.style.left=`${left}px`;overlay.style.top=`${top}px`;
   overlay.style.width=`${Math.max(0,right-left)}px`;overlay.style.height=`${head.height}px`;
   const clone=overlay.firstElementChild as HTMLElement;
   clone.style.width=`${rect.width}px`;
   clone.style.transform=`translateX(${rect.left-left}px)`;
   scrollbar.hidden=overlay.hidden||!horizontalSource;
   if(horizontalSource){
    scrollbar.style.left=`${left}px`;scrollbar.style.top=`${top+head.height}px`;
    scrollbar.style.width=`${Math.max(0,right-left)}px`;
    scrollbar.style.height="16px";
    track.style.width=`${horizontalSource.scrollWidth}px`;
    if(Math.abs(scrollbar.scrollLeft-horizontalSource.scrollLeft)>1)scrollbar.scrollLeft=horizontalSource.scrollLeft;
   }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function forwardClick(event:MouseEvent){
   const target=event.target as HTMLElement,cell=target.closest("th,td");
   if(!active||!cell)return;
   const cells=Array.from(overlay.querySelectorAll("th,td")),index=cells.indexOf(cell);
   const original=active.tHead!.querySelectorAll<HTMLElement>("th,td")[index];
   if(!original)return;
   // Match the actual clicked descendant (React Aria sorts on the column itself).
   const path:number[]=[];let node:Element|null=target;
   while(node&&node!==cell){path.unshift(Array.from(node.parentElement!.children).indexOf(node));node=node.parentElement;}
   let source:Element=original;
   for(const position of path){source=source.children[position]??source;}
   const control=source.closest<HTMLElement>("button,a,[role=button]");
   (control&&original.contains(control)?control:original).click();
   dirty=true;schedule();
  }
  const mutations=new MutationObserver(records=>{
   if(records.every(record=>overlay.contains(record.target)||record.target===overlay||scrollbar.contains(record.target)||record.target===scrollbar))return;
   dirty=true;schedule();
  });
  mutations.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","style","hidden","aria-sort"]});
  overlay.addEventListener("click",forwardClick);
  scrollbar.addEventListener("scroll",()=>{
   if(horizontalSource&&Math.abs(horizontalSource.scrollLeft-scrollbar.scrollLeft)>1)horizontalSource.scrollLeft=scrollbar.scrollLeft;
   schedule();
  },{passive:true});
  window.addEventListener("scroll",schedule,{capture:true,passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  schedule();
  return ()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();window.removeEventListener("scroll",schedule,true);window.removeEventListener("resize",schedule);overlay.remove();scrollbar.remove();};
 },[]);
 return null;
}
