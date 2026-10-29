"use client";

import {useSiteLanguage} from "./site-language-provider";

export function LocalizedText({en,zh}:{en:string;zh:string}) {
 const {language}=useSiteLanguage();
 return <>{language==='zh'?zh:en}</>;
}
