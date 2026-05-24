# PRD M2a: 视觉 Token Reskin（桌面端）

**Milestone**: M2a
**Priority**: P1
**Label**: `needs-triage`
**Estimated Effort**: 5-8 人天
**Dependency**: 无（可与 M1 并行）

---

## Problem Statement

DeepReader 的 UI 使用继承自 SageRead/Readest 的 neutral 灰色 shadcn/ui 默认主题，缺乏品牌识别度。需要在不改变组件结构和交互逻辑的前提下，通过 CSS 变量层刷新视觉语言。

## Solution

纯 Design Token 级别的替换：改 CSS 变量值（色板、字体栈、圆角、阴影），不改组件结构、不新增组件、不改布局。

## User Stories

1. As a reader, I want the app to have a distinctive visual identity matching the DeepReader brand (navy blue primary, sky blue accents).
2. As a reader, I want a cohesive color scheme across all pages that feels unified.
3. As a reader, I want the dark mode to use deep navy tones rather than generic gray.
4. As a reader, I want the light mode to use warm ivory tones for comfortable extended reading.
5. As a reader, I want all existing navigation and features to remain exactly where they are.
6. As a reader, I want consistent CJK-optimized typography throughout the app chrome.

## Implementation Decisions

### CSS 层级关系（审查反馈修正）

> [!IMPORTANT]
> `themes/default.css` 和 `index.css` 存在双层覆盖关系——`index.css` 在导入主题后又覆盖了 `--font-sans/serif/mono`、`--radius`、`--shadow-*`。单改 theme 文件不够。

**改动范围：**

| 文件 | 改什么 | 为什么两层都要改 |
|---|---|---|
| `themes/default.css` | 所有颜色变量（`:root` 和 `.dark`） | 主色板来源 |
| `index.css` `:root` 块 | `--font-sans/serif/mono`, `--radius`, `--shadow-*` | 这里覆盖了 theme 的同名变量 |
| `index.css` `@theme inline` | 不改 | 只是映射变量名到 Tailwind，跟随上游自动生效 |

### Design Token（基于 Logo 提取）

**颜色（oklch 格式，与现有 default.css 保持一致的色彩空间）：**

