import {
  createMemory,
  searchMemories,
  updateMemory,
  evictExcessMemories,
  type CreateMemoryData,
} from "@/services/memory-service";
import { tool } from "ai";
import { z } from "zod";

/**
 * LLM 可直接调用的记忆保存工具。
 * 当 AI 发现用户表达了持续性偏好、对概念有了新理解、
 * 或需要记录本书核心论点时，主动调用此工具。
 */
export const saveMemoryTool = tool({
  description: `保存一条长期记忆，使你在未来的对话中记住这位读者。

适用场景：
- 用户表达了持续性偏好（如"我更喜欢用类比解释"、"不要用太专业的术语"）→ category=user_profile
- 你总结了本书的核心论点或关键章节要点 → category=book_gist
- 对话中反复出现的重要概念，你给出了清晰定义 → category=concept

⚠️ 使用纪律：
- 不要每条消息都保存，只在发现有长期价值的信息时才调用
- book_gist 必须与当前书籍关联
- 检查是否已有类似记忆，避免重复（先想想 key 是否已存在）`,

  inputSchema: z.object({
    reasoning: z
      .string()
      .min(1)
      .describe("为什么要保存这条记忆，简述其长期价值"),
    category: z
      .enum(["user_profile", "book_gist", "concept"])
      .describe(
        "记忆类别：user_profile=用户偏好/风格, book_gist=书籍核心知识, concept=重要概念"
      ),
    key: z
      .string()
      .min(1)
      .describe(
        "记忆标识键，简洁唯一，如 explanation_style, GEB-core-thesis, emergence"
      ),
    value: z
      .string()
      .min(1)
      .describe("记忆内容，自然语言描述，1-3 句话"),
    bookId: z
      .string()
      .optional()
      .describe("关联的书籍 ID（book_gist 必填，concept 可选）"),
  }),

  execute: async ({
    reasoning,
    category,
    key,
    value,
    bookId,
  }: {
    reasoning: string;
    category: "user_profile" | "book_gist" | "concept";
    key: string;
    value: string;
    bookId?: string;
  }) => {
    try {
      // 查重：检查是否已有相同 key 的记忆
      const existing = await searchMemories(key, category, 5);
      const exactMatch = existing.find(
        (m) => m.key.toLowerCase() === key.toLowerCase()
      );

      if (exactMatch) {
        // 更新已有记忆
        const updated = await updateMemory({
          id: exactMatch.id,
          value,
          bookId: bookId ?? undefined,
        });
        return {
          action: "updated",
          memory: {
            id: updated.id,
            category: updated.category,
            key: updated.key,
            value: updated.value,
          },
          meta: { reasoning },
        };
      }

      // 创建新记忆
      const data: CreateMemoryData = {
        category,
        key,
        value,
        sourceType: "conversation",
        bookId,
      };

      const memory = await createMemory(data);

      // 异步淘汰检查
      evictExcessMemories().catch((e) =>
        console.warn("记忆淘汰检查失败:", e)
      );

      return {
        action: "created",
        memory: {
          id: memory.id,
          category: memory.category,
          key: memory.key,
          value: memory.value,
        },
        meta: { reasoning },
      };
    } catch (error) {
      throw new Error(
        `保存记忆失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  },
});

/**
 * 批量记忆提取函数（非 LLM tool，由前端定时调用）。
 * 从最近几轮对话中提取有价值的持久化信息。
 *
 * 返回用于发送给小模型的提取 prompt。
 */
export function buildMemoryExtractionPrompt(
  recentMessages: Array<{ role: string; content: string }>,
  currentBookTitle?: string
): string {
  const conversationText = recentMessages
    .map((m) => `${m.role === "user" ? "读者" : "AI"}: ${m.content}`)
    .join("\n");

  return `从以下阅读对话中提取值得长期记住的信息。

对话内容：
${conversationText}

${currentBookTitle ? `当前阅读书籍：《${currentBookTitle}》` : ""}

请提取以下三类信息（仅提取有长期价值的，无则留空数组）：

1. user_profile: 读者的阅读偏好、理解风格、兴趣领域、沟通偏好
2. book_gist: 对当前书籍的核心理解、关键论点、章节要点
3. concept: 反复出现的重要概念及其简明定义

严格按此 JSON 格式输出：
[
  {"category": "user_profile", "key": "标识键", "value": "1-2句描述"},
  {"category": "book_gist", "key": "标识键", "value": "1-2句描述"},
  {"category": "concept", "key": "概念名", "value": "简明定义"}
]

如果没有值得记住的新信息，返回空数组 []。`;
}

/**
 * 解析小模型的记忆提取结果并批量保存。
 */
export async function saveExtractedMemories(
  extractedJson: string,
  bookId?: string,
  threadId?: string
): Promise<number> {
  let memories: Array<{
    category: string;
    key: string;
    value: string;
  }>;

  try {
    // 尝试从可能的 markdown code block 中提取 JSON
    const jsonMatch = extractedJson.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return 0;
    memories = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn("记忆提取结果解析失败:", extractedJson);
    return 0;
  }

  if (!Array.isArray(memories) || memories.length === 0) return 0;

  let savedCount = 0;

  for (const mem of memories) {
    if (!mem.category || !mem.key || !mem.value) continue;

    const validCategories = ["user_profile", "book_gist", "concept"];
    if (!validCategories.includes(mem.category)) continue;

    try {
      // 查重
      const existing = await searchMemories(mem.key, mem.category, 3);
      const exactMatch = existing.find(
        (m) => m.key.toLowerCase() === mem.key.toLowerCase()
      );

      if (exactMatch) {
        // 值有变化才更新
        if (exactMatch.value !== mem.value) {
          await updateMemory({
            id: exactMatch.id,
            value: mem.value,
          });
          savedCount++;
        }
      } else {
        await createMemory({
          category: mem.category as "user_profile" | "book_gist" | "concept",
          key: mem.key,
          value: mem.value,
          sourceType: "auto_extract",
          sourceId: threadId,
          bookId:
            mem.category === "user_profile" ? undefined : bookId,
        });
        savedCount++;
      }
    } catch (e) {
      console.warn(`保存记忆 [${mem.key}] 失败:`, e);
    }
  }

  // 淘汰检查
  if (savedCount > 0) {
    evictExcessMemories().catch(() => {});
  }

  return savedCount;
}
