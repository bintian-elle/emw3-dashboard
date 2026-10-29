'use client';

import {useEffect,useState} from 'react';

type VersionState={revision:number;expected:string|null};
type Metadata={key:string;updatedAt:string|null;translationAt:string|null;sourceHash:string|null};
type Entry={keys:string[];listeners:Set<(version:VersionState)=>void>;revision:number;fingerprint:string|null};
type Poller={language:string;entries:Map<string,Entry>;timer?:ReturnType<typeof setTimeout>;controller?:AbortController;running:boolean;dirty:boolean};
const active=new Map<string,Poller>();
let nextRevision=0;

function schedule(poller:Poller,delay:number){
 if(poller.timer)clearTimeout(poller.timer);
 if(poller.running){poller.dirty=true;return;}
 if(poller.entries.size)poller.timer=setTimeout(()=>void poll(poller),delay);
}
async function poll(poller:Poller){
 if(poller.running||!poller.entries.size)return;
 poller.running=true;poller.dirty=false;poller.controller=new AbortController();
 try{
  const keys=[...new Set([...poller.entries.values()].flatMap(entry=>entry.keys))].sort();
  const records:Metadata[]=[];
  for(let index=0;index<keys.length;index+=8){
   const query=new URLSearchParams({language:poller.language});keys.slice(index,index+8).forEach(key=>query.append('key',key));
   const response=await fetch(`/api/testing/readout-versions?${query}`,{cache:'no-store',signal:poller.controller.signal});
   if(!response.ok)throw Error('Readout version unavailable');
   const data:unknown=await response.json();
   if(!data||typeof data!=='object'||!('versions' in data)||!Array.isArray(data.versions))throw Error('Invalid version response');
   records.push(...data.versions as Metadata[]);
  }
  const byKey=new Map(records.map(record=>[record.key,record]));
  for(const entry of poller.entries.values()){
   if(entry.keys.some(key=>!byKey.has(key)))continue;
   const fingerprint=JSON.stringify(entry.keys.map(key=>byKey.get(key)));
   // The first comparison reconciles a change between a cached read and polling.
   if(fingerprint!==entry.fingerprint){entry.fingerprint=fingerprint;entry.revision=++nextRevision;for(const listener of entry.listeners)listener({revision:entry.revision,expected:fingerprint});}
  }
 }catch{/* Keep the currently displayed published summary on failure. */}
 finally{poller.running=false;if(poller.entries.size)schedule(poller,poller.dirty?0:30_000);}
}

/** Share a batched metadata check across all visible summary cards per language. */
export function useReadoutVersion(keys:readonly (string|null)[],language:string){
 const identity=JSON.stringify([language,[...new Set(keys.filter((key):key is string=>Boolean(key)))].sort()]);
 const [version,setVersion]=useState<VersionState&{identity:string}>({identity:'',revision:0,expected:null});
 useEffect(()=>{
  const [lang,selected]=JSON.parse(identity) as [string,string[]];
  if(!selected.length)return;
  let poller=active.get(lang);
  if(!poller){poller={language:lang,entries:new Map(),running:false,dirty:false};active.set(lang,poller);}
  const current=poller;
  let entry=current.entries.get(identity);
  if(!entry){entry={keys:selected,listeners:new Set(),revision:0,fingerprint:null};current.entries.set(identity,entry);schedule(current,0);}
  const group=entry;
  const listener=(value:VersionState)=>setVersion({...value,identity});group.listeners.add(listener);
  if(group.fingerprint)queueMicrotask(()=>{if(group.listeners.has(listener))listener({revision:group.revision,expected:group.fingerprint});});
  return ()=>{
   group.listeners.delete(listener);
   if(!group.listeners.size)current.entries.delete(identity);
   if(!current.entries.size){if(current.timer)clearTimeout(current.timer);current.controller?.abort();active.delete(lang);}
  };
 },[identity]);
 return version.identity===identity?version:{revision:0,expected:null};
}
