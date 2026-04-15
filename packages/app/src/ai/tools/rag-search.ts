import type { EnhancedSearchItem } from "@/types/document";
import { getCurrentVectorModelConfig } from "@/utils/model";
import { resolveMarkdownImagePaths } from "@/utils/path";
import { invoke } from "@tauri-apps/api/core";
import { tool } from "ai";
import { z } from "zod";

// 智能RAG搜索工具：混合检索系统（BM25 + 向量检索）+ 精确定位 + 智能权重
export const createRagSearchTool = (activeBookId: string | undefined) =>
  tool({
    description: `在当前图书中搜索相关内容片段。

⚠️ **仅在【当前阅读页面内容】无法回答用户问题时使用。**
如果用户问的是当前页面上能看到的内容，直接回答，不要调此工具。

搜索模式：hybrid（默认，推荐）| vector（语义搜索）| bm25（关键词精确匹配）
返回结果包含 chunk_id，可用于 ragContext 扩展或文本标注。`,
    inputSchema: z.object({
      reasoning: z
        .string()
        .min(1)
        .describe("调用此工具的原因和目的，例如：'用户询问关于机器学习的问题，需要搜索相关技术内容'"),
      question: z.string().min(1).describe("用户的查询问题，支持自然语言表达，系统将自动选择最佳搜索策略"),
      limit: z.number().int().min(1).max(20).default(3).describe("返回的内容片段数量，建议3-5个获得平衡的信息覆盖"),
      // format: z.boolean().default(true).describe("是否返回格式化的上下文文本，包含搜索统计和位置信息"),

      // 高级搜索选项
      searchMode: z
        .enum(["vector", "bm25", "hybrid"])
        .default("hybrid")
        .describe(`搜索模式选择：
• hybrid（推荐）：智能混合搜索，自动平衡关键词和语义匹配
• vector：纯语义搜索，适合概念性问题和同义词查找
• bm25：纯关键词搜索，适合专业术语和精确词汇匹配`),
      vectorWeight: z
        .number()
        .min(0)
        .max(1)
        .default(0.7)
        .describe("向量搜索权重（0-1），仅hybrid模式生效。0.8+适合概念查询，0.5-0.7适合平衡查询"),
      bm25Weight: z
        .number()
        .min(0)
        .max(1)
        .default(0.3)
        .describe("关键词搜索权重（0-1），仅hybrid模式生效。0.5+适合术语查询，0.2-0.4适合概念查询"),
    }),
    execute: async ({
      reasoning,
      question,
      limit,
      // format,
      searchMode,
      vectorWeight,
      bm25Weight,
    }: {
      reasoning: string;
      question: string;
      limit?: number;
      // format?: boolean;
      searchMode?: "vector" | "bm25" | "hybrid";
      vectorWeight?: number;
      bm25Weight?: number;
    }) => {
      if (!activeBookId) {
        throw new Error("未找到当前阅读图书，请先在阅读器中打开图书");
      }

      console.log(
        `执行ragSearchTool - 模式: ${searchMode ?? "hybrid"}, 向量权重: ${vectorWeight ?? 0.7}, BM25权重: ${bm25Weight ?? 0.3}`,
      );

      const vectorConfig = await getCurrentVectorModelConfig();

      const results = (await invoke("plugin:epub|search_db", {
        bookId: activeBookId,
        query: question,
        limit: limit ?? 5,
        dimension: vectorConfig.dimension,
        embeddingsUrl: vectorConfig.embeddingsUrl,
        model: vectorConfig.model,
        apiKey: vectorConfig.apiKey,
        searchMode: searchMode ?? "hybrid",
        vectorWeight: vectorWeight ?? 0.7,
        bm25Weight: bm25Weight ?? 0.3,
      })) as EnhancedSearchItem[];

      const enhancedContext = await Promise.all(
        results.map(async (r, idx) => {
          let processedContent = r.content;
          // md_file_path 现在存储的是绝对路径，可以直接用于图片路径解析
          if (r.md_file_path) {
            try {
              processedContent = await resolveMarkdownImagePaths(r.content, r.md_file_path);
            } catch (error) {
              console.warn(`Failed to resolve image paths in search result ${idx}:`, error);
            }
          }

          return {
            rank: idx + 1,
            related_chapter_titles: r.related_chapter_titles,
            similarity: Number.parseFloat((r.similarity * 100).toFixed(1)),
            content: processedContent,
            position: {
              chunk_id: r.chunk_id,
              md_file_path: r.md_file_path,
              file_order_in_book: r.file_order_in_book,
              global_index: r.global_chunk_index,
              file_position: `${r.chunk_order_in_file + 1}/${r.total_chunks_in_file}`,
            },
          };
        }),
      );

      const citations = enhancedContext.map((item) => ({
        chunk_id: item.position.chunk_id,
        source: `${item.related_chapter_titles} - 相似度${item.similarity}%`,
        md_file_path: item.position.md_file_path,
        position: `文件-${item.position.md_file_path} 第${item.position.file_position}块`,
        preview: item.content.slice(0, 100) + (item.content.length > 100 ? "..." : ""),
      }));

      const citationGuide = [
        "📚 引用标注指南：",
        "在回答中引用相关信息时，请在句子末尾添加对应的引用标注：",
        ...citations.map((c) => `[${c.chunk_id}] ${c.source}`),
        "",
        "📝 标注说明：",
        "• 使用 [chunk_id] 格式在句末添加引用，如 [123], [456] 等",
        "• chunk_id 是文本标注的核心标识符，用于精确定位原文片段",
        "• 当用户需要标注特定内容时，引导其使用对应的 chunk_id",
        "",
        "示例：「根据书中描述，这个概念很重要[123]。相关原理如下[456]」",
      ].join("\n");

      return {
        results: enhancedContext,
        citations: citations,
        citation_guide: citationGuide,
        meta: {
          reasoning,
          total_found: results.length,
          book_id: activeBookId,
          query: question,
          search_config: {
            mode: searchMode ?? "hybrid",
            vector_weight: vectorWeight ?? 0.7,
            bm25_weight: bm25Weight ?? 0.3,
          },
        },
      };
    },
  });

export const ragSearchTool = createRagSearchTool(undefined);
