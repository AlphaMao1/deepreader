# DeepReader 夜间仓库体检报告

## 1. 结论

- **总体状态：黄（Yellow）**
- **一句话结论：** 仓库核心构建基本通过，但存在 1 个 TypeScript 编译失败（app-tabs）、大量 Biome 格式问题（1457 项）、以及较多未使用的导出和文件需要清理。
- **今天最值得处理的 3 件事：**
  1. 修复 \packages/app-tabs\ 的 TS2322 类型错误（\enableDragRegion\ 属性不存在于目标类型）
  2. 清理 app 代码中遗留的 \console.log\（4 处活跃在生产代码中）
  3. 评估 knip 报告的 60 个未使用文件，确认哪些可以安全删除

## 2. 本次运行信息

| 项目 | 内容 |
|---|---|
| 运行时间 | 2026-06-26 22:58 ~ 23:35 (CST) |
| 仓库路径 | D:\Project\deepreader |
| 当前分支 | feature/web-pwa-reader |
| 当前 commit | 73f005b4b0f279f408c1cdfd3761e243dbcbe268 |
| worktree 状态 | dirty（2 个已修改文件 + 3 个未跟踪目录/文件） |
| Node | v24.12.0 |
| pnpm | 10.33.0（有可用更新 11.9.0） |
| Rust | rustc 1.94.1 |
| Cargo | cargo 1.94.1 |
| Git | 2.52.0.windows.1 |

### Worktree 未提交改动

- 已修改：\package.json\（+3 行）、\pnpm-lock.yaml\（+40 行）
- 未跟踪：\context.md\、\docs/prd/\、\packages/web/\

## 3. 工具链配置结果

所有必需工具链均已可用，无需额外安装：

| 工具 | 状态 | 版本 |
|---|---|---|
| Node.js | 可用 | v24.12.0 |
| corepack | 可用 | 0.34.5 |
| pnpm | 可用 | 10.33.0 |
| rustc | 可用 | 1.94.1 |
| cargo | 可用 | 1.94.1 |
| git | 可用 | 2.52.0 |
| rg (ripgrep) | 不可用 | 未安装在 PATH 中，使用内置 Grep 替代 |
| cargo audit | 未验证 | 本次未单独运行 |

## 4. 检查矩阵

| 检查项 | 命令 | 结果 | 日志文件 | 备注 |
|---|---|---|---|---|
| 依赖一致性 | pnpm install --frozen-lockfile | **pass** | pnpm-install.log | Lockfile up to date |
| app-tabs build | pnpm --filter app-tabs build | **fail** | app-tabs-build.log | TS2322: enableDragRegion 属性不存在 |
| foliate-js build | pnpm --filter foliate-js build | **pass** | foliate-js-build.log | 有 node-resolve 警告但不影响构建 |
| web typecheck | pnpm --filter web test | **pass** | web-test.log | tsc -b 无错误 |
| web build | pnpm --filter web build | **pass** | web-build.log | 1666 modules, 32s |
| app build | pnpm --filter app build | **pass** | app-build.log | tsc + vite build, 15m43s; chunk size 警告 |
| Tauri cargo check | cargo check (主 Cargo.toml) | **pass** | cargo-check-tauri.log | 3 个 unused import 警告 |
| EPUB plugin cargo check | （包含在主 cargo check 中） | **pass** | cargo-check-tauri.log | 无错误 |
| llama plugin cargo check | （包含在主 cargo check 中） | **pass** | cargo-check-tauri.log | 2 个 unused import 警告 |
| Biome check | pnpm exec biome check . | **fail** | biome-check.log | 1457 errors, 2 warnings（格式+import排序） |
| pnpm audit | pnpm audit --audit-level moderate | **未完成** | pnpm-audit.log | npmmirror 镜像不支持 audit endpoint |
| TODO / risk scan | Grep 扫描 | **完成** | rg-todo-scan.log | 16 TODO/FIXME, 7 console.log, 6 innerHTML, 17 unwrap/expect |
| knip (optional) | pnpm dlx knip --reporter markdown | **完成** | knip-scan.log | 60 未使用文件, 68 未使用类型, 3 重复导出 |

