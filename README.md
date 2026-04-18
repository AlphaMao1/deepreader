<div align="center">

# DeepReader

**一款面向深度阅读的 AI 电子书阅读器**

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)](https://github.com/AlphaMao1/deepreader)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AlphaMao1/deepreader/pulls)

</div>

DeepReader 是一款围绕“读进去、记下来、继续追问”设计的本地优先阅读工具。它把 EPUB 阅读、AI 对话、阅读记忆、笔记标注和统计分析整合到同一个桌面应用里，帮助你在阅读过程中持续理解、整理和沉淀内容，而不是只停留在临时提问。

项目基于 [SageRead](https://github.com/xincmm/sageread) 继续演进，在其基础上补充了 AI 记忆系统、技能扩展、Obsidian 导出等能力。

## 当前界面

当前 README 已替换为现版本界面截图，不再使用旧版素材。

![DeepReader Library](./assets/readme-library.png)

## 核心能力

- **EPUB 深度阅读**：支持目录导航、全文搜索、阅读进度保存和书内定位。
- **AI 对话助手**：可以围绕当前书籍内容持续追问，而不是孤立地做单轮问答。
- **阅读记忆系统**：帮助沉淀你的阅读偏好、概念定义和长期上下文。
- **笔记与标注**：支持高亮、摘录、标签和结构化记录。
- **阅读统计**：查看阅读时长、活跃日期和阶段性积累。
- **Obsidian 集成**：可将整理后的内容导出到自己的知识库。
- **本地优先**：数据默认保存在本地，可自行配置模型服务。

## 给普通用户的安装说明

### 1. 下载安装包

请前往 GitHub Releases 页面，下载适合你系统的安装包：

- Windows：优先下载 `.exe`，也可以使用 `.msi`
- macOS：下载对应架构的安装包

Release 页面：

`https://github.com/AlphaMao1/deepreader/releases`

### 2. 安装后能不能直接用

可以直接安装并启动，不需要你自己再安装 `Node`、`pnpm`、`Rust` 这些开发依赖。

但要分清两类能力：

- **可以直接用的**：导入 EPUB、阅读、查看目录、做基础本地管理
- **首次配置后才能用的**：AI 对话、AI 阅读理解、记忆提取、联网搜索、部分导出与增强能力

### 3. Windows 用户的额外说明

DeepReader 基于 Tauri 构建。在部分 Windows 环境下，如果系统缺少 `Microsoft Edge WebView2 Runtime`，应用可能无法正常启动。

大多数新系统已经自带。如果你安装后打不开，再优先检查这一项。

## 首次使用怎么配置

### 必配：对话模型

如果你想使用 AI 对话能力，需要先在应用里的“设置”中配置模型服务。通常至少需要填写：

- `API Key`
- `Base URL`
- 模型名称

当前兼容 OpenAI、Anthropic、DeepSeek、OpenRouter，以及其他兼容 OpenAI 接口的服务。

### 可选：向量模型

如果你希望 AI 能检索整本书的内容，而不是只回答当前页面附近的信息，可以额外配置 embedding 模型。

不配置也可以阅读，也可以做基础 AI 对话，只是整本书检索能力会受影响。

### 可选：Obsidian

如果你已经在使用 Obsidian，可以在设置中配置知识库路径，把整理后的内容导出到自己的知识库里。

### 可选：联网搜索和语音

以下能力不是必需项，只有需要时再配：

- Tavily API Key：用于联网搜索
- DashScope API Key：用于语音相关能力

## 3 分钟上手

1. 安装并打开 DeepReader
2. 进入“设置”，先配置一个可用的 AI 模型
3. 回到图书馆页面，导入 `.epub`
4. 开始阅读，并围绕当前内容提问、标注、记笔记
5. 如果需要整本书检索，再补充向量模型配置

## 常见问题

### 下载后打不开怎么办

优先检查这几项：

- 系统是否拦截了应用启动
- Windows 是否缺少 `WebView2 Runtime`
- 是否下载了和自己系统匹配的安装包

### 为什么安装后 AI 不能直接回答

因为 DeepReader 不是内置公用大模型服务的产品。AI 功能需要你自己配置模型服务和 `API Key`。

### 不配置模型能不能用

可以。你仍然可以把它当作本地 EPUB 阅读器使用。

但和 AI 相关的功能不会生效。

### DeepReader 现在支持自动更新吗

**当前版本不提供应用内自动更新。**

如果后续发布新版本，请直接到 GitHub Releases 页面下载安装包升级。

## 常用 Slash 命令

- `/解释概念`：解释某个概念，并结合上下文理解
- `/生成知识图谱`：把当前讨论整理成结构化图谱
- `/预读导航`：帮助快速判断一本书是否值得读、应该怎么读
- `/笔记格式化`：把当前对话整理成适合归档的笔记
- `/记住`：手动触发长期记忆提取

## 从源码运行

如果你是开发者，或者你明确希望自行编译桌面应用，再使用下面的方式：

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
