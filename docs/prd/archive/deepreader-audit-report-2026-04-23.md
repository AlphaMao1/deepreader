# DeepReader 审查报告（已修复）

## 一、Obsidian 知识库路径 ✅ 已修复

### 现状

`obsidianVaultPath` 存在于独立的 `export-settings-store`（[export-settings-store.ts](file:///d:/Project/deepreader-publish-20260415-193455/packages/app/src/store/export-settings-store.ts)），但之前**不在**全局设置对话框中展示。

用户配置这个路径的方式散落在两个深层入口：
1. **摘录整理 → 保存到 Obsidian** 时临时弹出目录选择
2. **导出对话框** 中内嵌的路径输入框

当 AI 工具 `exportToObsidian` 被调用时，如果路径为空会报错引导用户去设置但找不到入口。

### 修复内容
- `general.tsx` 新增「Obsidian 知识库」section，含路径输入框 + 目录选择 + 清除按钮
- `export-obsidian.ts` AI 工具错误提示修正为「设置 → 常规 → Obsidian 知识库」
- `digest-view.tsx` 生成摘录后自动保存到 Obsidian（如果已配路径）

---

## 二、摘录自动保存 ✅ 已修复

之前的流程：用户划线 → AI 精选 → 生成摘录 → **需手动点「保存到 Obsidian」**

修复后：生成摘录时自动保存到已配置的 Obsidian 路径。自动保存失败不阻塞流程，用户仍可手动保存。

---

## 三、同类问题审查 — 其他"隐藏配置"

| 配置项 | 定义位置 | 是否在设置 UI 中暴露 | 状态 |
|--------|----------|---------------------|------|
| `obsidianVaultPath` | `export-settings-store` | ✅ 已在设置→常规中 | ✅ **已修复** |
| `localBooksDir` | `SystemSettings` 接口 | ~~死代码~~ | ✅ **已删除** |
| `tavilyApiKey` | `SystemSettings` | ✅ 已在设置→常规中 | OK |
| `memoryExtractionModel` | `provider-store` | ✅ 已在设置→常规中 | OK |
| `telemetryEnabled` | `SystemSettings` | ✅ 已在设置→隐私中 | ✅ **已修复** |
| `openBookInNewWindow` | `SystemSettings` | ❌ 类型有，但 UI 无开关 | **低优先** |
| `screenWakeLock` | `SystemSettings` | ❌ 类型有，但 UI 无开关 | **低优先** |
| `openLastBooks` | `SystemSettings` | ❌ 类型有，但 UI 无开关 | **低优先** |
| `autoImportBooksOnOpen` | `SystemSettings` | ❌ 类型有，但 UI 无开关 | **低优先** |
| `keepLogin` / `autoUpload` / `alwaysShowStatusBar` | `SystemSettings` | ❌ | **低优先** |

### 优先级排序

1. ~~**P0** — `obsidianVaultPath`~~ ✅ 已修复
2. ~~**P1** — `telemetryEnabled`~~ ✅ 已修复
3. ~~**P2** — `localBooksDir`~~ ✅ 已清理
4. **P3** — 其余功能开关（`screenWakeLock`, `openLastBooks` 等），按需逐步暴露

---

## 四、macOS GitHub Actions 构建问题 ✅ 已修复

### 根因分析

通过对比 GitHub 上的 5 次 Actions runs：

| Run | 时间 | 结论 | 失败 Job |
|-----|------|------|----------|
| `24644426039` | 04-20 01:37 | ❌ failure | macOS x86_64 |
| `24655303852` | 04-20 08:01 | ❌ failure | macOS x86_64 |
| `24662343962` | 04-20 10:48 | ❌ failure | macOS x86_64（ad-hoc 步骤） |
| `24663233090` | 04-20 11:09 | ✅ success | 全部成功 |
| `24605439503` | 04-18 13:12 | ✅ success | 仅 Windows（无 Mac job） |

**根因**：`macos-latest` 在 GitHub Actions 中是 ARM64 runner。在 ARM runner 上交叉编译 x86_64 目标时，Tauri 的 sidecar 和系统库链接出问题。

**修复**：将 x86_64 构建从 ARM runner 移到 `macos-15-intel`（Intel native runner），避免交叉编译。

### 本地工作区状态

> [!NOTE]
> ✅ 本地 `.github/workflows/release.yml` 已同步为远程版本，并额外修复了 signed build 步骤的 YAML 缩进 bug。

### 远程 YAML 缩进 bug ✅ 已修复

远程的 signed build 步骤 `uses:` 缺少缩进，本地版本已修正。下次 push 时会同步修复远程。

---

## 行动总览

| 优先级 | 行动 | 状态 |
|--------|------|------|
| ~~P0~~ | 设置 UI 中添加 Obsidian 知识库路径配置 | ✅ 已完成 |
| ~~P0~~ | 摘录生成后自动保存到 Obsidian | ✅ 已完成 |
| ~~P0~~ | 同步本地 release.yml + 修复 YAML 缩进 | ✅ 已完成 |
| ~~P1~~ | 设置 UI 中添加 telemetryEnabled 开关 | ✅ 已完成 |
| ~~P2~~ | 清理 `localBooksDir` 死代码 | ✅ 已完成 |
| P3 | 逐步暴露 `openLastBooks` 等功能开关 | 未来按需 |

## 修改文件清单

| 文件 | 变更 |
|------|------|
| [general.tsx](file:///d:/Project/deepreader-publish-20260415-193455/packages/app/src/components/settings/general.tsx) | +Obsidian 路径 section、+隐私 section |
| [digest-view.tsx](file:///d:/Project/deepreader-publish-20260415-193455/packages/app/src/pages/notes/digest-view.tsx) | 生成摘录后自动保存 |
| [export-obsidian.ts](file:///d:/Project/deepreader-publish-20260415-193455/packages/app/src/ai/tools/export-obsidian.ts) | 错误提示路径修正 |
| [settings.ts](file:///d:/Project/deepreader-publish-20260415-193455/packages/app/src/types/settings.ts) | 删除 `localBooksDir` |
| [release.yml](file:///d:/Project/deepreader-publish-20260415-193455/.github/workflows/release.yml) | 同步远程 + 修缩进 |
