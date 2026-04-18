<div align="center">

# DeepReader

**一款面向深度阅读的 AI 电子书阅读器**

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)](https://github.com/AlphaMao1/deepreader)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AlphaMao1/deepreader/pulls)

</div>

DeepReader 是一个围绕“读进去、记下来、继续追问”设计的本地优先阅读工具。它把 EPUB 阅读、AI 对话、阅读记忆、笔记标注和统计分析整合到同一个桌面应用里，帮助你在阅读过程中持续理解、整理和沉淀内容，而不是只停留在临时提问。

项目基于 [SageRead](https://github.com/xincmm/sageread) 继续演进，在其基础上补充了 AI 记忆系统、意图诊断、技能扩展、Obsidian 导出等能力。

## 核心能力

- **EPUB 深度阅读**：支持流式阅读、分页阅读、目录导航、全文搜索与阅读进度保存。
- **AI 对话助手**：可以围绕当前书籍内容持续追问，而不是孤立地做单轮问答。
- **阅读记忆系统**：沉淀你的阅读偏好、概念定义与书内认知，支持跨会话延续。
- **笔记与标注**：高亮、摘录、想法记录、书签管理，适合做长期阅读卡片。
- **阅读统计**：统计阅读时长、活跃日期与阅读热力，让习惯可视化。
- **技能系统**：支持通过 slash 命令扩展 AI 工作流。
- **Obsidian 集成**：可将对话或笔记整理后导出到 Obsidian 知识库。
- **本地优先**：数据默认保存在本地，可自定义模型服务与推理路径。

## 界面预览

当前 README 已替换为现版本界面截图，后续会继续补充更多功能场景图。

![DeepReader Library](./assets/readme-library.png)

## 使用流程

### 1. 配置对话模型

打开应用中的“设置”，配置你要使用的模型服务：

- API Key
- Base URL
- 模型名称

兼容 OpenAI、Anthropic、DeepSeek、OpenRouter 以及其他兼容 OpenAI 接口的服务。

### 2. 配置向量模型（可选）

如果你希望 AI 能检索整本书的内容，而不是只回答当前页面附近的信息，可以额外配置 embedding 模型。

### 3. 导入 EPUB

进入图书馆页面后，拖拽或选择 `.epub` 文件即可导入。

### 4. 开始阅读与提问

你可以一边阅读，一边对当前内容发起追问、做标注、记想法、整理重点。

### 5. 导出到 Obsidian（可选）

如果你已经在使用 Obsidian，可以在设置中配置知识库路径，并通过技能或导出能力将结果沉淀到自己的知识库里。

## 常用技能

以下是几个典型的 slash 命令示例：

- `/解释概念`：解释某个概念，并给出上下文理解。
- `/生成知识图谱`：把当前讨论整理成 Mermaid 图或结构化脉络。
- `/预读导航`：帮助快速判断一本书值不值得读、应该怎么读。
- `/笔记格式化`：把当前对话整理成适合归档的笔记。
- `/记住`：手动触发长期记忆提取。

## 开发

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm dev
```

### 构建桌面应用

```bash
pnpm build
```

## 相关文档

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/release-workflow.md](docs/release-workflow.md)

## License

[AGPL-3.0](LICENSE)
