# Insights 提示词

`edm.md` 只用于 Bluevua EDM Dashboard 的 Insights。Ask AI 和其他 Dashboard 不加载此文件。

可以直接编辑 Markdown 正文来调整分析侧重点和表达要求。网站服务端在创建新的 EDM Insights 任务时读取文件，不需要改 TypeScript、重新构建或重启。正在运行的任务使用创建时保存的版本；已有成功缓存不会因为文件修改而重新生成。

线上生效文件：`/home/ubuntu/work/bintian/emw3-dashboard/prompts/insights/edm.md`。修改本地副本后，需将此文件同步到线上对应位置；仅保存本地文件不会改变线上行为。

未来其他 Dashboard 可在此目录新增自己的 Markdown，并在对应服务端入口选择它。提示词随任务发送给 Bridge，不作为所有 AI 对话的全局规则。执行能力、项目规则和资料访问权限由主机 Codex 管理。

主提示词完整收录 `docs/EDM Prompt.pdf` 的六页正文，包括全部七个分析章节、Benchmark 和最终输出要求。其后保留诊断与结构化输出补充；后续优化可直接修改本文件，无需修改 PDF。

EDM 新任务一次返回英文分析、中文翻译及各自 5 个推荐问题；两种语言共用一个任务与数据快照。中文只翻译英文，不重新分析或检索。网页刷新后 AI 区域默认中文，仍可手动切换英文。现有成功缓存仍可复用，不会因切换语言或刷新重复生成。
