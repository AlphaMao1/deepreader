# PRD M3: Android 客户端移植 v2

**Milestone**: M3
**Priority**: P2
**Label**: `needs-triage`
**Estimated Effort**: 22-35 人天（不含 Spike；Spike 结果可能调整此估算）
**Dependencies**: M1（登录+同步已就位）、M2b（移动端布局组件已实现）
**Gate**: M3-Spike 必须通过后才开始正式实施

---

## Problem Statement

DeepReader 目前仅支持 macOS 和 Windows 桌面平台。用户无法在 Android 手机/平板上使用完整的深度阅读体验（EPUB 阅读、AI 对话、笔记标注、Obsidian 导出）。

## Solution

基于 Tauri 2 的 Android 支持，将 DeepReader 完整移植到 Android 平台。

## M3-Spike: 前置可行性验证（1-2 天）

> [!IMPORTANT]
> 在投入 22-35 天正式开发前，必须先完成以下验证。任一项失败需要回退评估替代方案。

| # | 验证项 | 通过标准 | 失败应对 |
|---|---|---|---|
| 1 | `tauri android init` + `tauri android dev` | App 启动，显示 React 前端 | 检查 Tauri 2 Android 文档 + GitHub Issues |
| 2 | `tauri-plugin-epub` ARM 编译 | `cargo build --target aarch64-linux-android` 成功 | 可能需要交叉编译配置或 epub crate 的 C 依赖适配 |
| 3 | foliate-js 在 Android WebView 渲染 | EPUB 可正常翻页显示 | WebView 兼容性问题可能需要 polyfill |
| 4 | `tauri-plugin-dialog` 文件选择 | 能通过 SAF picker 选中 EPUB 文件 | 如果不行需要自定义 Android Intent |
| 5 | 条件编译排除 llamacpp + global-shortcut | 不含这两个插件时编译通过并运行 | 检查 Cargo feature gate |

**Spike 交付物：** 一个能在 Android 模拟器/真机上启动、打开一本 EPUB 书、翻页阅读的最小 APK。

## User Stories

1. As a mobile reader, I want to install DeepReader from an APK on my Android phone.
2. As a mobile reader, I want to log in with the same account as my desktop, so that all my books and progress are already there.
3. As a mobile reader, I want to read EPUB books with the same rendering quality as desktop.
4. As a mobile reader, I want to swipe left/right to turn pages.
5. As a mobile reader, I want to long-press to select text and highlight/annotate.
6. As a mobile reader, I want to access the AI chat assistant via a bottom drawer.
7. As a mobile reader, I want to navigate between sections using the bottom tab bar.
8. As a mobile reader, I want the virtual keyboard to not overlap the chat input.
9. As a mobile reader, I want to import EPUB files from my phone's file system.
10. As a mobile reader, I want my reading progress to sync automatically via M1 sync engine.
11. As a mobile reader, I want to use remote AI providers for both chat and embedding (no local inference).
12. As a mobile reader, I want to export notes to my Obsidian vault via a configured sync folder.
13. As a mobile reader, I want the app to handle screen rotation gracefully.
14. As a mobile reader, I want the app to support system back gesture.
15. As a mobile reader, I want reading stats to be tracked on mobile and synced.
16. As a mobile reader, I want the app to keep my reading session alive when I briefly switch apps.
17. As a mobile reader, I want full-screen settings with proper touch-sized controls.
18. As a mobile reader, I want dark mode to follow my Android system setting.
19. As a mobile reader, I want font size adjustment to account for different screen densities.

## Implementation Decisions

### Plugin Conditional Compilation

```rust
// lib.rs — 使用 Tauri 官方推荐的 cfg(desktop) 而非自定义 cfg
#[cfg(desktop)]
app_builder = app_builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());

#[cfg(not(target_os = "android"))]
app_builder = app_builder.plugin(tauri_plugin_llamacpp::init());
```

| Plugin | Android 状态 | 处理 |
|---|---|---|
| `tauri-plugin-llamacpp` | 排除 | `cfg(not(target_os = "android"))` |
| `tauri-plugin-global-shortcut` | 排除 | `cfg(desktop)` (Tauri 官方惯例) |
| `woff2_compress` | 排除 | 移动端不支持自定义字体上传 |
| `tauri-plugin-sql` | ✅ 可用 | — |
| `tauri-plugin-fs` | ⚠️ 受限 | Scoped Storage 限制，见下文 |
| `tauri-plugin-dialog` | ✅ 可用 | SAF 集成 |
| `tauri-plugin-epub` | ⚠️ 需验证 | Spike 项目 #2 |
| `tauri-plugin-http` | ✅ 可用 | — |

### Android 文件系统 (Scoped Storage) 适配

