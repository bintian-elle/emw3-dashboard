# EMW3 Dashboard — Project Context

更新日期：2026-10-07。供开发、交接和后续 AI 任务使用。

本文根据当前仓库代码、迁移、项目文档及 2026-09-29 部署验证记录整理。本次未重新连接生产服务器或导出线上数据库 schema；线上状态以再次检查为准。历史需求不等于当前实现，遇到冲突应核对代码与最新用户决定。

## 1. 项目目标

- 为 Bluevua 提供统一的营销分析和实验 Dashboard，覆盖 Google Ads、EDM、Meta、Reddit 等渠道。
- 保留业务要求的全部指标、PoP / YoY、趋势、Campaign / Flow / Message 明细、A/B Testing 和 Creative Performance。
- AI 不只复述指标升降：用确定性分析识别矛盾、集中度、抵消关系、渠道差异，以及 volume / engagement / conversion / AOV 驱动；区分事实、诊断和待验证原因。
- 通过 Ask AI 多轮对话、附件和可确认的团队分析偏好，让结果逐步接近团队的分析方法。
- Google 登录已于 2026-10-07 上线，限定已验证的 `@elle-media.com` Workspace 账号；真实公司账号登录、退出及重新登录已验证。

## 2. 当前架构

```text
浏览器（Dashboard / Ask AI）
  → Next.js 服务端：鉴权、输入校验、数据读取、确定性分析
    → PostgreSQL：Google Ads 数据 / Klaviyo 数据
    → Meta / Reddit API：对应 Testing 页面
    → ai_insight_cache：已有 Last Week 结果直接返回
    → ai_job_queue：持久化 AI 任务与数据快照
      → 独立 Node worker（串行执行）
        → 同机 localhost → Dashboard Bridge
          → Codex 生成结构化 Insights / Markdown Answer / 推荐问题
          → 私有 SQLite：任务状态与团队记忆
      → 校验结果 → 发布缓存 → 页面展示
```

### 服务边界

- 网站：Next.js App Router；主要页面 `/bluevua`、`/bluevua/edm`、`/bluevua/testing` 及 Testing 子页面。
- EDM 数据：`lib/klaviyo-dashboard.ts`、`lib/testing-edm.ts` 使用 `KLAVIYO_DATABASE_URL`。`/api/klaviyo/*` 是历史路由名称，不意味着调用 Klaviyo 外部 API。
- Google 数据：`lib/db.ts`、`lib/google-ads.ts`、`lib/testing-google.ts`、`lib/testing-demand-gen.ts` 使用 `DATABASE_URL`。
- Meta、Reddit 当前仍使用外部 API；不能描述为“全站所有渠道都已数据库化”。
- 确定性分析：`lib/klaviyo-analytics.ts` 的 `buildPerformanceIntelligence` 是 AI payload 入口，不能仅调用基础 payload builder 代替它。
- AI 接入：`lib/codex-bridge.ts`；当前运行路径为 Codex Bridge，不是 OpenRouter。
- 队列：`lib/ai-job-queue.ts`、`scripts/ai-queue-worker.mjs`、`ops/emw3-ai-queue.service`。
- API：`/api/klaviyo/ask`、`/api/klaviyo/ask/stream`、`/api/klaviyo/insights/refresh`。
- 开发诊断：`/api/klaviyo/debug/analysis-payload`，仅开发环境开放。
- 鉴权：`proxy.ts`、`lib/site-auth.ts`、`/api/auth/google` 及 callback；登录后保留安全的站内 `returnTo`。旧 Access Key 登录接口返回 410。配置见 `docs/google-login.md`。

### 最近验证过的部署拓扑

- 网站：`https://emw3-dashboard.win`，已迁移至 `EMW3_ANC_AI`，项目目录 `/home/ubuntu/work/bintian/emw3-dashboard`，PM2 进程，应用端口 3000。2026-10-05 用户确认旧主机已删除。
- Dashboard 与 Bridge 同机，连接 `http://127.0.0.1:8788`；旧隧道 `18788` 已不适用。2026-10-05 已获授权修正配置并安装启用 `emw3-ai-queue.service`；Google 登录和持久对话代码已于 2026-10-07 直接发布到服务器，未提交/推送 GitHub。
- 远程 SSH 主机别名：`EMW3_ANC_AI`；项目 `/home/ubuntu/work/anc-slack-bridge`。
- Bridge：`anc-dashboard-bridge.service`，远端仅监听 `127.0.0.1:8788`；不能把私网 IP 加端口直接当作可用入口。
- Slack 与 Dashboard 共用远端能力，但入口独立；Dashboard 不经过 Slack。
- 定时任务：`emw3-ai-insights-refresh.timer`，每日 **07:45 UTC / GMT**。不是固定美国东部时间 02:00，夏令时会影响本地换算。

