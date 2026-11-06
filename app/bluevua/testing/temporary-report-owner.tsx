'use client';
import {createContext,useContext,useEffect,type ReactNode} from 'react';
import {clearOldLocalTemporaryReports} from './temporary-report-cache';
const Context=createContext<{owner:string;revisions:Record<string,string>}>({owner:'',revisions:{}});
export function TemporaryReportOwnerProvider({owner,revisions,clearLocalCache,children}:{owner:string;revisions:Record<string,string>;clearLocalCache?:boolean;children:ReactNode}){useEffect(()=>{if(clearLocalCache)clearOldLocalTemporaryReports();},[clearLocalCache]);return <Context.Provider value={{owner,revisions}}>{children}</Context.Provider>;}
export function useTemporaryReportContext(){return useContext(Context);}
