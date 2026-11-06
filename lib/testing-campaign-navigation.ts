import {insightPresentationGroups, type InsightPresentation} from './testing-insight-presentation.ts';

/** Match the renderer's section indices while excluding other campaigns and empty sections. */
export function campaignNavigation(presentation:InsightPresentation,scope:string,prefix:string){
 return insightPresentationGroups(presentation,scope)
  .map((group,index)=>({title:group.title,target:`${prefix}-${index}`,hasContent:group.blocks.length>0}))
  .filter(group=>group.hasContent)
  .map(({title,target})=>({title,target}));
}
