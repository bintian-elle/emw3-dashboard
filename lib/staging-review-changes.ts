export type ReviewCopy={zh:string;en:string};
export type StagingReviewChange={id:string;page:string;target:string;title:ReviewCopy;description:ReviewCopy;reveal?:'analysis'};
const catalog:readonly StagingReviewChange[]=[
 {id:'testing-period-comparison',page:'/bluevua/testing',target:'testing-layout',title:{zh:'时间对比与 PoP',en:'Period comparison and PoP'},description:{zh:'新增报告与对比周期、时间交换和各指标环比；默认上一周期，缺失数据不替代。',en:'Select reporting and comparison periods, swap dates and inspect metric PoP. Previous period is the default; missing values stay unavailable.'}},
 {id:'testing-integrated-insights',page:'/bluevua/testing',target:'testing-layout',reveal:'analysis',title:{zh:'新版中英文分析',en:'Updated bilingual insights'},description:{zh:'查看各渠道、Campaign 和 Overview 的新版分析，包含图表、素材预览与行动建议；Social 和 Reddit 全周期独立展示。',en:'Review refreshed channel, Campaign and Overview insights with charts, creative previews and actions, plus Social and Reddit lifetime reports.'}},
 {id:'testing-prompts',page:'/bluevua/testing/prompts',target:'testing-prompts',title:{zh:'Prompts 版本与 Insight 试跑',en:'Prompts versions and insight previews'},description:{zh:'查看 Prompt 用途、按账号保存版本和差异，试跑各渠道与 Overview 分析、翻译和 Readability，不覆盖正式 Insight。',en:'Inspect prompt consumers, account-signed versions and diffs. Preview all channels, Overview, translation and Readability without replacing published insights.'}},
 {id:'testing-layout',page:'/bluevua/testing',target:'testing-layout',title:{zh:'Testing 页面布局',en:'Testing layout'},description:{zh:'检查业务表现卡片、趋势图切换及中英文显示。',en:'Review the performance cards, trend breakdown tabs and bilingual display.'}},
 {id:'creative-previews',page:'/bluevua/testing/social',target:'creative-previews',reveal:'analysis',title:{zh:'分析中的素材名称与预览',en:'Creative names and previews'},description:{zh:'素材引用显示名称；悬停或点击可查看预览、原始 ID 和链接。',en:'Creative references show names. Hover or click to inspect the preview, original ID and link.'}},
 {id:'social-post-order',page:'/bluevua/testing/social',target:'social-post-order',title:{zh:'社媒帖子默认顺序',en:'Default Social Media post order'},description:{zh:'帖子默认按 Post 编号排列；指标表头仍然可以点击排序。',en:'Posts start in Post number order. Metric headers still support sorting.'}},
 {id:'team-feedback',page:'/bluevua/testing',target:'team-feedback',title:{zh:'团队批注和更新导航',en:'Team notes and change navigation'},description:{zh:'可框选截图并以登录姓名批注，切换未读/已读；创建者和管理员可删除。',en:'Capture a region and leave account-signed feedback. Mark notes read/unread; creators and the administrator can delete.'}},
];
export function reviewChanges(ids:unknown):StagingReviewChange[]{
 if(!Array.isArray(ids))return [];
 return [...new Set(ids.slice(0,12))].flatMap(id=>{const change=catalog.find(item=>item.id===id);return change?[change]:[];});
}
export function reviewChangeHref(change:StagingReviewChange){return `${change.page}#review-change=${encodeURIComponent(change.id)}`;}
export function reviewChangeFromHash(hash:string){return catalog.find(change=>hash===`#review-change=${change.id}`);}
