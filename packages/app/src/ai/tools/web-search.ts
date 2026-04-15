import { fetch as fetchTauri } from "@tauri-apps/plugin-http";
import { tool } from "ai";
import { z } from "zod";

type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

export function createWebSearchTool(apiKey: string) {
  return tool({
    description: `联网搜索外部信息，用于在回答具体事实、人物、事件或概念时先做核验，降低幻觉风险。

适用场景：
- 用户要求核实某个事实、时间、人物信息或书中提到的外部资料
- 你对某个外部世界知识不够确定，需要先验证再回答

不适用场景：
- 解释当前书籍内容、章节内容或已注入的上下文
- 查询用户自己的笔记、划线或书库数据`,

    inputSchema: z.object({
      reasoning: z.string().min(1).describe("为什么需要搜索核验"),
      query: z.string().min(1).describe("搜索关键词，尽量简洁明确"),
      searchDepth: z.enum(["basic", "advanced"]).default("basic").describe("搜索深度"),
    }),

    execute: async ({
      reasoning,
      query,
      searchDepth,
    }: {
      reasoning: string;
      query: string;
      searchDepth: "basic" | "advanced";
    }) => {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
        throw new Error("未配置 Tavily API Key");
      }

      try {
        const response = await fetchTauri("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: trimmedKey,
            query,
            search_depth: searchDepth,
            max_results: 5,
            include_answer: true,
            include_raw_content: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Tavily API 错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const results = Array.isArray(data.results)
          ? (data.results as TavilySearchResult[]).map((item) => ({
              title: item.title ?? "Untitled",
              url: item.url ?? "",
              content: item.content?.slice(0, 500) ?? "",
              score: item.score ?? null,
            }))
          : [];

        return {
          results,
          answer: typeof data.answer === "string" ? data.answer : null,
          meta: {
            reasoning,
            query,
            searchDepth,
          },
        };
      } catch (error) {
        throw new Error(`联网搜索失败: ${error instanceof Error ? error.message : "未知错误"}`);
      }
    },
  });
}
