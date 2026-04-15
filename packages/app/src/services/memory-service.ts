import { invoke } from "@tauri-apps/api/core";

// ========== 类型定义 ==========

export interface Memory {
  id: string;
  category: "user_profile" | "book_gist" | "concept";
  key: string;
  value: string;
  sourceType?: string;
  sourceId?: string;
  bookId?: string;
  relatedMemoryIds?: string[];
  confidence: number;
  accessCount: number;
  lastAccessedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMemoryData {
  category: "user_profile" | "book_gist" | "concept";
  key: string;
  value: string;
  sourceType?: string;
  sourceId?: string;
  bookId?: string;
  relatedMemoryIds?: string[];
  confidence?: number;
}

export interface UpdateMemoryData {
  id: string;
  key?: string;
  value?: string;
  sourceType?: string;
  sourceId?: string;
  bookId?: string | null;
  relatedMemoryIds?: string[] | null;
  confidence?: number;
}

export interface MemoryQueryOptions {
  category?: string;
  bookId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

// ========== CRUD ==========

export async function createMemory(data: CreateMemoryData): Promise<Memory> {
  return invoke<Memory>("create_memory", { data });
}

export async function getMemories(
  options?: MemoryQueryOptions
): Promise<Memory[]> {
  return invoke<Memory[]>("get_memories", { options });
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  return invoke<Memory | null>("get_memory_by_id", { id });
}

export async function updateMemory(data: UpdateMemoryData): Promise<Memory> {
  return invoke<Memory>("update_memory", { data });
}

export async function deleteMemory(id: string): Promise<void> {
  return invoke("delete_memory", { id });
}

export async function searchMemories(
  query: string,
  category?: string,
  limit?: number
): Promise<Memory[]> {
  return invoke<Memory[]>("search_memories", { query, category, limit });
}

export async function touchMemories(ids: string[]): Promise<void> {
  return invoke("touch_memories", { ids });
}

// ========== 容量硬控常量 ==========

const MAX_USER_PROFILE = 15;
const MAX_BOOK_GIST_PER_BOOK = 5;
const MAX_CONCEPTS = 50;
const MAX_PROMPT_CHARS = 1200; // ~800 tokens

// ========== Prompt 注入组合查询 ==========

/**
 * 获取适合注入 prompt 的记忆文本。
 * 三区记忆分别检索，按优先级拼接，总量硬控。
 */
export async function getMemoriesForPrompt(
  bookId?: string
): Promise<{ text: string; memoryIds: string[] }> {
  const memoryIds: string[] = [];
  const sections: string[] = [];

  try {
    // 1. 用户画像区 — 全量注入
    const profileMemories = await getMemories({
      category: "user_profile",
      limit: MAX_USER_PROFILE,
      sortBy: "access_count",
      sortOrder: "desc",
    });

    if (profileMemories.length > 0) {
      sections.push("【读者画像】");
      for (const m of profileMemories) {
        sections.push(`- ${m.value}`);
        memoryIds.push(m.id);
      }
    }

    // 2. 书籍知识区 — 当前书的 gist
    if (bookId) {
      const bookGists = await getMemories({
        category: "book_gist",
        bookId,
        limit: MAX_BOOK_GIST_PER_BOOK,
        sortBy: "created_at",
        sortOrder: "asc",
      });

      if (bookGists.length > 0) {
        sections.push("【本书知识】");
        for (const m of bookGists) {
          sections.push(`- ${m.key}: ${m.value}`);
          memoryIds.push(m.id);
        }
      }

      // 跨书关联：找当前书概念在其他书中的链接
      const bookConcepts = await getMemories({
        category: "concept",
        bookId,
        limit: 10,
        sortBy: "access_count",
        sortOrder: "desc",
      });

      for (const concept of bookConcepts) {
        if (
          concept.relatedMemoryIds &&
          concept.relatedMemoryIds.length > 0
        ) {
          // 有跨书链接，但不在此处展开（避免 prompt 膨胀）
          // 仅标记存在关联
          sections.push(
            `- [跨书] ${concept.key}: 在其他书中也有讨论`
          );
          memoryIds.push(concept.id);
        }
      }
    }

    // 3. 概念网络区 — 按访问频次 top N
    const concepts = await getMemories({
      category: "concept",
      limit: 10,
      sortBy: "access_count",
      sortOrder: "desc",
    });

    const conceptsNotInBook = concepts.filter(
      (c) => !memoryIds.includes(c.id)
    );

    if (conceptsNotInBook.length > 0) {
      sections.push("【常用概念】");
      for (const m of conceptsNotInBook) {
        sections.push(`- ${m.key}: ${m.value}`);
        memoryIds.push(m.id);
      }
    }
  } catch (error) {
    console.warn("加载记忆失败:", error);
    return { text: "", memoryIds: [] };
  }

  let text = sections.join("\n");

  // 硬控字符数
  if (text.length > MAX_PROMPT_CHARS) {
    text = text.substring(0, MAX_PROMPT_CHARS) + "\n...（记忆已截断）";
  }

  return { text, memoryIds };
}

// ========== 容量淘汰 ==========

/**
 * 检查并淘汰超容量记忆。
 * 按 access_count 升序（最少使用）删除超出部分。
 */
export async function evictExcessMemories(): Promise<void> {
  try {
    // 用户画像
    const profiles = await getMemories({
      category: "user_profile",
      limit: 100,
      sortBy: "access_count",
      sortOrder: "asc",
    });
    if (profiles.length > MAX_USER_PROFILE) {
      const toDelete = profiles.slice(
        0,
        profiles.length - MAX_USER_PROFILE
      );
      for (const m of toDelete) {
        await deleteMemory(m.id);
      }
    }

    // 概念
    const concepts = await getMemories({
      category: "concept",
      limit: 200,
      sortBy: "access_count",
      sortOrder: "asc",
    });
    if (concepts.length > MAX_CONCEPTS) {
      const toDelete = concepts.slice(0, concepts.length - MAX_CONCEPTS);
      for (const m of toDelete) {
        await deleteMemory(m.id);
      }
    }
  } catch (error) {
    console.warn("记忆淘汰失败:", error);
  }
}
