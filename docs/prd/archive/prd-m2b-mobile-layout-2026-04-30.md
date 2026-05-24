# PRD M2b: 移动端独立布局

**Milestone**: M2b
**Priority**: P1
**Label**: `needs-triage`
**Estimated Effort**: 5-7 人天
**Dependency**: M2a（视觉 Token 已就位）

---

## Problem Statement

桌面端的 192px 侧边栏、可调整大小的面板、对话框式设置等交互模式不适用于手机屏幕（360-414px 宽）。需要为移动端创建独立的布局外壳，复用现有业务组件但在不同容器中呈现。

## Solution

创建一组移动端专用布局组件，通过平台/视口检测自动切换桌面/移动端布局。业务组件本身不变，只改外层容器和导航方式。

## User Stories

1. As a mobile reader, I want a bottom tab bar instead of a left sidebar, so that navigation is thumb-friendly.
2. As a mobile reader, I want the AI chat and notebook panels as swipe-up drawers, so that they don't permanently consume screen space.
3. As a mobile reader, I want settings as a full-screen page, so that it's usable on small screens.
4. As a mobile reader, I want the reader to be full-screen with tap-to-toggle chrome, so that reading real estate is maximized.
5. As a mobile reader, I want the app to automatically detect my device and show the appropriate layout.

## Implementation Decisions

### 新建组件

| 组件 | 职责 | 触发条件 |
|---|---|---|
| `PlatformLayoutSwitch` | 根据 OS 类型 + 视口宽度路由到桌面/移动端布局 | App 根组件 |
| `MobileTabBar` | 底部 5 tab 导航（图书馆/聊天/记忆/技能库/统计）+ 设置入口 | `isMobile = true` |
| `MobileDrawer` | 底部抽屉（Vaul 或 framer-motion 实现），用于 AI Chat 和 Notebook | Reader 页 |
| `MobileSettingsPage` | 全屏设置页替代 Dialog，用 React Router 导航 | 设置入口 |
| `MobileReaderChrome` | 极简顶栏 + 底栏，点击/tap 切换显隐 | Reader 页 |

### 检测逻辑

```typescript
// 使用 @tauri-apps/plugin-os + react-responsive
const osType = await type(); // 'android' | 'windows' | 'macos' | ...
const isNarrow = useMediaQuery({ maxWidth: 768 });
const isMobile = osType === 'android' || osType === 'ios' || isNarrow;
```

### 不改的部分

- 所有业务组件（BookCard, ChatMessage, NoteItem 等）不变
- 路由定义不变（只在布局容器层切换）
- 数据 store 不变
- 服务层不变

### Stitch 设计需求

仅 3 个移动端新页面需要设计稿：
1. Mobile Home + Bottom Tab Bar
2. Mobile Reader（全屏 + 手势 + 抽屉）
3. Mobile Settings（全屏页面式）

## Testing Decisions

- 手动验证：Chrome DevTools 模拟 360/390/414px 视口
- `PlatformLayoutSwitch` 路由逻辑可程序化测试
- 真机验证延迟到 M3

## Out of Scope

- 触摸手势实现（翻页、长按选词——属于 M3）
- Android 特定适配（文件系统、键盘避让——属于 M3）
- 平板布局优化

## Further Notes

- `react-responsive` 已是现有依赖
- 现有 `DISABLE_DOUBLE_CLICK_ON_MOBILE` 和 `LONG_HOLD_THRESHOLD` 常量可复用
- 考虑使用 `vaul`（Drawer 库）替代自建抽屉——需确认依赖大小
