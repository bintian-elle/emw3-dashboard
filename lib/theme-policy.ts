export type ThemeMode='light'|'dark';
export type ThemePreference=ThemeMode|'auto';
export function resolveAutomaticTheme(deviceDark:boolean|null,hour:number):ThemeMode{return deviceDark===null?(hour>=7&&hour<19?'light':'dark'):(deviceDark?'dark':'light');}
export function resolveThemePreference(preference:unknown,deviceDark:boolean|null,hour:number):ThemeMode{return preference==='light'||preference==='dark'?preference:resolveAutomaticTheme(deviceDark,hour);}

// Legacy boardui:theme stored a resolved mode, not an explicit preference.
// Do not let that old cache suppress the browser's current appearance.
export const THEME_PREFERENCE_STORAGE_KEY='boardui:theme-preference';
export const THEME_BOOTSTRAP=`try{var p='auto';try{p=localStorage.getItem('${THEME_PREFERENCE_STORAGE_KEY}')||'auto';}catch{}var d=matchMedia('(prefers-color-scheme: dark)').matches,l=matchMedia('(prefers-color-scheme: light)').matches,h=new Date().getHours(),mode=p==='dark'||p==='light'?p:(d?'dark':l?'light':h>=7&&h<19?'light':'dark');document.documentElement.classList.toggle('dark',mode==='dark');document.documentElement.style.colorScheme=mode;}catch{var mode=new Date().getHours()<7||new Date().getHours()>=19?'dark':'light';document.documentElement.classList.toggle('dark',mode==='dark');document.documentElement.style.colorScheme=mode;}`;
