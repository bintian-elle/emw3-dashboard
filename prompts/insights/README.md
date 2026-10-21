# Insights 提示词

`edm.md` 只用于 Bluevua EDM Dashboard 的 Insights。Ask AI 和其他 Dashboard 不加载此文件。

可以直接编辑 Markdown 正文来调整分析侧重点和表达要求。网站服务端在创建新的 EDM Insights 任务时读取文件，不需要改 TypeScript、重新构建或重启。正在运行的任务使用创建时保存的版本；已有成功缓存不会因为文件修改而重新生成。

线上生效文件：`/home/ubuntu/work/bintian/emw3-dashboard/prompts/insights/edm.md`。修改本地副本后，需将此文件同步到线上对应位置；仅保存本地文件不会改变线上行为。

未来其他 Dashboard 可在此目录新增自己的 Markdown，并在对应服务端入口选择它。提示词随任务发送给 Bridge，不作为所有 AI 对话的全局规则。执行能力、项目规则和资料访问权限由主机 Codex 管理。

主提示词完整收录 `docs/EDM Prompt.pdf` 的六页正文，包括全部七个分析章节、Benchmark 和最终输出要求。其后保留诊断与结构化输出补充；后续优化可直接修改本文件，无需修改 PDF。

EDM 新任务一次返回英文分析、中文翻译及各自 4 个推荐问题；两种语言共用一个任务与数据快照。中文只翻译英文，不重新分析或检索。网页刷新后 AI 区域默认中文，仍可手动切换英文。现有成功缓存仍可复用，不会因切换语言或刷新重复生成。

`content-testing.md` 用于 Testing Overview 和各 Testing channel 的结构化分析，与 EDM 主 Dashboard 的 `edm.md` 分开。固定 Test goal / Hypothesis 在 Campaign 上线或变动前生成一次，保存于共享数据库 `testing_ai_readout_cache` 的 `framework:v1`；支持 `test_frameworks` 按 exact test_id/campaign_name 优先匹配，再使用 `channel_frameworks`。生成的业务答案放数据库或私有 `.state/`，不随 prompt 提交 Git。

每日任务复用保存的固定框架，生成 Last Week (Tue–Mon)、Week-to-date、Month-to-date；Social Media 只有 lifetime 指标，因此另外保存每日 lifetime snapshot，不冒充三个时段内的数据。时段与页面共用日期计算。页面只显示成功入库的 AI 内容，不显示手写的分析兜底。

Bridge 现支持专用 `testing_readout` 模式，直接使用原生 JSON schema 返回 `period_readout_batch`，不把 JSON 塞进普通 Insights 文本。远端已添加此模式，并为它建立独立的 `Bluevua · Content Testing Insights` 持久对话，EDM 的原对话不变。每天一次快照和远端 batch，多个访问者共享结果。改 prompt 不会触发已有任务重复运行。

2026-10-20 完整文档版：`content-testing-source.md` 保留全部 8 个标签页原文（包含 Social 英文版与 topic 注释）；`content-testing-requirements.json` 的 60 组检查项用于验证输出覆盖，不能替代原文。新任务会一起读取原文、运行契约和检查清单。修改分析要求时可以编辑这些文件，已有成功缓存不自动重跑。

Meta、Reddit 从每条广告的选定时段表现出发，再归纳形式、Messaging Angle 和 Campaign。Meta 的后台日历史包含暂停广告；独立保存平台提供的 period reach，不能把广告或 daily reach 相加当去重人数。渠道页面展示详细分析、证据、建议和数据缺口；Overview 只展开 Executive Summary、关键发现及优化建议。v3 全量刷新会同时重新生成固定框架，之后的日更复用。

- `content-testing-translation.md`: translates the saved English Testing readouts into Simplified Chinese, without new analysis or external research. Shared translated payloads are stored in the EDM database; changing the UI language never starts another model request.