## 3. 技术栈

| 类别 | 当前实现 |
| --- | --- |
| 框架 | Next.js 16.3.3、React / React DOM 19.2.8、TypeScript 5 |
| 样式与组件 | Tailwind CSS 4、源代码内 BoardUI、React Aria、Radix、现有自定义 AI 组件 |
| 图表与交互 | Recharts 3、Motion、TanStack React Table |
| 图标 | 项目同时有 Remix Icon 与 Lucide；新增 UI 遵循 AGENTS.md |
| AI 呈现 | Streamdown 及相关插件、Markdown、SSE 状态/回答通道 |
| 数据访问 | Node `pg` 连接 PostgreSQL / Supabase PostgreSQL |
| 附件 | 图片、文本、Markdown、CSV、JSON；`pdf-parse` 提取 PDF 文本 |
| AI 服务 | 独立远程 Python Bridge + Codex；本仓库为客户端和任务 worker |
| 运维 | Ubuntu EC2、PM2、systemd、SSH 隧道、GitHub、deploy.sh |

当前 `npm run dev` 和 `npm run build` 均显式使用 **Webpack**。`npm run build:turbo` 仅是手动测试命令，不代表生产已启用 Turbopack。

## 4. 数据库结构

以下业务表来自实际代码查询，不是完整 DDL；主键、约束、索引和线上字段类型尚需数据库目录核实。两个连接中的同名 `dim_campaign` 属于不同数据域，不得混用。

### 4.1 Google Ads（DATABASE_URL）

| 表 / 视图 | 用途与代码使用的粒度 |
| --- | --- |
| `fact_account_daily` | 账户每日花费、转化、收入、曝光、点击 |
| `fact_campaign_daily` | Campaign 每日表现 |
| `fact_ad_group_daily` | Ad Group 每日表现和实验对比 |
| `fact_search_term_daily` | 搜索词每日表现与品牌分类 |
| `fact_keyword_daily` | Keyword 每日表现 |
| `dim_campaign` | Campaign 名称、状态、渠道类型；关联 customer_id / campaign_id |
| `dim_ad_group` | Ad Group 维度 |
| `dim_keyword` | Keyword 维度；关联 criterion_id 等标识 |
| `v_product_performance_daily` | 商品表现、SKU、图片 |
| `v_ad_performance_daily` | 广告表现、预览图、视频链接 |

### 4.2 Klaviyo / EDM（KLAVIYO_DATABASE_URL）

| 表 | 用途与关键字段 |
| --- | --- |
| `fact_metric_daily` | `metric_name, date, count_value, unique_value, sum_value`；账户事件指标 |
| `fact_campaign_performance` | Campaign Message 报表；campaign_id、campaign_message_id、send_date、send_channel 及指标 |
| `fact_flow_daily` | Flow Message 每日报表；flow_id、flow_message_id、date、send_channel 及指标 |
| `fact_subscriber_daily` | 每日 email_subscribers / sms_subscribers 存量 |
| `fact_email_link_daily` | 日期、消息、tracked URL 的 unique_clicks |
| `dim_campaign` / `dim_campaign_message` | Campaign 名称、Message 名称、template_id 等 |
| `dim_flow` / `dim_flow_message` | Flow / Message 名称与父级关系 |
| `dim_email_creative` / `dim_creative_asset` | 模板模块、destination_url、图片、alt_text |

消息报表使用 `recipients, delivered, opens_unique, clicks_unique, conversions, conversion_value, bounced, unsubscribe_uniques, spam_complaints`。账户事件和消息报表可能存在口径差异，不能直接相加或替换 denominator。

### 4.3 应用持久化表（迁移已在仓库）

`public.ai_insight_cache`：

