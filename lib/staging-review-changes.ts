export type ReviewCopy={zh:string;en:string};
export type StagingReviewChange={id:string;page:string;target:string;title:ReviewCopy;description:ReviewCopy;reveal?:'analysis'};
const catalog:readonly StagingReviewChange[]=[
 {id:'testing-layout',page:'/bluevua/testing',target:'testing-layout',title:{zh:'Testing 页面布局',en:'Testing layout'},description:{zh:'检查业务表现卡片、趋势图切换及中英文显示。',en:'Review the performance cards, trend breakdown tabs and bilingual display.'}},
 {id:'creative-previews',page:'/bluevua/testing/social',target:'creative-previews',reveal:'analysis',title:{zh:'分析中的素材名称与预览',en:'Creative names and previews'},description:{zh:'素材引用显示名称；悬停或点击可查看预览、原始 ID 和链接。',en:'Creative references show names. Hover or click to inspect the preview, original ID and link.'}},
 {id:'social-post-order',page:'/bluevua/testing/social',target:'social-post-order',title:{zh:'社媒帖子默认顺序',en:'Default Social Media post order'},description:{zh:'帖子默认按 Post 编号排列；指标表头仍然可以点击排序。',en:'Posts start in Post number order. Metric headers still support sorting.'}},
 {id:'team-feedback',page:'/bluevua/testing',target:'team-feedback',title:{zh:'团队批注和更新导航',en:'Team notes and change navigation'},description:{zh:'可标记页面位置并以登录姓名留言，从更新清单直接定位修改。',en:'Mark a page location, leave feedback with your account name, and jump to changes from the release list.'}},
];
export function reviewChanges(ids:unknown):StagingReviewChange[]{
 if(!Array.isArray(ids))return [];
 return [...new Set(ids.slice(0,12))].flatMap(id=>{const change=catalog.find(item=>item.id===id);return change?[change]:[];});
}
export function reviewChangeHref(change:StagingReviewChange){return `${change.page}#review-change=${encodeURIComponent(change.id)}`;}
export function reviewChangeFromHash(hash:string){return catalog.find(change=>hash===`#review-change=${change.id}`);}
