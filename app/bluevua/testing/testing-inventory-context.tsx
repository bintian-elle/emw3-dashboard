'use client';

import {createContext,use,useContext,type ReactNode} from 'react';
import type {TestingInventory} from '@/lib/testing-inventory-model';

// Share the published campaign details while switching Testing views, without
// re-reading the database on each page transition. Counts are configured separately.
const TestingInventoryContext=createContext<Promise<TestingInventory>|null>(null);

export function TestingInventoryProvider({inventory,children}:{inventory:Promise<TestingInventory>;children:ReactNode}){
 return <TestingInventoryContext.Provider value={inventory}>{children}</TestingInventoryContext.Provider>;
}

export function useTestingInventory(){
 const inventory=useContext(TestingInventoryContext);
 if(!inventory)throw new Error('Testing inventory must be used within TestingInventoryProvider.');
 return use(inventory);
}