- `cache_key` 主键；`preset`；当前与对比期 start/end。
- `payload jsonb`、`model`、`generated_at`、`expires_at`。
- 索引 `(preset, expires_at)`。
- 旧迁移允许 `last_30_days`，但当前应用仅缓存 `last_week`；不要把旧 CHECK 当成仍在预生成 Last 30 days 的证据。

`public.ai_job_queue`：

- `id` 主键、唯一 `request_id`、`body jsonb`。
- `status`：queued / running / completed / failed；`remote_id`、`result jsonb`、`error`。
- `finalized`、`priority`、`next_poll_at`、`created_at`、`updated_at`。
- 待处理部分索引；启用 RLS，对 anon / authenticated 撤销权限。
- 任务 body 可能含业务数据和附件，日志与诊断不能随意打印。

迁移位于 `supabase/migrations/`。上游业务数据同步和完整建表流程不由这两个迁移覆盖。

### 4.4 远程私有状态

- Bridge 在 `.state/dashboard` 保存任务状态和 `team-memory.sqlite3`。
- 团队记忆包含草稿、确认/停用事件、每个任务的记忆快照；不在 Supabase 分析数据库保存。
- SQLite 的详细结构属于远程项目；备份必须使用 SQLite backup API，不能直接复制运行中的 WAL 数据库作为一致备份。

## 5. 已完成内容

- EDM 数据库查询、默认 Last Week (Tue–Mon)、自动 YoY、PoP、日期范围格式化。
- 保留 Business Overall、List Health、订阅增长、Email / SMS、Flow、Campaign、A/B、Creative 等业务指标与展示。
- 折线图图例点击显隐、订阅人数和 Rate 独立比较、Campaign Sent Date、Creative 图片预览。
- AI Performance Insights：中英文、可展开/收起、多指标诊断与推荐动作。
- Ask AI：多轮聊天、简化推荐问题、Markdown 呈现、计时/执行状态、图片粘贴和预览、附件、PDF 文本提取。
- 内部证据路径的呈现清理 / 引用适配；原始 JSON path 本身不是可访问链接。
- 从 OpenRouter 运行路径迁移到远程 Codex Bridge。
- 持久化串行 AI 队列、请求幂等、远程任务复用、429 退避、页面断开后继续处理。
- EDM 新任务一次生成英文分析、中文忠实翻译及两种语言各四个推荐问题，共用一个数据快照和原生轮次。
- Access Key 登录、站内登录回跳、API 鉴权、防索引响应头。robots 指令不是安全边界，真正保护依赖鉴权。
- 团队记忆：明确“记住”→ 草稿 → 带 ID 确认保存；可查看、停用；周期背景与长期方法区分。
- 部署脚本增加锁、依赖签名复用、失败不重启；保留低内存构建配置。

最近验证记录：远程模拟回归 369 项通过；网站 TypeScript 与部署脚本 3 项测试通过；真实 Codex 记忆提议、保存、读取及公网登录/聊天接口验证通过。测试记忆已停用，旧 Insights 未被覆盖。以上是上次部署记录，不代表本次重新跑过全部测试。

## 6. 重要设计决定

### 分析与证据

- 确定性计算先于 LLM；相对变化用小数（0.08 = 8%），展示时才乘 100。Rate 差异使用百分点，不能混淆比例与 pp。
- Email / SMS funnel 分开；SMS 没有 opens，不得混进 Email open / click-to-open 分母。
- Loss concentration 分母是所有负 revenue delta 的绝对值之和，不是净收入变化，也不是总收入来源集中度。
- Campaign current_only / previous_only 是活动或组合变化；所属 Message 继承 activity-only 状态，diagnosis 为 null。
- Flow / Message 支持主驱动与次驱动；零分母、缺失数据不能硬推结论。
- `fact_guardrails` 保留；自然语言启发式校验作为警告，不用它自动把有效回答替换成简单 KPI 模板。
- 当前 API 对 Bridge / 空响应 / JSON-schema 错误返回错误；不得把旧代码中的 fallback helper 当成默认运行路径或伪装成成功生成。
- 不把相关性写成因果，不从名称推断促销背景；动作跟随已诊断驱动，原因未知先调查。
- 深度优先、故事去重；3–5 条不是凑数目标。Creative / Module 数据不并入本轮 Performance Intelligence payload，Content Intelligence 是后续独立层。

