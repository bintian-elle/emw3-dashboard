import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignNavigation} from './testing-campaign-navigation.ts';
import type {InsightPresentation} from './testing-insight-presentation.ts';

test('campaign navigation targets only populated sections of the selected campaign',()=>{
 const presentation={schema_version:'insight-presentation-v3',sections:[{id:'one',title:'素材对比'},{id:'two',title:'广告组表现'},{id:'three',title:'下一步建议'}],blocks:[{scope:'A',section_id:'one'},{scope:'A',section_id:'three'},{scope:'B',section_id:'two'}]} as InsightPresentation;
 assert.deepEqual(campaignNavigation(presentation,'A','details-a'),[{title:'素材对比',target:'details-a-0'},{title:'下一步建议',target:'details-a-2'}]);
 assert.deepEqual(campaignNavigation(presentation,'B','details-b'),[{title:'广告组表现',target:'details-b-1'}]);
 assert.deepEqual(campaignNavigation(presentation,'missing','details-c'),[]);
});
