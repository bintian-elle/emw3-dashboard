export type TestingChatChannel = "overview" | "google-search" | "google-pmax" | "google-demand-gen" | "meta" | "reddit" | "edm" | "social" | "concluded";
export type TestingChatScope = { channel: TestingChatChannel; campaign?: string; period: { label: string; start: string; end: string; concludedTestId?: string }; page: string };
export const testingChatChannelNames: Record<TestingChatChannel,string> = {overview:"Overview","google-search":"Google Search","google-pmax":"Google PMAX","google-demand-gen":"Google Demand Gen",meta:"Meta",reddit:"Reddit",edm:"EDM",social:"Social Media",concluded:"Concluded Tests"};
export function testingChatChannel(path: string): TestingChatChannel {
 if(path.includes('/concluded'))return 'concluded';
 if(path.includes('/google/pmax'))return 'google-pmax';
 if(path.includes('/google/demand-gen'))return 'google-demand-gen';
 if(path.includes('/google'))return 'google-search';
 for(const channel of ['meta','reddit','edm','social'] as const)if(path.includes('/'+channel))return channel;
 return 'overview';
}
export function testingScopeKey(scope: TestingChatScope) { return JSON.stringify([scope.channel,scope.campaign??null,scope.period.start,scope.period.end,scope.period.concludedTestId??null]); }
export function testingChatSuggestions(channel:TestingChatChannel,zh:boolean) {
 const questions:Record<TestingChatChannel,Array<[string,string]>>={
 overview:[["Which tests are worth continuing?","哪些测试最值得继续？"],["What unusual changes should we investigate?","有哪些值得关注的异常？"],["What should we test next?","下一轮应该优先测试什么？"]],
 'google-search':[["What explains the differences between the messaging directions?","两个 Messaging Direction 的差异来自哪里？"],["Which direction is more efficient, and why?","哪个方向效率更高，为什么？"],["What should the next Search test change?","下一轮 Search 测试应该改什么？"]],
 'google-pmax':[["Can we judge which direction performs better yet?","目前能判断哪个方向更好吗？"],["What evidence is still missing?","还缺什么证据？"],["Which assets should we test or improve next?","下一轮应该测试或优化哪些素材？"]],
 'google-demand-gen':[["Which creatives show the strongest conversion potential?","哪些素材更有转化潜力？"],["How do images and videos compare?","图片和视频的表现有什么差异？"],["What should we change in the next creative test?","下一轮素材测试应该改什么？"]],
 meta:[["Why do some ads get clicks but few purchases?","为什么有些广告点击多，但购买少？"],["Which creatives should we keep testing?","哪些素材值得继续测试？"],["What should the next image versus video test compare?","下一轮图片与视频测试应该比较什么？"]],
 reddit:[["Which messaging and format combinations should we test next?","下一轮应该测试哪些 Messaging＋Format 组合？"],["Which ads show promising conversion performance?","哪些广告的转化表现值得关注？"],["How do awareness and conversion tests differ?","Awareness 与 Conversion 测试有什么差异？"]],
 edm:[["How could we improve the tested modules’ CTAs?","测试模块的 CTA 可以怎么优化？"],["What explains the difference in module clicks?","模块点击差异可能来自哪里？"],["What should the next email module test compare?","下一轮邮件模块应该测试什么？"]],
 social:[["Which posts are worth repeating, and why?","哪些内容值得复制，为什么？"],["What should our next post look like?","下一条内容可以怎么拍？"],["How do organic and paid results compare?","Organic 与 Paid 的表现有什么差异？"]],
 concluded:[["What did this test teach us?","这个测试带来了哪些经验？"],["What supported the final decision?","最终决策有哪些数据依据？"],["What should a follow-up test change?","后续测试应该改进什么？"]],
 };
 return questions[channel].map(pair=>pair[zh?1:0]);
}
export function validTestingChatScope(value:unknown):value is TestingChatScope {
 if(!value||typeof value!=='object')return false;
 const s=value as TestingChatScope,p=s.period;
 return Object.hasOwn(testingChatChannelNames,s.channel)&&typeof s.page==='string'&&/^\/bluevua\/testing(?:\/[a-zA-Z0-9_-]+)*$/.test(s.page)&&(!s.campaign||typeof s.campaign==='string'&&s.campaign.length<=250)&&!!p&&typeof p.label==='string'&&p.label.length<120&&/^\d{4}-\d{2}-\d{2}$/.test(p.start)&&/^\d{4}-\d{2}-\d{2}$/.test(p.end)&&Number.isFinite(Date.parse(p.start))&&Number.isFinite(Date.parse(p.end))&&new Date(p.start).toISOString().slice(0,10)===p.start&&new Date(p.end).toISOString().slice(0,10)===p.end&&p.start<=p.end&&(Date.parse(p.end)-Date.parse(p.start))/86400000<=730&&(!p.concludedTestId||/^[a-z0-9-]+$/.test(p.concludedTestId));
}