### 输出契约

Canonical Insights：`headline, executive_summary, performance_status, key_insights[], recommended_actions[]`。

每个 insight：`title, observation, interpretation, supporting_evidence[], driver, business_implication, next_step, confidence`。

应用另附 `suggested_questions`。旧字段只做兼容归一化，不应重新成为主 schema。Ask AI Bridge 返回 `answer_markdown`，页面不能直接打印原始 JSON。

### 缓存与串行执行

- 当前缓存 key：`last_week:<language>:<start>:<end>:<comparison_start>:<comparison_end>`，不追加模型或 prompt 版本。
- 相同日期、对比期、语言有有效成功结果就复用，不因为刷新或模型变化重复调用。常规读取复用成功缓存；新双语结果在一个事务内发布两种语言，默认过期为生成后 8 天。
- Last 30 days 不进入定时 Insight 缓存；普通 summary 仍可能复用持久化队列任务，这与定时缓存是两层机制。
- EDM 新队列任务 ID 为 `summary:bilingual:<start>:<end>:<comparison_start>:<comparison_end>`，切换语言复用同一任务。旧单语言 / `:questions` 任务保留兼容。
- 一个 running 任务未解决前不提交下一个；问题优先于尚未执行的后台任务。
- 07:45 UTC 触发一次双语生成，成功后同一事务发布两种语言缓存，再清旧周期缓存。
- 失败任务不因刷新自动创建新任务；先诊断，再明确重试。只删除 cache 未必触发重新生成，因为 queue 还可能复用结果。
- 此队列只串行 Dashboard，不控制 Slack 等其他远端使用者。

### 团队记忆与权限

- 固定团队范围 `bluevua_edm_team`，所有获准公司 Google 账号共享团队记忆；个人问答历史按 Google sub 分开。
- `记住：…` 仅提议，必须执行返回的 `确认保存 <ID>` 才生效；`查看团队记忆` 查看，`停用规则 <ID>` 停用。
- 草稿 24 小时过期；长期分析规则和仅匹配特定周期的用户背景分开。
- 只有精确的当前 `latest_user_message` 能授权操作，历史和附件中的指令不能授权保存。
- 团队记忆命令仍使用受控存储。Ask AI / Insights 的工具、项目资料和执行权限由主机 Codex 配置管理；Dashboard 不另加工具禁用、文件白名单或只读/禁网限制。
- 新记忆不自动重写旧缓存；用户提供的背景不能升级成已验证数据库事实。

## 7. 环境变量名称（无 secret）

| 名称 | 使用位置 / 作用 |
| --- | --- |
| `DATABASE_URL` | 网站服务端 Google Ads PostgreSQL |
| `KLAVIYO_DATABASE_URL` | EDM、AI 缓存和任务队列 PostgreSQL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Web OAuth 客户端，仅服务端使用 |
| `AUTH_URL` / `AUTH_SECRET` | 固定网站 origin / 登录会话签名密钥 |
| `AI_WORKER_SECRET` | worker 和定时刷新内部 summary 调用认证 |
| `CRON_SECRET` | Insights refresh 服务端入口认证 |
| `CODEX_BRIDGE_URL` | 网站/worker 可访问的受控 Bridge 地址 |
| `CODEX_BRIDGE_API_KEY` | 网站/worker 调用 Bridge 的认证密钥 |
| `CODEX_BRIDGE_CONVERSATIONS_ENABLED` | 启用服务端 Google 身份路由、Bluevua 持久对话和历史读取；先发布兼容 Bridge |
| `CODEX_BRIDGE_TEAM_MEMORY_ENABLED` | 远程记忆协议功能开关；需先部署 Bridge 才启用 |
| `META_ACCESS_TOKEN` | Meta Testing API |
| `NEXT_DISABLE_BUILD_CACHE` | 生产低内存环境关闭 Webpack 构建缓存 |
| `NODE_ENV` | 开发/生产行为 |
| `FORCE_INSTALL` | deploy.sh 强制重新安装依赖 |
| `NODE_OPTIONS` | Node 运行参数；不是必须设置的业务配置 |
| `DASHBOARD_BRIDGE_KEY` | **远端 Bridge** 认证密钥，与客户端对应密钥匹配 |
| `DASHBOARD_HOST` / `DASHBOARD_PORT` | **远端 Bridge** 本机监听配置 |

