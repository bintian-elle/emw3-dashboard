import test from 'node:test';
import assert from 'node:assert/strict';
import {conclusionOnlySections,conclusionOnlyMarkdown} from './testing-prompt-presentation.ts';
test('one summary is displayed; duplicated executive chapter and technical preamble disappear',()=>{const sections=conclusionOnlySections([{title:'核心结论摘要',markdown:'重复总结。'},{title:'维度对比分析',markdown:'测试：A｜报告期：2026-10-20｜冻结采集时间：x。\n\n本报告仅覆盖测试广告。\n\nROAS 为 2.04，建议继续验证。\n\n| 广告 | 订单 |\n| --- | --- |\n| Video4 | 2 |'}]);assert.deepEqual(sections,[{title:'维度对比分析',markdown:'ROAS 为 2.04，建议继续验证。\n\n| 广告 | 订单 |\n| --- | --- |\n| Video4 | 2 |'}]);});
test('decision-relevant limitations and specific next steps remain',()=>{const text='仅有 2 笔订单，目前不足以扩量。\n\n建议补齐模块去重点击，再判断 CTA。';assert.equal(conclusionOnlyMarkdown(text),text);});

test('standalone reading and calculation audit paragraphs stay out of the page',()=>{const text='已读取 24 条 RSA 的标题、描述与目标 URL。按 ID 核验。\n\n所有比率均由原始量合计后计算。金额保留两位。\n\n优先验证搜索意图与落地页匹配。';assert.equal(conclusionOnlyMarkdown(text),'优先验证搜索意图与落地页匹配。');});

test('internal execution confirmations are removed while recommendations remain',()=>{const text='建议保留表现较好的素材，继续验证。\n\n本轮仅完成只读汇总与建议，没有修改项目文件、广告、预算、邮件、账号、数据库或缓存，也未发送Slack。';assert.equal(conclusionOnlyMarkdown(text),'建议保留表现较好的素材，继续验证。');});

test('remove reading logs and execution footers without losing business evidence',()=>{
 const text='本轮读取7条广告的素材Markdown，并直接查看图片。\n\n该广告获得2笔订单，建议保留验证。以上为建议，未修改广告、预算或设置。\n\nCampaign：A｜报告期：2026-10-20—26｜冻结采集：x。';
 assert.equal(conclusionOnlyMarkdown(text),'该广告获得2笔订单，建议保留验证。');
});
