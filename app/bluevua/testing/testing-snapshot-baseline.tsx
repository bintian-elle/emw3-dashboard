'use client';

import {createContext,useContext,useEffect,type ReactNode} from 'react';
import type {TestingDataChannel} from '@/lib/testing-data-cache-contract';

type Baseline={key:string;versions:(string|null)[]};
const baselines=new Map<string,(string|null)[]>();
const listeners=new Set<(baseline:Baseline)=>void>();
type ScopedEntry={channel:TestingDataChannel;scopeKey:string;updatedAt:string};
const scopedVersions=createContext<readonly ScopedEntry[]>([]);

export function TestingScopedSnapshotProvider({entries,children}:{entries:readonly ScopedEntry[];children:ReactNode}){
 return <scopedVersions.Provider value={entries}>{children}</scopedVersions.Provider>;
}
export function useTestingScopedSnapshotVersion(channel:TestingDataChannel|null,scopeKey:string){
 return useContext(scopedVersions).find(entry=>entry.channel===channel&&entry.scopeKey===scopeKey)?.updatedAt??null;
}

/** Publish the version visible before a server render starts reading its data. */
export function TestingSnapshotBaseline({cacheKey,versions}:{cacheKey:string;versions:(string|null)[]}){
 useEffect(()=>{
  baselines.set(cacheKey,versions);
  for(const listener of listeners)listener({key:cacheKey,versions});
 },[cacheKey,versions]);
 return null;
}

export function getTestingSnapshotBaseline(key:string){return baselines.get(key)??null;}
export function clearTestingSnapshotBaseline(key:string){baselines.delete(key);}
export function subscribeTestingSnapshotBaseline(listener:(baseline:Baseline)=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