网站配置通常为 `.env.local`；修改后需重新加载网站及 worker 环境。远端配置位于项目外 secrets 目录的 `dashboard.env`，权限 0600。这里不是远程项目全部环境变量的清单。

Reddit 当前从 `credentials/reddit.json` 读取凭据，不是环境变量；不得把其内容写进本文、日志或 Git。历史 OpenRouter 配置不属于当前 AI 运行必需项。任何密钥不得使用 `NEXT_PUBLIC_` 暴露给浏览器。

## 8. 当前问题与限制

- EC2 虽扩至 16 GiB 磁盘，最近验证 RAM 仍约 1.9 GiB、无 swap。启用文件缓存曾 OOM；生产设置 `NEXT_DISABLE_BUILD_CACHE=true`。不要误读旧文档概述为生产正在使用构建缓存。
- 部署仍在原目录构建 `.next`，不是原子发布；构建期间可能影响活动请求。失败不重启 PM2 不能解决全部中间状态问题。
- Codex 仍可能限流或失败；本地队列不能限制其他客户端竞争。远程任务异常不能盲目重新提交。
- PDF 仅文本提取，不等于 OCR 或完整视觉解析；无可提取文本的扫描 PDF 会报错，长文本会截断。
- Google 登录已在本地实现个人身份；团队记忆仍共享。Bluevua 原生持久对话与账号历史已于 2026-10-07 部署；生产两轮问答和账号隔离通过，见 `docs/ai-bluevua-conversations.md`。
- 远端 Bridge 生产仓库有保留的未提交改动，包括附件相关改动；不能用旧 HEAD 覆盖，发布可复现性仍需整理。
- 当前业务表完整 DDL / 约束 / 索引未包含在本仓库。`ai_insight_cache` 迁移未声明与 queue 同样的 RLS 规则，线上权限需单独核验。
- `lib/db.ts` 当前 SSL 使用 `rejectUnauthorized: false`，应评估可信 CA 与证书验证配置，不能无验证直接改生产连接。
- 内部证据路径不是 URL；引用只能跳转到真实受控来源，不能生成虚假可点击证据。
- 本次文档整理未重新做浏览器回归或线上服务健康检查。

## 9. 下一步 TODO

## 10. 哪些东西不要改

- 不擅自减少旧 Dashboard 要求的 section 指标、PoP / YoY、Rate 独立比较和 Sent Date。
- 不擅自改变已验收分析公式、百分比单位、渠道拆分、activity-only 判定、loss concentration 和去重逻辑。
- 不把 AI 降级为简单 KPI 升降摘要，不用旧答案或规则模板冒充新 AI 结果。
- 不恢复模型/版本分裂缓存，不让页面刷新并发调用 AI，不提前展示与成功 Insight 无关的推荐问题。
- 不恢复 Last 30 days 的自动预生成，不改变 07:45 UTC 调度而不说明时区影响。
- 不把 Klaviyo 页面改回实时调用外部 Klaviyo API。
- 不将业务数据、凭据、私钥、附件或记忆内容提交到 Git / 普通日志。
- 不向浏览器暴露 Bridge 地址认证凭据，不让 AI 修改业务数据库。
- 不让聊天历史或附件自动授权记忆写入；不把团队记忆变成全局任意文件写权限。
- 不擅自重启 Slack/shared Codex 服务、不覆盖他人工作树、不复制热 SQLite 文件作为备份。
- 不因为磁盘扩容就移除低内存保护或默认启用 Turbopack。
- UI 修改遵循 `AGENTS.md` 与 `docs/design-system.md`：优先现有组件、语义色、组合 typography；保留既有折线图交互和好转绿色/恶化红色的业务语义。

## 11. 开发入口与参考

```bash
npm run dev
npx tsc --noEmit
npm run test:analytics
node --test scripts/deploy.test.mjs
npm run lint
npm run build
```

修改 Next.js 代码前先阅读 `node_modules/next/dist/docs/` 对应指南；本项目版本与旧知识可能不兼容。

