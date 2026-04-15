import { fetch as fetchTauri } from "@tauri-apps/plugin-http";
import { tool } from "ai";
import { z } from "zod";

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
  key?: string;
}

interface BookSearchResult {
  title: string;
  authors: string[];
  publishYear: number | null;
  coverUrl: string | null;
  subjects: string[];
  isbn: string | null;
  pages: number | null;
  openLibraryUrl: string | null;
}

function formatDoc(doc: OpenLibraryDoc): BookSearchResult {
  const coverId = doc.cover_i;
  return {
    title: doc.title ?? "Unknown",
    authors: doc.author_name ?? [],
    publishYear: doc.first_publish_year ?? null,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
    subjects: (doc.subject ?? []).slice(0, 5),
    isbn: doc.isbn?.[0] ?? null,
    pages: doc.number_of_pages_median ?? null,
    openLibraryUrl: doc.key ? `https://openlibrary.org${doc.key}` : null,
  };
}

export const bookSearchTool = tool({
  description: `搜索外部书源中的书籍元信息。通过 Open Library API 搜索，返回书名、作者、封面、主题等信息。
适用场景：
- 用户明确要求去外部书源或联网查一本书是否存在
- 用户需要 ISBN、出版年份、出版社、封面、页数等外部元信息
- 用户读完一本书，想找同主题或同作者的其他书
- 用户询问某个领域有哪些推荐书目
- 对话中提到了某本书，需要查证其基本信息

不适用场景：
- 查询当前正在阅读的书的内容（用 RAG 工具）
- 查询用户已有的书库（用 getBooks 工具）
- 基于用户记忆、阅读偏好、对话历史做普通推书；这类场景应优先直接回答，不要默认调用本工具`,

  inputSchema: z.object({
    reasoning: z.string().min(1).describe("为什么要搜索书籍"),
    query: z.string().min(1).describe("搜索关键词：书名、作者名或主题"),
    searchType: z
      .enum(["title", "author", "subject", "q"])
      .default("q")
      .describe("搜索类型：title=按书名 author=按作者 subject=按主题 q=综合搜索"),
    limit: z.number().int().min(1).max(10).default(5).describe("返回结果数量"),
  }),

  execute: async ({
    reasoning,
    query,
    searchType,
    limit,
  }: {
    reasoning: string;
    query: string;
    searchType: "title" | "author" | "subject" | "q";
    limit: number;
  }) => {
    try {
      const params = new URLSearchParams({
        [searchType]: query,
        limit: String(limit),
        fields:
          "title,author_name,first_publish_year,cover_i,subject,isbn,number_of_pages_median,key",
      });

      const url = `https://openlibrary.org/search.json?${params.toString()}`;

      const response = await fetchTauri(url, {
        method: "GET",
        headers: {
          "User-Agent": "DeepReader/1.0 (AI Reading Assistant)",
        },
      });

      if (!response.ok) {
        throw new Error(`Open Library API 错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const docs: OpenLibraryDoc[] = data.docs ?? [];
      const results = docs.slice(0, limit).map(formatDoc);

      return {
        results,
        summary: {
          total: data.numFound ?? 0,
          returned: results.length,
          query,
          searchType,
        },
        meta: { reasoning },
      };
    } catch (error) {
      throw new Error(`书籍搜索失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  },
});
