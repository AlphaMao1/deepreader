# DeepReader context

更新日期：2026-06-24

仓库：<https://github.com/AlphaMao1/deepreader>

本地路径：`D:\Project\deepreader`

当前基线：

- 本地 `main` 与远端 `origin/main` 一致：`73f005b4b0f279f408c1cdfd3761e243dbcbe268`
- GitHub 默认分支：`main`
- GitHub 仓库状态：public
- GitHub API 显示 `isFork=false`；README 表述为基于 `SageRead` 继续演进
- 本文件创建前工作区无未提交改动

## 为什么留下这个文件

这个项目不急，但会反复被想起。目标是把当前上下文、真实需求和待决策问题留在仓库里，避免下次重新解释一遍。

当前讨论不是要立刻开工重写，而是先判断 DeepReader 应该继续保持 Tauri 桌面应用、改成浏览器/React 版本，还是拆成 ChatGPT/Codex 里的插件式能力。

## 已确认决策

- 第一版主入口：独立阅读器里读书时顺手问 AI。
- 第一版平台优先级：电脑优先。
- 第一版应用形态：浏览器/PWA 优先，电脑和 Android 共用同一个 Web 应用。
- Tauri 暂时降级为可选壳或后续增强，不作为第一版主线。
- Android 兼容是设计约束：第一版不必先做 Android native，但架构不能把核心能力写死在桌面/Tauri 环境里。
- Android 验收标准：Android Chrome/PWA 能用即可，暂不承诺 Android native app。
- 核心新增约束：双端同步是关键能力，后续需要考虑账号、云端数据、部署、域名和同步冲突处理。
- 域名不是第一天必需。PWA 和同步后端可以先用平台提供的免费 HTTPS 二级域名验证；自定义域名后续再买。
- 第一版需要同步 EPUB 文件本身，但规模按个人轻量使用设计：约 10 本以内，空间满了可以删旧书。
- 第一版 EPUB 云端存储暂不做端到端加密；必须使用私有 bucket、用户隔离和明确删除能力。
- 第一版文件格式只支持 EPUB；暂不支持 PDF/MOBI/CBZ/扫描书。
- AI 调用优先走便宜 API，例如 DeepSeek；用户已有 GPT/Codex 订阅，但独立阅读器不能默认消耗 ChatGPT/Codex 订阅额度。
- RAG/embedding 初步策略：DeepSeek 用作便宜对话模型；embedding 优先接 Gemini Embedding 或其他低价 embedding API。
- RAG 索引策略：上传 EPUB 后自动整本索引，把等待时间前置到导入阶段；提问时不应临时现等索引。
- RAG 索引执行位置：第一版在浏览器客户端执行；上传 EPUB 到 Supabase Storage 的同时，本机解析 EPUB、分块、调用 embedding API、把 chunk/vector 写入 Supabase。
- 保留基础离线可读：已同步到本机的 EPUB 可打开，进度和标注先写本地，联网后再同步；AI 问答和跨端同步不保证离线可用。
- 登录方案：第一版使用 Supabase Auth 的邮箱 magic link 或邮箱验证码；暂不接 Google/GitHub OAuth。
- API key 策略：第一版让用户在每台设备本地配置 DeepSeek / Gemini 等 API key，保存在浏览器本机 IndexedDB/localStorage，不同步到 Supabase。
- Obsidian 集成第一版不做直写；导出 `.md` 下载即可，后续可由 Codex 自动化定期归档到指定文件夹/知识库。
- 桌面系统集成对第一版阅读器不重要。
- 实现路线：新建 `packages/web` 做 PWA 主线；现有 `packages/app` 保留为 Tauri 参考实现和可复用代码来源。
- `packages/web` 技术栈继续使用 React + Vite + Tailwind/Radix/AI SDK；不引入 Next.js 等新框架。
- UI 需要大改：可以复用交互经验、阅读器逻辑和部分组件思路，但不能照搬当前 Tauri 版界面。
- ChatGPT App / GPT Actions / Codex 插件暂时不作为主产品入口，只保留为后续集成或辅助工作流方向。
- 第一目标不是“把书变成 ChatGPT 互动课程”，而是在阅读动作发生的现场降低提问、标注、记忆和导出的摩擦。

