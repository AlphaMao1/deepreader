/**
 * 记忆自动提取管线。
 * 每 N 轮用户消息，用配置的小模型(memoryExtractionModel)从近期对话中提取持久化记忆。
 *
 * 设计原则：
 * - 完全后台异步，不阻塞对话主流程
 * - 仅在配置了 memoryExtractionModel 时启用
 * - 失败静默，不影响用户体验
 */

import { createModelInstance } from "@/ai/providers/factory";
import {
  buildMemoryExtractionPrompt,
  saveExtractedMemories,
} from "@/ai/tools/memory-extract";
import { useProviderStore } from "@/store/provider-store";
import { generateText } from "ai";
import type { UIMessage } from "ai";

const EXTRACTION_INTERVAL = 5; // 每 5 条用户消息触发一次

// 全局消息计数器（按 thread 隔离）
const messageCounters = new Map<string, number>();

/**
 * 在对话成功完成后调用此函数。
 * 内部判断是否满足触发条件（每 N 轮 + 有配置小模型）。
 */
export async function maybeExtractMemories(
  threadId: string,
  messages: UIMessage[],
  bookId?: string,
  bookTitle?: string
): Promise<void> {
  // 1. 检查是否配置了提取模型
  const { memoryExtractionModel } = useProviderStore.getState();
  if (!memoryExtractionModel) return;

  // 2. 计数器逻辑
  const currentCount = (messageCounters.get(threadId) ?? 0) + 1;
  messageCounters.set(threadId, currentCount);

  if (currentCount % EXTRACTION_INTERVAL !== 0) return;

  // 3. 准备近期消息（取最近 EXTRACTION_INTERVAL * 2 条）
  const recentMessages = messages
    .slice(-(EXTRACTION_INTERVAL * 2))
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content:
        m.parts
          ?.filter((p: any) => p.type === "text")
          ?.map((p: any) => p.text)
          ?.join("") || "",
    }))
    .filter((m) => m.content.length > 0);

  if (recentMessages.length < 2) return;

  // 4. 构建提取 prompt
  const extractionPrompt = buildMemoryExtractionPrompt(
    recentMessages,
    bookTitle
  );

  // 5. 调用小模型
  try {
    const model = createModelInstance(
      memoryExtractionModel.providerId,
      memoryExtractionModel.modelId
    );

    const result = await generateText({
      model,
      prompt: extractionPrompt,
      maxTokens: 500,
      temperature: 0.1,
    });

    const responseText = result.text;
    if (!responseText) return;

    // 6. 解析并保存
    const savedCount = await saveExtractedMemories(
      responseText,
      bookId,
      threadId
    );

    if (savedCount > 0) {
      console.log(
        `[Memory] 自动提取完成: 保存了 ${savedCount} 条记忆 (thread: ${threadId})`
      );
    }
  } catch (error) {
    // 静默失败
    console.warn("[Memory] 自动提取失败:", error);
  }
}

/**
 * 重置某个 thread 的计数器（新对话时调用）
 */
export function resetExtractionCounter(threadId: string): void {
  messageCounters.delete(threadId);
}