## 5. 主要发现

按严重程度排序：

### 5.1 [P1] app-tabs TypeScript 编译失败

- **证据：** \src/component.tsx(108,106): error TS2322: Property 'enableDragRegion' does not exist on type\
- **影响：** app-tabs 包无法编译。虽然 app 主包的 vite build 仍然通过（可能 app-tabs 的 tsc 不阻塞 vite），但这是一个明确的类型错误。
- **建议：** 在 app-tabs 的 props 类型定义中添加 \enableDragRegion\ 属性，或从调用处移除该属性。
- **是否适合夜间自动修复：** 否（需要理解业务意图）

### 5.2 [P2] Biome 格式/Import 排序问题大量积压

- **证据：** 1457 errors, 2 warnings。主要是格式不符合 biome formatter 规则、import 未排序。
- **影响：** 代码风格不一致。不影响运行，但会增加 PR diff 噪音。
- **建议：** 选择一个合适的时机运行 \iome check --fix --unsafe\ 一次性修复。建议作为独立 PR。
- **是否适合夜间自动修复：** 是（但需要单独 PR，避免与其他改动混淆）

### 5.3 [P2] pnpm audit 无法运行

- **证据：** \ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS\ - npmmirror 镜像不提供 audit endpoint。
- **影响：** 无法确认 JS 依赖是否存在已知安全漏洞。
- **建议：** 临时切换 registry 到 \https://registry.npmjs.org\ 运行 audit，或在 CI 中配置官方 registry。
- **是否适合夜间自动修复：** 否（需要配置变更）

### 5.4 [P2] 大量未使用文件和导出（knip 报告）

- **证据：** 60 个未使用文件、68 个未使用导出类型、大量未使用导出函数
- **影响：** 代码库膨胀，增加维护成本。部分文件可能是正在开发中的功能（如 prompt-kit 组件）。
- **建议：** 逐个确认是否可以安全删除。注意 \packages/web/\ 目录是新增的未跟踪目录，knip 可能未正确覆盖。
- **是否适合夜间自动修复：** 否（需要人工确认每个文件/导出的用途）

### 5.5 [P3] Rust 代码 unused import 警告

- **证据：** 3 个 unused import 警告（jan-utils: CommandExt, llamacpp: Duration, timeout）
- **影响：** 编译噪音，不影响功能。
- **建议：** 运行 \cargo fix\ 或手动移除。
- **是否适合夜间自动修复：** 是

### 5.6 [P3] 生产代码中遗留 console.log

- **证据：** 4 处活跃 console.log（reading-session-service.ts, theme-store.ts x3, iframe-service.ts）
- **影响：** 生产环境输出调试信息，可能影响性能和安全。
- **建议：** 替换为正式日志框架或移除。
- **是否适合夜间自动修复：** 是（移除或替换）

## 6. TODO / 风险模式摘要

| 类别 | 数量 | 说明 |
|---|---|---|
| TODO / FIXME / HACK / XXX | 16 | 主要在 foliate-js（第三方 fork）和少量 app 代码中 |
| @ts-ignore / @ts-expect-error | 0 | 无 |
| console.log（活跃） | 4 | reading-session-service, theme-store, iframe-service |
| console.log（已注释） | 3 | foliate-js/epub.js |
| debugger | 0 | 无 |
| innerHTML 使用 | 6 | foliate-js(3), app-tabs(2), foliate-js/fb2.js(1) - 大部分是第三方代码或内部模板 |
| Rust unwrap/expect | 17 | 主要在 tauri-plugin-epub 的文本处理管道中 |

### 风险评估

