"use client";
/** Insight versions refresh with the daily cache window, never on language toggles. */
export function useReadoutVersion(_keys:readonly (string|null)[],_language:string){
 void _keys;void _language;
 return {revision:0,expected:null as string|null};
}
