import { tool } from "ai";
import { z } from "zod";

export const mindmapTool = tool({
  description: `生成 Mermaid 知识图谱。将内容以可视化的思维导图形式展示。

📝 **输出格式要求**：
使用 Mermaid mindmap 语法，示例：
\`\`\`
mindmap
  root((核心主题))
    概念A
      子概念1
      子概念2
    概念B
      子概念3
        细节a
        细节b
\`\`\`

⚠️ **约束**：
• 层级 ≤4 层
• 每个节点 ≤15 字，使用名词或动宾短语
• root 节点用双圆括号 (())
• 不要输出 \`\`\`mermaid 包裹，直接输出 mindmap 语法`,

  inputSchema: z.object({
    reasoning: z.string().min(1).describe("调用此工具的原因"),
    title: z.string().min(1).describe("思维导图的标题"),
    mermaidCode: z.string().min(1).describe("Mermaid mindmap 语法代码（不含 ```mermaid 包裹）"),
  }),

  execute: async ({
    reasoning,
    title,
    mermaidCode,
  }: {
    reasoning: string;
    title: string;
    mermaidCode: string;
  }) => {
    try {
      const lines = mermaidCode.trim().split("\n");
      const nodeCount = lines.filter((line) => line.trim().length > 0 && line.trim() !== "mindmap").length;
      const maxDepth = Math.max(
        ...lines.map((line) => {
          const match = line.match(/^(\s*)/);
          return match ? Math.floor(match[1].length / 2) : 0;
        }),
      );

      return {
        results: {
          title,
          mermaidCode,
          nodeCount,
          maxDepth,
        },
        stats: {
          nodeCount,
          maxDepth,
          characterCount: mermaidCode.length,
        },
        meta: {
          reasoning,
          toolType: "mindmap",
        },
      };
    } catch (error) {
      throw new Error(`生成思维导图失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  },
});