- **innerHTML 使用**：大部分在 foliate-js（第三方 EPUB 渲染库），属于正常用法（渲染书籍内容）。biome 已关闭 \
oDangerouslySetInnerHtml\ 规则。需要人工复核的是 app-tabs/chrome-tabs.ts 中的 \innerHTML\ 赋值（标签模板渲染）。
- **Rust unwrap/expect**：大部分在初始化代码和测试默认值中，属于「如果这里失败说明程序本身有问题」的场景。network.rs 中的 unwrap 有注释说明安全性。llamacpp commands.rs 中的 unwrap 在管道操作中使用，如果失败会 panic，建议后续改为 proper error handling。
- **dict.js 中的 throw new Error('TODO')**：这是 foliate-js 的未实现路径，不是遗留调试代码。

## 7. 明晚适合继续自动跑的任务

1. **Biome 格式修复 PR 生成**
   - 运行 \iome check --fix --unsafe\，将修改写入临时分支，生成 diff 报告
   - 验收：diff 只包含格式变更，不包含逻辑变更

2. **knip 未使用文件清理评估**
   - 对 60 个未使用文件逐一检查最后修改时间和引用情况，分类为「可删除」/「需保留」
   - 验收：生成清理建议清单

3. **Rust unused import 清理**
   - 运行 \cargo fix --lib\ 移除 unused imports
   - 验收：cargo check 无 unused import 警告

4. **pnpm audit 补充检查**
   - 临时切换 registry 运行 audit，记录结果
   - 验收：输出 audit 结果或明确记录失败原因

5. **console.log 清理**
   - 移除或替换 4 处活跃 console.log
   - 验收：grep 确认无活跃 console.log（theme-store 的初始化日志除外）

## 8. 本次自动化产物

| 产物 | 路径 |
|---|---|
| 主脚本 | \D:\Project\deepreader\qoder-nightly-health\run-nightly-health.ps1\ |
| 定时任务示例 | \D:\Project\deepreader\qoder-nightly-health\register-windows-task.example.ps1\ |
| 工作区说明 | \D:\Project\deepreader\qoder-nightly-health\README.md\ |
| 原始日志目录 | \D:\Project\deepreader\qoder-nightly-health\runs\2026-06-26\raw\\\ |
| 本报告 | \D:\Project\deepreader\qoder-nightly-health\runs\2026-06-26\final-report.md\ |

### 日志文件清单

- git-status.log
- pnpm-install.log
- app-tabs-build.log
- foliate-js-build.log
- web-test.log
- web-build.log
- app-build.log
- cargo-check-tauri.log
- biome-check.log
- pnpm-audit.log
- rg-todo-scan.log
- knip-scan.log

## 9. 限制说明

本次体检**未覆盖**以下内容：

- **未启动桌面应用**：没有运行 \pnpm dev\ 或 \pnpm tauri dev\，未验证运行时行为。
- **未打 Tauri 安装包**：\pnpm build\（根目录）会触发 \	auri build\，耗时很长且依赖本机打包环境（Visual Studio Build Tools、WebView2 SDK 等）。本次只跑了 \pnpm --filter app build\（tsc + vite build），不包含 Tauri 打包。
- **未运行端到端 UI 测试**：仓库中没有配置 E2E 测试框架。
- **未配置 API Key**：未测试 AI 对话、RAG 检索等需要模型服务的功能。
- **pnpm audit 未完成**：npmmirror 镜像不支持 audit endpoint。
- **cargo audit 未运行**：未单独安装 cargo-audit。主 cargo check 覆盖了编译时能发现的类型错误，但不覆盖安全公告。
- **未提交任何改动**：本次体检所有写入操作均限制在 \qoder-nightly-health/\ 目录内。
- **未注册 Windows 定时任务**：只生成了注册示例脚本，未实际注册系统任务。
- **dirty worktree**：当前分支有未提交改动（package.json、pnpm-lock.yaml 修改，以及 context.md、docs/prd/、packages/web/ 未跟踪）。这些改动可能影响体检结果的准确性。