## 背景

DeepReader 是面向深度阅读的 AI 电子书阅读器。已有定位是“读进去、记下来、继续追问”：EPUB 阅读、AI 对话、阅读记忆、笔记标注、统计分析和 Obsidian 导出。

之前搁置的重要原因是 Android/Tauri mobile 开发环境过重。Tauri 官方文档显示，Android target 需要 Android Studio、Android SDK Platform、Platform-Tools、NDK、Build Tools、Command-line Tools，以及 Rust Android targets。这和当前项目“不急、个人使用、需求不复杂”的投入强度不匹配。

用户近期更多依赖 ChatGPT 上的互动课程提示词，读书减少了。但完全放弃读书不符合长期需求：书籍仍然是高密度、体系化输入来源，DeepReader 的价值应围绕“恢复阅读习惯，并把阅读和 AI 互动接起来”重新定义。

## 当前代码形态

这个项目已经有大量 React 前端资产，不是从零做 UI：

- monorepo：`pnpm-workspace.yaml`
- 主应用：`packages/app`
- 前端：React 19、Vite、Radix、Tailwind、TanStack Query、Zustand、AI SDK
- 桌面壳：Tauri v2
- 阅读内核：本地 `foliate-js`
- 路由：`HashRouter`
- 数据后端：Tauri/Rust + SQLite schema

核心数据表包括：

- `books`
- `book_status`
- `reading_sessions`
- `threads`
- `notes`
- `book_notes`
- `skills`
- `user_memories`
- `tags`

已有能力分布：

- `DocumentLoader` 基于 `File` / `Blob` / `@zip.js/zip.js` / `foliate-js`，EPUB 等格式解析有较强浏览器可迁移性。
- 书库、进度、标注、线程、记忆、技能主要通过 `@tauri-apps/api/core` 的 `invoke(...)` 调 Rust command。
- 设置类 Zustand store 已有 `tauriStorage`，在无 Tauri 环境下会 fallback 到 `localStorage`。
- AI 对话使用 AI SDK `streamText`，支持多 provider，当前是用户自配 API key / Base URL / 模型名。
- Prompt 会注入当前划线、页面文本、章节、技能描述、长期记忆和部分书籍元信息。
- RAG/整书检索依赖向量模型、`llamacpp` 或远程 embedding，以及 `plugin:epub` 的索引/检索能力。
- Obsidian 导出当前直接写入本地 vault path，依赖 Tauri fs 权限。

## 主要方向

### A. 继续 Tauri 桌面版

优点：

- 复用最多已有代码。
- 本地文件、SQLite、Obsidian 导出、llamacpp 进程管理都顺。
- 最适合“本地优先”的原始产品定位。

问题：

- Android/iOS 仍然重。
- 桌面发布、WebView2、签名、更新仍有维护成本。
- 不能直接使用 ChatGPT 订阅里的模型能力，仍要用户配置 API key 或本地模型。

适合条件：

- 主要阅读场景在电脑。
- 本地优先和 Obsidian 直写比跨设备更重要。

如果第一版舍弃 Tauri，会失去这些能力：

- 不能直接读写任意本地路径；浏览器只能通过文件选择器、有限目录授权、下载文件或浏览器存储工作。
- Obsidian 不能稳定地直接写 vault 路径；第一版接受 Markdown 下载，后续可由 Codex 自动化或本地 companion 归档。
- 不能管理本地进程；`llamacpp` 自动下载、启动、清理这类能力要移除或改成外部服务。
- 不能直接使用 Tauri 的 fs/path/dialog/window/menu/global-shortcut/os/shell/http 插件。
- 本地 SQLite/Rust command 不能继续作为主数据层；要迁移到 Supabase + 本地 IndexedDB/OPFS cache。
- 桌面系统集成变弱：窗口控制、原生菜单、全局快捷键、系统文件关联、安装包分发、离线桌面体验都会下降。当前判断：对第一版不重要。
- 隐私边界改变：从“主要本地保存”变成“本地缓存 + 云端同步”，需要明确账号、RLS、Storage 私有桶和删除策略。

