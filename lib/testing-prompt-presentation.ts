type Section={title:string;markdown:string};
const repeatedSummary=/核心结论摘要|核心高管摘要|执行摘要|executive\s+summary/i;
/** Audit stays in JSON; only standalone technical preambles are omitted from business copy. */
const internalParagraph=/^\s*(?:测试[：:]|报告期[：:]|比较期[：:]|时区[：:]|币种[：:]|冻结采集时间[：:]|本报告(?:仅覆盖|仅分析|采用|使用|读取)|使用冻结\s*Dashboard|本轮(?:已)?读取|本轮核对\s*\d+\s*条|本轮scope|已(?:实际)?读(?:取)?(?:两组|三组|四组|\s*`)|已(?:实际)?读取\s*(?:\d+|全部)\s*条?|所有比率均由原始量合计后计算|本轮仅完成只读|五个付费渠道的花费、收入、归因转化和点击合计与权威汇总一致|素材阅读边界[：:])/;
const executionFooter=/(?:以上(?:均|仅)?(?:为|是)(?:建议|方案)[，,](?:未修改|未执行)[^。\n]*。?|所有动作均为建议[，,]未执行[^。\n]*。?)/g;
export function conclusionOnlyMarkdown(markdown:string){
 return markdown.split(/\n\s*\n/)
  .filter(paragraph=>!internalParagraph.test(paragraph)&&!/^\s*(?:Campaign|范围)[：:][^\n]*(?:报告期|采集时间|Lifetime窗口)[：:]/.test(paragraph))
  .map(paragraph=>paragraph.replace(executionFooter,'').trim())
  .filter(Boolean).join('\n\n');
}
export function conclusionOnlySections(sections:Section[]):Section[]{
 return sections.filter(section=>!repeatedSummary.test(section.title)).map(section=>({...section,markdown:conclusionOnlyMarkdown(section.markdown)}));
}