| Token | Light Mode | Dark Mode |
|---|---|---|
| `--background` | `oklch(0.98 0.005 80)` (warm white) | `oklch(0.15 0.03 250)` (deep navy) |
| `--foreground` | `oklch(0.15 0.02 250)` | `oklch(0.93 0.01 250)` |
| `--card` | `oklch(1.00 0 0)` | `oklch(0.18 0.03 250)` |
| `--primary` | `oklch(0.30 0.12 260)` (deep navy #0F346A) | `oklch(0.65 0.12 250)` (bright navy) |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.99 0 0)` |
| `--secondary` | `oklch(0.52 0.15 260)` (medium blue #2B6CCB) | `oklch(0.60 0.13 255)` |
| `--muted` | `oklch(0.96 0.005 80)` (warm gray) | `oklch(0.22 0.025 250)` |
| `--accent` | `oklch(0.97 0.005 250)` | `oklch(0.30 0.03 250)` |
| `--border` | `oklch(0.93 0.005 80)` (warm border) | `oklch(0.25 0.02 250)` |
| `--destructive` | `oklch(0.58 0.24 28)` (unchanged) | `oklch(0.70 0.19 22)` |

**关于 `#86CEFC` (Sky Blue) 的对比度问题：**

> [!WARNING]
> `#86CEFC` 在白底上对比度约 1.6:1，不满足 WCAG AA (4.5:1)。不能用于文本或关键图标色。

使用规则：
- ✅ 装饰性用途：进度条填充、选中状态背景、badge 背景、图表色
- ✅ 与深色前景文本组合：`#86CEFC` 做背景 + 深色文本
- ❌ 不用于：正文文本、icon-only 按钮、链接文本
- 需要蓝色文本时使用 `--secondary`（对比度 > 4.5:1）

**字体栈：**

```css
--font-sans: 'Inter', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
--font-serif: 'Noto Serif SC', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**圆角和阴影：**

```css
--radius: 0.625rem; /* 10px, 保持现有值，与 logo 圆润感一致 */

/* Light mode: 暖色调柔和阴影 */
--shadow-sm: 0 1px 2px oklch(0.30 0.02 250 / 0.06);
--shadow-md: 0 2px 6px oklch(0.30 0.02 250 / 0.08);

/* Dark mode: 蓝调辉光 */
--shadow-sm: 0 1px 3px oklch(0.20 0.05 250 / 0.15);
--shadow-md: 0 2px 8px oklch(0.20 0.05 250 / 0.20);
```

### Stitch 提示词模板

共享上下文前缀（所有页面通用）：

```
Design a desktop application page for DeepReader — an AI-powered deep reading app.

Brand Design Language:
- Primary: Deep navy blue (#0F346A)
- Secondary: Medium blue (#2B6CCB) — for buttons, links, active states
- Accent: Sky blue (#86CEFC) — DECORATIVE ONLY (progress bars, badges, chart fills). Never for text.
- Light surface: Warm ivory (#FAFAF8) with pure white cards
- Dark surface: Deep navy (#0A1628) with blue-tinted gray cards
- Rounded corners (10px radius), matching the logo's soft book shape
- Soft layered shadows with slight blue tint, no hard borders
- Typography: Inter + Noto Sans SC, comfortable CJK reading scale
- Generous whitespace — a reading app should breathe
- Personality: "有温度的工具感" — warm, professional, not sterile

CRITICAL: This is a VISUAL RESKIN only. Do not change the layout structure or interaction patterns described below.
```

逐页面追加具体布局约束（选 3 个示例）：

**Library Grid View:**
```
[共享前缀]

Page: Library — Grid View
Layout constraints (DO NOT ALTER):
- Left sidebar: 192px, contains 图书馆/聊天/记忆/技能库/阅读统计 nav links + 设置 button
- Main area: Book cards in responsive grid, 4-5 per row at 1440px
- Top area: Search bar + view toggle (grid/list) + sort dropdown
- Book card: Cover image + title + author + reading progress indicator
- Drag-and-drop overlay zone for EPUB import
```

**Reader View:**
```
[共享前缀]

Page: Reader View
Layout constraints (DO NOT ALTER):
- Center: EPUB content rendering area (foliate-js, 不可重设计内部)
- Right panel: AI chat sidebar, resizable via drag handle
- Optional right panel: Notebook/annotation panel
- Top: Minimal chrome with book title
- Bottom: Reading progress bar with percentage
- Text selection triggers a floating annotation toolbar
```

**Settings Dialog:**
```
[共享前缀]

Page: Settings Dialog
Layout constraints (DO NOT ALTER):
- Modal dialog overlay, ~600px wide
- Left tab bar: 常规/模型提供商/向量模型/本地模型/快捷键/语音/字体管理
- Right content area scrollable
- 常规 tab sections: 关于/外观/数据文件夹/Obsidian知识库/联网搜索/记忆提取/隐私
- Each section is a rounded card with title + content
```

### 工作流

1. 用户按页面投 Stitch 出设计稿
2. 开发者从设计稿提取视觉模式（色值/间距/阴影/hover 效果）
3. **映射到 CSS 变量和 Tailwind class**，不复制 Stitch 生成的代码
4. 对照功能入口保护清单逐项验证

### 功能入口保护清单

（与原 M2 相同，此处不重复完整列表——参见 M2 原文的 Functional Entry Points Protection Checklist）

**核心原则：** 所有导航项、按钮、输入框、下拉菜单、对话框的**存在性和位置**不变。只变颜色、字体、边框、阴影、hover 效果。

## Testing Decisions

- 纯手动验证：截图对比 + 功能入口清单逐项检查
- 颜色对比度工具验证（WebAIM Contrast Checker）
- Dark mode 完整性检查（无遗漏的未主题化元素）
- 构建成功（无 CSS 语法错误）

## Out of Scope

- 新增组件
- 改变布局结构
- 移动端布局（拆到 M2b）
- 动画和微交互（可选附加，不作为验收标准）
- i18n / 本地化
- 自定义图标集

## Further Notes

- `default.css` 用 oklch 色彩空间，新 token 也应保持 oklch 以确保一致的色彩感知
- 现有 `framer-motion` 依赖可用于添加入场动画，但属于锦上添花不影响验收
- `windowEffects` (mica/acrylic) 在 `tauri.conf.json` 中——深海蓝配色与这些毛玻璃效果契合度好