但第一版选择 PWA 的收益是：电脑和 Android 共用一套应用与同步模型，绕开 Tauri mobile/Android 原生环境，并减少平台分叉。

### B. 浏览器 / PWA / React 版

优点：

- 可复用现有 React、foliate-js、阅读器 UI 的一部分。
- 跳过 Tauri mobile 环境和桌面打包。
- 更适合做轻量个人工具或托管版。

需要重做的边界：

- 把 `book-service`、`book-note-service`、`memory-service`、`thread-service`、`skill-service` 等改成 storage adapter。
- 本地持久化可选 IndexedDB、OPFS、sqlite-wasm、PGLite 或服务端 DB。
- 书籍文件可以存到 OPFS/IndexedDB，或要求用户每次打开本地文件。
- Obsidian 导出要改成 Markdown 下载、File System Access API 目录写入、Obsidian 插件/协议，或本地 companion。
- AI 如果直接从浏览器调 provider，会暴露用户 API key；如果想代管 key，需要后端。

适合条件：

- MVP 目标是“重新开始读书”，而非完整本地知识管理系统。
- 可以接受第一版只支持 Chromium 系浏览器，或接受部分导出能力降级。

### C. ChatGPT App / GPT Actions

优点：

- 能借用 ChatGPT 的交互入口和模型体验。
- 适合做“阅读课程/苏格拉底陪读/基于摘录的互动学习”。
- OpenAI Apps SDK 当前形态是 MCP server + 可选 iframe UI，理论上可以做阅读组件。

关键限制：

- ChatGPT App 需要一个 MCP server；长期业务数据应放在 server/backend，不应只放 widget 内部。
- 自定义 GPT Actions 需要外部 API 和 OpenAPI schema；Actions 与 Apps 不能在同一个 GPT 中同时使用。
- 如果要完整书库、标注和记忆，需要后端或明确的文件上传/同步策略。
- 它更像“AI 互动层”，不天然替代本地阅读器。

适合条件：

- 主要目标是用 ChatGPT 订阅里的模型能力做陪读和课程化互动。
- 书籍内容可以通过上传、摘录、后端存储或外部知识库提供。

### D. Codex 插件 / Skill

优点：

- 适合把 DeepReader 相关工作流沉淀为可复用工具，例如导入摘录、整理 Obsidian、生成读书课程、维护仓库。
- 可以把本项目的开发、整理、发布流程做成本地 skill 或 plugin。

限制：

- Codex 插件主要给 Codex 增加 skills、apps、MCP servers 和工作流，不是面向普通阅读的前台应用。
- 它适合做“阅读资料加工/项目维护助手”，不适合作为主阅读器 UI。

适合条件：

- 先把“读完之后如何沉淀”做好，而不是先做完整 reader。

## 当前倾向

先不要从“重构全产品”开始。主入口已经确定为独立阅读器，因此更稳的路径是定义一个能恢复阅读习惯的最小产品：

- 导入或打开 1 本 EPUB
- 阅读并保存进度
- 画线/标注，位置使用 CFI
- 选中文本后和 AI 对话
- 保存基础记忆：读者画像、概念、书籍 gist
- 导出 Markdown，保持 Obsidian 友好
- 电脑和 Android PWA 双端同步阅读进度、标注、记忆和对话索引
- 同步 EPUB 文件；第一版限制为小书库，超过容量时手动删除
- 上传 EPUB 后自动抽取文本、分块、生成 embedding、写入检索索引，并显示索引进度
- 第一版只支持 EPUB
- 阅读器 MVP 必须支持选中文字后的浮动菜单：高亮、记笔记、Ask AI
- AI 对话容器：桌面使用右侧常驻侧栏，Android/PWA 窄屏使用 bottom sheet；聊天逻辑共用，容器响应式切换。
- 记忆第一版：手动 `/记住` + AI 建议记忆，用户确认后保存；暂不做完全自动抽取。
- 对话记录第一版：每本书一个默认线程；暂不做一本书多个聊天线程/专题线程管理。
- 同步冲突第一版：使用 `updated_at` 做 last-write-wins；进度最后写入为准；标注、笔记、记忆、消息按单条记录追加/更新，不做整本覆盖；删除使用 `deleted_at` 软删除。
- 删除书籍策略：默认删除 EPUB 文件、本地缓存、RAG 索引、书籍记录，并软删除该书标注/对话；跨书记忆不自动删除，除非用户额外确认“彻底删除相关记忆”。

