'use client';

import {createContext} from 'react';

/** Starts an immediate channel transition when the destination is supported. */
export const ChannelNavigationContext=createContext<((href:string)=>boolean)|null>(null);