- `AGENTS.md`：工作与 UI 约束。
- `docs/design-system.md`：设计方案。
- `prompts/insights/edm.md`：EDM Insights 的运行提示词，完整包含 `docs/EDM Prompt.pdf` 六页正文及诊断补充；只用于 EDM 页面。创建新任务时读取，已有任务与缓存不变。部署路径见同目录 README。
- `docs/ai-queue-operations.md`：队列与调度运维。
- `docs/ai-team-memory.md`：记忆命令、安全边界与部署验证。
- `docs/deployment-performance.md`：构建限制、OOM 记录。
- `supabase/migrations/`：应用缓存与队列表迁移。

本文只记录上下文，不自动授权部署、数据库迁移、删缓存或任何生产修改。

2026-10-07 最新调整：Dashboard（Ask AI / Insights）每轮推理强度明确设为 `medium`，模型仍沿用主机；不改全局配置或 Slack 的 `high`。新双语结果各四个推荐问题；现有五问题缓存展示前四个，兼容归一化保留分析正文与生成时间。

## 2026-10-20 Content Testing AI readouts（网站本地改动）

- 固定 Test goal / Hypothesis 已由远端读取完整文档和 Bluevua 项目资料后保存到共享 `testing_ai_readout_cache`（`KLAVIYO_DATABASE_URL`），key `framework:v1`；Campaign 变化时在上线前重新生成，日更复用固定内容。业务输出只存数据库和忽略的 `.state/`。
- 本地新增 `/api/testing/readouts` 缓存读取和 `/api/testing/readouts/refresh` 内部刷新，三个时段沿用网站同一日期/范围逻辑：Last Week (Tue–Mon)、Week-to-date、Month-to-date。Social Media 单独使用每日 lifetime snapshot。页面只显示成功入库的 AI 分析，已删除手写分析兜底。
- 每天一个持久队列任务（priority -10），生产旧 worker 仍可直接转发。Testing 的发布由后台刷新控制器和缓存 API 处理，queue `finalized=true` 避免走 EDM finalization；result 内记录 `testing_cache_published_at`。精确日期、测试身份、覆盖和 delta 运算校验后分别保存；旧生成结果不能覆盖新结果。
- 用户要求专用模式和新对话：远端 Bridge 已新增 `testing_readout` 严格原生结构化输出，独立持久对话 `Bluevua · Content Testing Insights`。远端独立 worktree 定向 103 项回归通过；空闲窗口只切换 `anc-dashboard-bridge.service`，SQLite backup 保存在远端 `.state/backups/20261020-testing-readout`；Slack/shared Codex PID 未变。可复现代码差异在 `ops/bridge-testing-readout.patch`。首次普通 Insights 传输尝试的结果未通过验证、未进入缓存，v2 复用原数据快照。
- 本地每日刷新入口：`node scripts/refresh-testing-readouts.mjs`。新增 systemd service/timer 配置为每天 09:15 UTC；这里只创建文件，线上 timer 尚未安装启用，网站改动尚未部署/推送。部署说明与实际状态见 `docs/testing-ai-readouts.md`。

2026-10-20 本地完整文档版 v3：保存全部 8-tab 原文与 60 组覆盖清单，分析以广告为起点。已生成 LW/WTD/MTD 各 11 项及 Social lifetime 1 项，固定框架 12 组；所有指定 Meta 7 条、Reddit 10 条广告均被逐项引用。缺失的资产指标、完整视频观察、测试轮次及 EDM 模块分母明确列为缺口。完整结果经覆盖、身份日期、PMax 50–70 词和 delta 校验后写共享缓存；首次返回遗漏覆盖/框架标记，已复用结果让远程完成补齐，原始结果与修订来源留作审计。