第一版暂不追求：

- Android native
- 本地 `llamacpp` 自动启动
- 自动更新
- 多格式全支持
- PDF/MOBI/CBZ/扫描书支持
- 独立后端索引队列；除非客户端索引证明不稳定，才升级成后端任务

但第一版实现时要避免制造 Android/PWA 迁移障碍：

- 阅读核心优先依赖浏览器可用的 `File` / `Blob` / `IndexedDB` / `OPFS` / `foliate-js` 能力。
- UI 布局从第一版就保留窄屏、触屏和虚拟键盘场景的约束。
- Tauri 能力通过 adapter 隔离，不让业务组件直接散落依赖 `invoke(...)`、Tauri path/fs/dialog/window API。
- 本地文件直写、Obsidian 目录写入、`llamacpp` 进程管理等桌面特权能力作为增强层，不作为阅读主流程的必要条件。
- 数据模型从第一版就按“本地缓存 + 云端同步”考虑，避免只按单机 SQLite 思路写死。

## 部署与成本初步判断

价格会变化，正式执行前要重新查官方页面。按 2026-06-24 核对到的信息：

- 前端/PWA 托管可以先免费：Cloudflare Pages Free 或 Vercel Hobby 都能跑个人项目。
- 后端同步如果只同步元数据，个人阶段可以先用 Supabase Free、Cloudflare Workers/D1/KV Free，或类似 BaaS 免费层。
- 自定义域名不是必需；平台二级域名已经有 HTTPS，足够验证 PWA 和登录同步。
- 如果要买域名，普通 `.com` 通常按年付费，大致是十几美元/年量级；不同注册商和续费价差异较大。
- 如果进入稳定自用/小范围使用，比较现实的月成本是 `0-30 USD/月`，外加域名 `约 10-20 USD/年`。
- Supabase Free 作为第一版同步后端大概率够用，但要记住硬限制：数据库大小 `500 MB`，Storage `1 GB`，单文件上传上限 `50 MB`，Egress `5 GB/月`，Edge Function `500,000/月`，Realtime 峰值连接 `200`。
- 对 10 本以内 EPUB：只要单本小于 `50 MB`，总量小于 `1 GB`，Supabase Free 可以覆盖。图多的大 EPUB / PDF 可能会撞单文件上限。
- 如果同步 EPUB 文件，成本不一定立刻高，但复杂度明显上升：对象存储、上传限制、版权/隐私、备份、删除、设备离线一致性都要处理。
- 第一版不做端到端加密，换取跨端解析、AI 检索、调试和实现速度；安全边界先依赖 Supabase Auth、Row Level Security、私有 Storage bucket、按用户路径隔离和删除书籍时同步删除对象。
- AI API 费用要单独算；ChatGPT Plus/Pro 订阅不等于 OpenAI API 免费额度。若阅读器直接调用 API，需要用户自己的 API key 或项目自己的 API 账单。
- RAG/embedding 成本初判：Gemini `gemini-embedding-001` 当前有 free tier，付费价 `0.15 USD / 1M input tokens`；`gemini-embedding-2` 文本付费价 `0.20 USD / 1M tokens`。10 本以内 EPUB 即使用付费 embedding，通常也是几毛美元到一两美元量级；免费层大概率够自用验证，但限流不保证，需支持上传后客户端后台索引、进度显示、失败重试、暂停/恢复、标签页关闭后继续/恢复、手动重新索引。
- DeepSeek 当前官方模型/价格页主要是 `deepseek-v4-flash`、`deepseek-v4-pro` 对话模型，价格约为 input cache miss `0.14/0.435 USD / 1M tokens`、output `0.28/0.87 USD / 1M tokens`；适合作为低成本对话模型，不应假定它提供 embedding API。

