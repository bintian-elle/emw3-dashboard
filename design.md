# Website design

优先复用成熟库、组件源代码可控、统一设计语言、严格限制重复依赖。严禁在已有依赖可以正确表达的情况下自行设计实现组件和行为。

- UI 风格统一使用，譬如 shadcn/ui Nova。
- 图标统一使用，譬如 Lucide。
- 动画统一使用，譬如 Motion。
- 布局库，譬如 react-resizable-panels。
- 拖拽使用，譬如 dnd-kit。
- 状态管理使用，譬如 Zustand。

以上库是可选方向；根据实际需求和已有依赖选择，不为暂时未用到的能力引入重复依赖。

## 设计基准

以相邻项目 `dashboard- design/testing-overview` 的源码为视觉和交互基准，直接查阅其 `src/App.tsx`、`src/index.css` 和 `src/components/ui/`，不以旧网站样式或截图推断代替。当前 Testing 页面用于检查统一设计，设计系统及共用组件可在全站更新。保留真实数据、路由、功能和无障碍行为；参考项目的示例数据不用于替换真实数据。

- 采用参考项目的 shadcn/ui Nova 组件结构、黑白灰主题、Geist 字体、尺寸、间距与交互状态；组件源码应由项目控制，优先复用项目已安装的 Radix、Lucide、Motion、Recharts 和 TanStack Table。
- 按参考实现响应式导航：桌面使用全高侧栏，窄屏隐藏侧栏并使用菜单按钮打开可通过遮罩、关闭按钮和 Escape 关闭的左侧抽屉；导航后关闭抽屉。
- Nova 是全站默认设计，不依赖预览参数；项目入口、登录、各仪表盘与 AI Tools 均使用相同主题、字体、按钮和交互模式。
- 网站主页采用并列的 Workspaces 和 AI Tools 入口，顶部不显示全站导航栏；品牌工作区可扩展，Bluevua 是其中一个品牌，主页保留其仪表盘直达入口。窄屏时两栏纵向排列，并支持明暗主题。
- 新用户首次访问默认使用英文；用户主动切换后的语言偏好按账户保存。中文模式翻译界面文案，但指标名称和渠道名称保留英文，品牌、Campaign 名称及原始素材保持原文。
- Campaign 状态以文字搭配语义色标识：投放中为绿色、暂停为琥珀色、已发送为蓝色、已结束为紫色、未知为灰色；明暗主题均保持可读对比度，不仅依靠颜色传达状态。
- Testing 侧栏按 Workspace 与 Channels 分组，Test inventory 使用已发布的真实 Campaign 数据及状态并链接到对应页面；Campaign 数量使用手动维护的统一配置，Social Media 保留独立入口，不计入清单或数量。
- Overview 与 Test inventory 切换时优先展示目标页面的标题、导航和卡片结构，等待数据的位置显示局部加载状态，并在内容顶部中央显示简短提示；清单复用已发布的共享快照，不为切换触发渠道 API 刷新。
- Testing 报表优先使用当前周期的本机缓存，后台轻量核对共享快照版本，只有版本变化时才更新数据；缓存失效或数据源错误时保留最后一次成功的数据，不将不同周期的数据混用。
- Concluded Test 侧栏入口直接进入主页面并显示已结束 Campaign 总数；主页面使用与 Test inventory 一致的可搜索 Campaign 列表，不显示状态标签；数量按 Campaign 去重，与侧栏使用相同口径。
- Business Performance 与 Channel Performance 的标题样式一致，标题与内容分别置于同一张卡片中；渠道表格默认按侧栏顺序排列，渠道名称不提供排序，数值列保留表头排序。EDM、Social Media 以各自表头和数据行展示专属指标，保留渠道跳转。
- Business Performance 的 Total ROAS 和 Total Conversion Rate 趋势图可通过下划线标签切换渠道或素材维度；默认按 Google、Meta、Reddit、EDM 的固定顺序展示渠道，图表仅显示当前维度的图例。切换保留折线动画并尊重减少动态效果设置。素材维度缺少可靠数据时明确展示不可用，不推算缺失数据。
- 公司动图 Logo 和 Bluevua 品牌标识使用本地资源；顶部公司 Logo 链接到网站主页，减少动态效果时显示静态标识。
- 渠道使用真实品牌图标，Google 三种 campaign 使用清晰区分的单个方形图标位，不使用横向组合标识。
- Ask AI 的面板、讨论范围、建议问题、输入框及触发按钮参照 `testing-overview/src/ask-ai.tsx`、`src/components/ui/shiny-button.tsx` 和 `src/index.css`；洞察中的提问输入框复用同一输入组件，保留现有数据范围和真实对话能力。
- 洞察操作行的分析按钮与提问输入框外框保持等高，输入换行增高时同一行按钮随之对齐。
- Ask AI 在较低的屏幕高度下使用紧凑的讨论范围布局，为聊天记录和输入框保留空间；对比对象逐行展开，打开对话时显示最新消息，用户查看历史消息时不强制跳回。
- 遵循参考组件的键盘、焦点、暗色和减少动态效果支持。迁移共用组件时保留既有业务 API 和行为。

现有 React 和 Tailwind 架构以及本地组件可按需迁移；旧组件的样式不再作为设计基准。

Existing implementation references:

- `components/base/` and `components/application/`: local components.
- `styles/theme.css` and `styles/typography.css`: current theme and type definitions.
- `styles/globals.css`: shared styles.