> [!WARNING]
> Android 10+ Scoped Storage 下，不能把 `/storage/emulated/0/OneDrive/...` 当普通路径稳定写入。Tauri `fs` 插件默认限制在应用私有目录内。

**EPUB 导入：**
- 使用 `tauri-plugin-dialog` 的 file picker（底层走 Android SAF Intent）
- 用户选中文件后，通过 SAF content URI 读取内容
- 复制到 App 私有内部存储 `/data/data/com.deepreader.app/files/books/`

**Obsidian 导出（修订方案）：**

| 步骤 | 实现 |
|---|---|
| 1. 首次配置 | 用户通过 SAF directory picker 选择目标文件夹（如 OneDrive 同步目录） |
| 2. 持久授权 | 调用 `takePersistableUriPermission()` 保存对该目录的写入权限 |
| 3. 后续导出 | 通过保存的 SAF URI 写入 Markdown 文件，无需再次授权 |
| 4. Fallback | 如果 SAF URI 失效或权限被撤销：写入 App 私有目录 → 触发 Android Share Intent 让用户选择保存位置 |

**`exportToObsidianTool` 适配：**
- 桌面端：保持现有的 `writeTextFile(vaultPath/filename.md)` 直写
- 移动端：检测平台 → 使用 SAF URI 写入 → 失败则 fallback 到 Share Intent
- 需要新增 Rust 层的 Android-specific 命令：`write_to_saf_uri(uri, content)`

### Touch Interaction

| 交互 | 桌面 | 移动端 |
|---|---|---|
| 翻页 | 点击左右区域 / 方向键 | 左右滑动手势 |
| 选中文本 | 点击拖拽 | 长按 + 拖拽 handle |
| 标注/高亮 | 选中后弹出浮动工具栏 | 选中后底部 Sheet |
| 目录 | 侧面板 | 滑入抽屉 |
| AI Chat | 右侧可调面板 | 底部抽屉（上滑） |
| 设置 | Modal Dialog | 全屏页面 |
| 书籍菜单 | 右键 | 长按 |

### Window Management Guards

桌面专有代码需要平台检查：
- `set_decorations(false)` — Windows only
- `windowEffects` (mica/acrylic/blur) — desktop only
- `trafficLightPosition` — macOS only
- `titleBarStyle: "Overlay"` / `hiddenTitle` — desktop only

### CI/CD

- GitHub Actions 新增 Android build target
- 签名：release keystore 存 GitHub Secrets
- 产物：APK (universal) 作为 Release artifact
- 不上 Play Store（直接 APK 分发）

### 移动端 TS 层 Feature Flag

```typescript
import { type } from '@tauri-apps/plugin-os';

const platform = await type();
const isMobile = platform === 'android' || platform === 'ios';

// Feature gates
const FEATURES = {
  localLlm: !isMobile,        // llamacpp 仅桌面
  customFontUpload: !isMobile, // woff2 仅桌面
  keyboardShortcuts: !isMobile,
  fileDragDrop: !isMobile,     // 移动端用 file picker
  safExport: isMobile,         // SAF 导出仅移动
};
```

## Testing Decisions

### 关键验证项：

1. **EPUB 渲染**（手动，真机）：
   - CJK 字体渲染
   - 图片显示
   - 分页/滚动模式
   - CFI 定位准确性

2. **同步集成**（手动）：
   - 登录 → 书籍出现
   - 移动端读完几页 → 桌面进度更新
   - 移动端新建笔记 → 桌面可见

3. **文件系统**（手动，Android 特有）：
   - SAF picker 导入 EPUB
   - SAF URI 导出 Markdown 到外部目录
   - 持久授权跨 app 重启有效
   - Fallback Share Intent 可用

4. **设备兼容**：
   - 最低：1 台中端机 (Android 12+)
   - 推荐：也测 Android 8 (API 26) 兼容

### 不测试：
- 性能基准（M3 阶段过早）
- 自动化 UI 测试（单人项目 ROI 低）

## Out of Scope

- iOS 支持
- 本地 LLM 推理
- 自定义字体上传
- Play Store 上架
- 平板专用布局
- 后台同步服务
- Android Widget / Wear OS

## Further Notes

- `constants.ts` 已有 `ANDROID_FONTS`, `DEFAULT_MOBILE_READSETTINGS`, `DEFAULT_MOBILE_VIEW_SETTINGS` 可直接复用
- `DISABLE_DOUBLE_CLICK_ON_MOBILE`, `LONG_HOLD_THRESHOLD` 已有移动端交互常量
- `react-responsive` 已有
- **Budget 风险：** M3 不确定性最高。Spike 通过后再确认正式工时。Spike 失败的最大概率点是 `tauri-plugin-epub` 的 C 依赖交叉编译。