## 下一轮 grill-me 问题

已经回答的问题：

> 这个项目的第一使用场景，是“独立阅读器里读书时顺手问 AI”，还是“ChatGPT 里以书为材料上互动课程”？

答案：

- 独立阅读器里读书时顺手问 AI。

已经回答的问题：

> 第一版更应该优先服务电脑阅读，还是手机/平板阅读？

答案：

- 电脑优先。
- 但这一版设计时必须考虑手机，特别是 Android 兼容问题。

下一个必须澄清的问题：

> Android 兼容的验收标准是什么：Android Chrome/PWA 能用就够，还是未来必须做 Android native app？

这会决定我们是围绕 Web/PWA 能力做兼容，还是继续为 Tauri mobile / native shell 保留更重的工程路线。

答案：

- Android Chrome/PWA 能用即可。
- 核心是电脑与 Android 之间的双端同步。

新的待澄清问题：

> 双端同步第一版同步什么：只同步进度/标注/记忆/对话，还是连 EPUB 文件也同步？

这会直接决定后端成本和实现难度。只同步元数据可以很便宜；同步书籍文件会引入对象存储、版权/隐私、上传限制和备份策略。

答案：

- 第一版需要同步 EPUB 文件本身。
- 书库规模小，预计 10 本以内；空间满了可以删。
- 暂时不买自定义域名。
- AI API 可以优先使用 DeepSeek 等低价 API。

新的待澄清问题：

> EPUB 文件要不要端到端加密后再上传 Supabase Storage？

答案：

- 同意第一版先不做端到端加密。
- 第一版必须做私有 bucket、用户隔离和删除能力。

新的待澄清问题：

> 电脑端第一版要做成“浏览器/PWA”，还是继续做“Tauri 桌面安装包”？

答案：

- 浏览器/PWA 优先。
- Tauri 降级为可选壳或后续增强。

新的待澄清问题：

> 第一版要不要保留“离线可读”作为硬需求？

答案：

- 保留基础离线阅读。
- 已同步到本机的 EPUB 可离线打开，进度和标注先存本地，联网后再同步。
- AI 问答、RAG 远程检索、跨端同步不保证离线可用。

新的待澄清问题：

> 舍弃 Tauri 的损失是否可接受？

答案：

- 可接受。
- Obsidian 直写改成 `.md` 下载，后续由 Codex 自动化归档。
- 桌面系统集成对阅读器不重要。
- RAG/embedding 走免费或低价 API，需要确认额度和成本。

新的待澄清问题：

> 第一版 RAG 要做到“上传 EPUB 后自动整本索引”，还是“读到某本书、需要问整书问题时再手动索引”？

答案：

- 上传 EPUB 后自动整本索引。
- 等待应该放在上传/导入阶段；问问题时再索引会破坏体验。
- 需要进度、失败重试、可暂停/恢复和手动重新索引能力。

新的待澄清问题：

> 索引任务第一版放在哪里跑？

答案：

- 第一版放在浏览器客户端跑。
- 上传 EPUB 到 Supabase Storage 的同时，本机解析 EPUB、分块、调用 embedding API、把 chunk/vector 写入 Supabase。
- 缺点是浏览器标签页关闭会中断，因此必须持久化索引状态，支持恢复。

新的待澄清问题：

> 登录方案第一版怎么做？

答案：

- Supabase Auth。
- 优先 email magic link 或邮箱验证码。
- 暂不接 Google/GitHub OAuth，减少配置、回调和隐私边界复杂度。

新的待澄清问题：

> DeepSeek / Gemini API key 第一版放哪里？

答案：

