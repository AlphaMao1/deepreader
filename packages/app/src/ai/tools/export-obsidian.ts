import { useExportSettingsStore } from "@/store/export-settings-store";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { tool } from "ai";
import { z } from "zod";

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "untitled";
}

function ensureTrailingNewLine(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

async function ensureDirectory(path: string) {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export const exportToObsidianTool = tool({
  description: `将 AI 整理好的内容（笔记、摘录、思维导图等）保存到用户的 Obsidian 知识库。

💡 **使用场景**：
• 用户明确要求「保存到 Obsidian」「导出笔记」时
• 笔记格式化工作流整理完成后

⚠️ **注意**：
• 内容建议包含 YAML frontmatter（title, author, date, tags）
• 文件名不含路径和扩展名，工具会自动处理`,
  inputSchema: z.object({
    reasoning: z.string().min(1).describe("保存此内容的原因"),
    content: z.string().min(1).describe("要保存的 Markdown 内容（建议含 YAML frontmatter）"),
    fileName: z.string().min(1).describe("文件名（不含路径和扩展名），例如「系统之美-阅读笔记-20240412」"),
  }),
  execute: async ({
    reasoning,
    content,
    fileName,
  }: {
    reasoning: string;
    content: string;
    fileName: string;
  }) => {
    const vaultPath = useExportSettingsStore.getState().obsidianVaultPath;

    if (!vaultPath?.trim()) {
      return {
        success: false,
        error: "用户未配置 Obsidian 知识库路径。请提示用户在「设置」中配置 Obsidian 知识库目录。",
      };
    }

    try {
      await ensureDirectory(vaultPath);
      const safeName = sanitizeFileName(fileName);
      const filePath = `${vaultPath}/${safeName}.md`;
      await writeTextFile(filePath, ensureTrailingNewLine(content));

      return {
        success: true,
        filePath,
        message: `已保存到 ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `保存失败：${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
