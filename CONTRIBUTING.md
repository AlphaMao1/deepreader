# Contributing to DeepReader

感谢你对 DeepReader 的兴趣！这份文档帮你快速搭建本地开发环境并了解贡献流程。

> **致谢**：DeepReader 基于 [SageRead](https://github.com/xincmm/sageread) 二次开发，在其基础上增加了 AI 记忆系统、意图诊断提示词、Header 章节导航等功能。原作者的贡献是本项目的基石。

---

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 20 | 推荐用 nvm 管理 |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Rust | stable | `rustup install stable` |
| Tauri CLI | v2 | 随 Cargo 依赖自动安装 |

Windows 额外依赖：
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（Rust 编译需要）
- WebView2（Windows 11 已内置，Windows 10 需手动安装）

---

## 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/AlphaMao1/deepreader.git
cd deepreader

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器（热重载）
pnpm dev
```

`pnpm dev` 同时启动 Vite 前端（localhost:1420）和 Tauri 原生窗口。

---

## 项目结构

```
packages/
  app/
    src/              # React 前端
      ai/             # AI 接入层（tools、transport、hooks）
      components/     # 通用组件
      constants/      # 系统提示词 (prompt.ts)
      pages/reader/   # 阅读器页面
      services/       # 业务服务（记忆、技能、线程）
      store/          # Zustand 状态
    src-tauri/
      src/core/       # Rust 后端（DB、命令、技能等）
      tauri.conf.json # 应用配置
```

---

## 代码规范

项目使用 [Biome](https://biomejs.dev/) 做 lint + format（配置在 `biome.json`）：

```bash
# 检查
pnpm biome check .

# 自动修复
pnpm biome check --write .
```

提交前请确保 lint 通过。

---

## Pull Request 规范

1. 从 `main` 创建分支，命名格式：`feat/xxx`、`fix/xxx`、`docs/xxx`
2. 每个 PR 专注单一问题
3. 提交信息使用中文或英文均可，说明做了什么/为什么
4. 涉及 AI 提示词改动（`default-skills.json` / `prompt.ts`）请在 PR 描述中附上测试对话截图

---

## 提一个好的 Issue

- **Bug**：操作步骤 + 期望行为 + 实际行为 + 系统信息（OS / 模型提供商）
- **功能建议**：说明使用场景，为什么现有方案不够
- AI 行为问题（回答质量、工具调用错误等）属于提示词问题，欢迎直接提 PR 改 `default-skills.json`

---

## 打包发布

见下方 [打包说明](#packaging)，或直接运行：

```bash
pnpm build
```

> ⚠️ macOS 签名需要在 GitHub Actions 的 Secrets 中配置 `APPLE_CERTIFICATE`、`APPLE_ID` 等，本地构建无需签名即可测试。