- 用户在每台设备本地配置自己的 API key。
- key 存在浏览器本机 IndexedDB/localStorage。
- 不同步到 Supabase，不由项目后端代管。
- 代价是电脑和 Android 需要各配置一次。

新的待澄清问题：

> 第一版文件格式只支持 EPUB，还是也要 PDF/MOBI/CBZ？

答案：

- 只支持 EPUB。
- 暂不支持 PDF/MOBI/CBZ/扫描书，避免把阅读定位、选区、高亮、RAG 分块和移动端体验拉复杂。

新的待澄清问题：

> 阅读器 MVP 的最低交互要不要包括“画线后立刻弹出 Ask AI / 记笔记 / 高亮”这组浮动菜单？

答案：

- 要。
- 这是“读的时候顺手问 AI”的核心链路，不是附加功能。

新的待澄清问题：

> AI 对话第一版是“阅读器右侧常驻侧栏”，还是“浮动小窗 / bottom sheet”？

答案：

- 桌面用右侧常驻侧栏。
- Android/PWA 窄屏用 bottom sheet。
- 同一套聊天能力，两套响应式容器。

新的待澄清问题：

> 第一版“记忆”要自动从对话里提取，还是只做手动 `/记住`？

答案：

- 先做手动 `/记住`。
- 可以加“AI 建议记忆，用户确认保存”。
- 暂不做完全自动抽取，避免记忆污染。

新的待澄清问题：

> 对话记录第一版要按“每本书一个默认线程”保存，还是允许一本书多个聊天线程？

答案：

- 每本书一个默认线程。
- 暂不做多线程管理。
- 后续确实需要时再加“专题线程”。

新的待澄清问题：

> 同步冲突第一版怎么处理？

答案：

- 使用 `updated_at` 做 last-write-wins。
- 阅读进度以最后写入为准。
- 标注、笔记、记忆、消息按单条记录追加/更新，不做整本覆盖。
- 删除用 `deleted_at` 软删除，跨端同步后隐藏。

新的待澄清问题：

> 删除一本书时，默认要不要同时删除云端 EPUB 文件、RAG 索引、标注、对话和记忆？

答案：

- 默认删除 EPUB 文件、本地缓存、RAG 索引、书籍记录。
- 该书标注/对话跟书一起软删除。
- 跨书记忆不自动删，避免误删长期概念沉淀。
- 如需彻底删除相关记忆，必须用户额外确认。

新的待澄清问题：

> 实现路线是“在现有 `packages/app` 里直接改成 PWA”，还是“新建一个 `packages/web`，逐步迁移/复用阅读器代码”？

答案：

- 新建 `packages/web`。
- `packages/app` 保留为 Tauri 参考实现，不在第一版里硬改成 PWA。
- `packages/web` 从第一天按 Supabase + IndexedDB/OPFS + PWA 设计，选择性复用现有阅读器、AI、UI 代码。

新的待澄清问题：

> `packages/web` 技术栈要不要继续用现有的 React + Vite + Tailwind/Radix/AI SDK？

答案：

- 继续使用 React + Vite + Tailwind/Radix/AI SDK。
- 不为了 PWA 引入 Next.js 或其他新框架。
- UI 要大改，不能照搬当前 Tauri 版界面。

## 参考资料

- Tauri v2 prerequisites：<https://v2.tauri.app/start/prerequisites/>
- OpenAI Apps SDK quickstart：<https://developers.openai.com/apps-sdk/quickstart>
- OpenAI Apps SDK MCP server：<https://developers.openai.com/apps-sdk/build/mcp-server>
- OpenAI Apps SDK state management：<https://developers.openai.com/apps-sdk/build/state-management>
- OpenAI GPT Actions help：<https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts>
- OpenAI Codex plugins：<https://developers.openai.com/codex/plugins>
- OpenAI Codex MCP：<https://developers.openai.com/codex/mcp>
- MDN File System API：<https://developer.mozilla.org/en-US/docs/Web/API/File_System_API>
- MDN OPFS：<https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system>
