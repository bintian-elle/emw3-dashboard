'use client';

import {createContext,useContext,type ReactNode} from 'react';

const StagingContext=createContext(false);
export function TestingStagingProvider({enabled,children}:{enabled:boolean;children:ReactNode}){
 return <StagingContext.Provider value={enabled}>{children}</StagingContext.Provider>;
}
export function useTestingStaging(){return useContext(StagingContext);}