- 每轮请求的 `analysis_payload.generation_instructions` 也携带最新原文和运行提示词，避免依赖持久会话创建时的 instructions。币种由各广告账户 API 验证并缓存 24 小时，本次均 USD。
- AI Overview 财务范围必须与 BusinessPerformance 相同：Google 已配置 testing rows + Meta campaign total + Reddit 已配置广告行；其他 Reddit testing Campaign 数额有效，但只用于明确标记的渠道背景，不能混入 Overview 卡片范围。`overview_display_totals` 提供确定性同源汇总；实际投放日期、Meta period 快照与 daily history 分开。发布后的事实范围校准保留全部 34 项广告/测试分析与框架不变。
- Overview 默认只展示简洁 Executive Summary 和优化优先级，完整关键发现/缺口可展开；不显示目标假设或展开渠道创意细节。渠道和详情页展示固定框架、分析、delta、证据及缺口。分析不显示数据快照时间；Reddit 默认 Since Sep 24 或自定义区间仍不伪用其他区间的结果，提示选择已预生成的 LW/WTD/MTD。
- 代码、文档和 timer 文件仍仅本地，未推送/部署；本轮共享 AI 缓存已更新。远程 Bridge/worker 配置未再修改；每日 timer 仍待未来部署时安装，不把文件已创建误写为已启用。

### 本地待发布：账号语言与 Testing 中文缓存（2026-10-20）

右上角用户名左侧新增 EN / 中文，默认英文；Google subject 对应的偏好存入与 EDM 相同数据库的 `site_user_preferences`。EDM 原有语言选择器也使用同一偏好。Testing 英文分析只生成一次，中文按 `prompts/insights/content-testing-translation.md` 纯翻译，存入 `testing_ai_readout_translations`，按英文源 hash 校验版本。切换语言只读缓存，不发起 AI；日常 refresh 发布英文后补齐中文，已有结果可用 `node scripts/refresh-testing-readouts.mjs --translations-only` 补齐。新迁移已在共享数据库创建表，网站代码仍仅本地，未推送部署。

- 固定的 12 组 Test goal / Hypothesis 同样通过云端纯翻译存入 `testing_ai_readout_translations` 的 `framework:v1` 行，所有 reporting periods 共用；只在英文固定框架改变后更新中文，不按日/按时间选择重复翻译。
- 渠道及素材详情页展示顺序调整为：固定目标/假设 → 原有表现数据/素材 → Summary、Delta 与优化建议。通过 `TestReadout` children 插槽保留服务端数据渲染，AI 缓存缺失不隐藏数据；Overview 的独立 Executive Summary 布局保留。
- 本地新增 Campaign 默认折叠：标题、已保存 AI Summary 与原有 Performance data 保持可见；目标/假设和详细分析默认收起，展开后保留目标/假设→原有数据→详细分析顺序，底部可收起并回到标题。日期改变默认收起，语言切换保持展开状态。固定底部居中的 Campaign 导航按当前页面真实卡片列出，支持选择、上一项/下一项与返回标题；详情页与 Social 保留完整布局。未新增 AI 生成请求，未推送部署。

- Campaign 卡片默认顺序为 AI Summary → 原始表现数据 → 展开详细分析按钮；删除“测试设定 / 表现数据 / 分析与下一步行动”分区标题及其编号，保留 Test goal、Hypothesis 等内容标签。

- 展示偏好：不在界面显示分析快照时间、数据获取时间、结果生成时间或类似更新时间说明，后续不要主动添加这类文字。报表时间范围、实际投放/发送/发布时间等业务日期保留；后台缓存版本与审计时间字段继续正常保存。

### 2026-10-20 发布记录

- 本轮 Testing AI readouts、账号语言偏好、中文翻译缓存及 Campaign 展示/导航已推送并部署（功能提交 `7522c2b`），共享数据库沿用已生成结果，不因部署重新生成。
- 生产已安装启用 `emw3-testing-readouts.timer`，每天 09:15 UTC 执行；EDM 原有调度保留。
- 本次生产构建、TypeScript、39 项静态页面生成通过。SSH 非交互 PATH 未包含 PM2，使用 `/home/ubuntu/.local/lib/node_modules/pm2/bin/pm2` 完成重启和 save；以后运行 deploy.sh 时显式添加 `/home/ubuntu/.local/bin` 到 PATH。
- 生产现有 `ops/emw3-ai-queue.service` 修改与额外 EDM timer 文件已保留。主机当前约 3.8 GiB RAM、12 GiB swap、77 GiB 磁盘；不再套用旧 1.9 GiB/无 swap 的资源记录。

2026-10-21 本地修复：Overview Campaign 卡片展开完整已保存详情（目标/假设、建议、Delta、创意表现、来源及缺口），上下收起按钮保留；独立 Overview Executive Summary 不加目标/假设。Campaign 名称链接保留当前 reporting period，跳转对应渠道并定位该 Campaign。未推送部署。

