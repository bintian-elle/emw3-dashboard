export const manualTestingScopes = ['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm'] as const;
export type ManualTestingScope = typeof manualTestingScopes[number];
export function manualTestingScope(value: string | undefined): ManualTestingScope | null {
 if(value==='reddit-awareness'||value==='reddit-conversion')return 'reddit';
 return manualTestingScopes.find(scope=>scope===value)??null;
}
export const manualTestingChannels:Record<Exclude<ManualTestingScope,'overview'>,string>={
 'google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Demand Gen',meta:'Meta',reddit:'Reddit',edm:'EDM',
};
export function manualPromptFiles(scope:ManualTestingScope):string[]{
 return scope==='overview'?['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm']:[scope];
}
