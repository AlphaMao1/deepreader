/**
 * digest-service.ts
 *
 * DIG-02/DIG-03: Digest 工作流的 AI 服务层
 * - highlightCuration: 从全部划线中 AI 精选高价值条目（返回 ID 列表）
 * - generateBookDigest: 将选中划线整理为 Obsidian Markdown 笔记
 */

import { createProviderInstance } from "@/ai/providers/factory";
import { useProviderStore } from "@/store/provider-store";
import { generateText } from "ai";

export interface HighlightItem {
  id: string;
  text: string;
  chapterInfo?: string;
}

export interface DigestOptions {
  bookTitle: string;
  bookAuthor?: string;
}

/** 获取当前激活的第一个 provider + model */
function getActiveModel() {
  const { modelProviders } = useProviderStore.getState();

  for (const provider of modelProviders) {
    if (!provider.active) continue;
    const model = provider.models.find((m) => m.active);
    if (!model) continue;

    const instance = createProviderInstance({
      providerId: provider.provider,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
    });

    return instance(model.id);
  }

  throw new Error("未找到可用的 AI 模型，请先在设置中配置并激活一个 Provider。");
}

// ── AI 精选：从全部划线中找出高价值的 20-30 条 ───────────────────────────

const CURATION_SYSTEM = `你是读书笔记整理专家。从用户提供的全部高亮划线中，筛选出最有价值的条目。

筛选标准（按优先级）：
1. 核心论点或关键结论
2. 反常识的洞察或独特视角
3. 重要数据、案例、例证
4. 作者的核心框架/方法论
5. 值得反复品味的金句

排除标准：
- 脱离上下文无法理解的片段（< 10 字的碎片）
- 近似重复的内容（只保留最完整的一条）
- 过渡性文字、章节开头的引言

选择数量：保留约 30-50% 的条目（≤10 条全选，10-50 条选 30-50%，>50 条选 20-30 条上限）。

返回格式：纯 JSON 数组，只含选中条目的 ID。
["id1", "id2", "id3"]

除 JSON 数组外不输出任何文字。`;

export async function highlightCuration(
  highlights: HighlightItem[],
  options: DigestOptions,
): Promise<string[]> {
  if (highlights.length === 0) return [];

  const model = getActiveModel();

  const highlightsJson = JSON.stringify(
    highlights.map((h) => ({
      id: h.id,
      text: h.text,
      chapter: h.chapterInfo ?? "",
    })),
    null,
    2,
  );

  const userPrompt = `书名：《${options.bookTitle}》${options.bookAuthor ? `\n作者：${options.bookAuthor}` : ""}

共 ${highlights.length} 条高亮划线：

${highlightsJson}`;

  const { text } = await generateText({
    model,
    system: CURATION_SYSTEM,
    prompt: userPrompt,
    maxTokens: 1000,
  });

  // 解析 JSON 数组
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI 返回格式错误，请重试");
  }

  const ids: unknown = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(ids)) {
    throw new Error("AI 返回格式错误，请重试");
  }

  return ids.filter((id): id is string => typeof id === "string");
}

// ── Digest 生成：将选中划线整理为 Obsidian Markdown ──────────────────────

const DIGEST_SYSTEM = `你是阅读笔记整理专家。任务：将精选的书中划线整理成一篇可持久化的 Obsidian 笔记。

读者是未来的我（可能完全忘记上下文）和 AI 代理（需低成本检索）。因此笔记必须自解释。

## 输出格式

### YAML Frontmatter（必须）
\`\`\`yaml
---
title: 结论式短句（好：「系统思考比线性因果更接近真实世界」；差：「系统思考笔记」）
author: 作者名
date: YYYY-MM-DD
tags: [阅读笔记, 主题关键词]
description: 一句话概括这本书对读者的核心价值
source: 《书名》
---
\`\`\`

### 正文

按章节或主题分组（### 标题），每组：
- 划线原文用 > 引用块，保持原文语气，不改写
- 需要解释时在引用后加短评（*──: 解释内容*），不是每条都要评

### 尾段

「核心洞察」：2-3 句话提炼全书最大启发。

## 格式约束

- 标题层级只用 ###
- [[双链]] 仅用于概念/理论/人名/书名等名词实体
- 整体短评控制在 1500 字以内（引用原文不计入）

## 反面示例

以下是低质量笔记的典型问题：
- 只列出原文不加任何结构 → 缺少可检索的标题层级
- 每条都机械点评「这很重要」→ 评论无信息增量
- description 写成「关于 XX 的笔记」→ 不是结论式描述`;

export async function generateBookDigest(
  selectedHighlights: HighlightItem[],
  options: DigestOptions,
): Promise<string> {
  if (selectedHighlights.length === 0) {
    throw new Error("请至少选择一条划线");
  }

  const model = getActiveModel();

  const today = new Date().toISOString().slice(0, 10);

  // 按章节分组
  const grouped = new Map<string, HighlightItem[]>();
  for (const h of selectedHighlights) {
    const chapter = h.chapterInfo ?? "未分类";
    const existing = grouped.get(chapter) ?? [];
    existing.push(h);
    grouped.set(chapter, existing);
  }

  const highlightsText = [...grouped.entries()]
    .map(([chapter, items]) => {
      const quotes = items.map((h) => `• ${h.text}`).join("\n");
      return `【${chapter}】\n${quotes}`;
    })
    .join("\n\n");

  const userPrompt = `书名：《${options.bookTitle}》
作者：${options.bookAuthor ?? "未知"}
整理日期：${today}

以下是从这本书中精选的 ${selectedHighlights.length} 条划线，请整理成 Obsidian 笔记：

${highlightsText}`;

  const { text } = await generateText({
    model,
    system: DIGEST_SYSTEM,
    prompt: userPrompt,
    maxTokens: 3000,
  });

  return text;
}
