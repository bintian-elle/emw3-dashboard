'use client';
import {createContext,useContext,type ReactNode} from 'react';
const ReviewPreviewContext=createContext(false);
export function ReviewPreviewProvider({enabled,children}:{enabled:boolean;children:ReactNode}){return <ReviewPreviewContext.Provider value={enabled}>{children}</ReviewPreviewContext.Provider>;}
export function useReviewPreview(){return useContext(ReviewPreviewContext);}