2026-10-21 本地 Social 修复：当天 Testing job execution_timeout 导致页面按今天 exact key 查不到已保存分析；Social lifetime 改用最近成功入库的实际日期，普通 period 仍严格匹配，不伪造新日期。已验证完整 Social 分析显示，Published/Format 仅每帖首行保留一次。未推送部署。

2026-10-21 用户确认 Social 不按日期区分：改用唯一 `period:social-lifetime`，日更批次存在该记录就跳过 Social 重新生成。共享数据库已从原成功记录初始化单份英文及已有中文，不重新请求 AI；旧日期记录仅留审计。页面和代码仍仅本地，未推送部署。

2026-10-21 用户纠正：Social 每天仍基于最新累计数据重新生成，更新同一份 `period:social-lifetime` 英文/中文缓存；单份不是停止日更。页面读取不触发生成。Post 合并为单行，左右共享资料垂直居中，Organic/Paid 指标上下排列且无内部横线。

2026-10-21 本地 Reddit 更新：默认选项更名 Lifetime (Sep 24, 2026 – Now)，日更批次增加 Reddit 累计广告分析，覆盖两个 Campaign，以唯一 `period:reddit-lifetime` 更新英文及中文；Last Week/WTD/MTD 原有生成和精确区间缓存保留。13 项相关回归通过，未推送部署。
- Reddit Lifetime 上线依赖 Bridge 支持新 label 和每批最多 5 份结果；增量修改在 `ops/bridge-reddit-lifetime.patch`，完整初始补丁也同步更新。当前仅准备文件，尚未修改生产 Bridge。


### 2026-10-21 远程 Bluevua Testing 素材库

- 用户授权安装在 `/home/ubuntu/work/emw3-anc/bluevua`。独立环境 `.local/markitdown-venv` 已安装 `markitdown[all]` 0.1.8、yt-dlp、FFmpeg、Pillow、faster-whisper 1.2.1；不修改 Dashboard npm 依赖或全局 Codex/Slack 服务。
- 当前归档 160 份记录（84 文案、48 图片、27 视频、1 仅元数据记录），75 项视觉描述、27 条视频原文件/抽帧、18 份字幕或自动转写，12 个 Campaign 索引。YouTube 13 个原视频，11 条发布字幕，另 2 条 TranscriptsDisabled；未识别出语音的项目明确记录，不编造台词。Meta 的 4 条视频在 Graph 缺 source 时从本期授权广告预览解析取得。
- 总入口 `.local/creative-library/INDEX.md`；按 Campaign 和平台素材 ID 保存源文案、描述、字幕时间点、抽帧链接、观察及缺口。资料只存私有目录，不进 GitHub。Bluevua README/知识/工作流索引已登记；原始数据与 MD 不等于绩效结论或产品主张批准。
- 可复现源代码在本仓库 `scripts/creative-library/`。远程工具全部安装在 Bluevua `tools/`；`export_testing_creatives.mjs` 在 Dashboard 工作目录运行，仅在该进程内加载其配置，读取当前官方素材范围并导出私有输入，不输出凭据。当前 Search label、PMAX Asset group、Demand Gen group、Meta Campaign IDs、Reddit Campaign/分组均沿用 Dashboard 配置。
- 后续本地执行 `bash scripts/creative-library/update-from-local.sh`：官方元数据 → 本地网络补齐 YouTube（EC2 会 RequestBlocked）→ 校验增量同步 → 远程抽取/识别。本地辅助环境位于忽略的 `.state/creative-source-sync/venv`；远程单独执行 `bash tools/update_testing_creatives.sh` 也可用，但新 YouTube 素材被云端拦截时需本地补齐。
- HTTP 条件请求和内容指纹避免重复传输/识别；同一 YouTube ID 也检查来源版本及字幕变化。离线 Whisper 自动转写标为未核对，视频视觉基于抽帧，不冒充连续审片。无变化复跑已验证 `changed: 0`，未产生新视觉调用、抽帧或转写。5 项针对性测试及实际 MarkItDown 转换通过。
- 当前任务只安装素材工具并保存资料；Dashboard/Prompt 本地修改未推送部署。Testing 分析 Prompt 已补充该私有素材入口，未重跑网站现有分析缓存。
