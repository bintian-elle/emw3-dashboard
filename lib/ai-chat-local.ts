"use client";
/** Shared browser cache. Namespace by dashboard AND authenticated Google owner.
 * No credentials, tokens or attachment bytes. Server/native history is durable.
 */
const database='emw3-ai-chat',store='conversations';
async function open(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(database,1);request.onupgradeneeded=()=>request.result.createObjectStore(store);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
const key=(dashboard:string,owner:string)=>JSON.stringify([dashboard,owner]);
export async function readLocalAiChat<T>(dashboard:string,owner:string):Promise<T|null>{const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).get(key(dashboard,owner));request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);});}finally{db.close();}}
export async function writeLocalAiChat<T extends {conversationId:string}>(dashboard:string,owner:string,value:T){const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,'readwrite'),entries=tx.objectStore(store);entries.put(value,key(dashboard,owner));entries.put(value,key(dashboard,`${owner}:${value.conversationId}`));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
