import type { Note } from "@/types/note";
import type { Thread } from "@/types/thread";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UIMessage, UIMessagePart } from "ai";

export interface ExportOptions {
  obsidianVaultPath: string;
  bookTitle: string;
  bookAuthor?: string;
  exportedAt?: Date;
}

export interface CanvasNode {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const FRONTMATTER_TAGS = ["reading", "deepreader"];

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "untitled";
}

function formatDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function ensureTrailingNewLine(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

async function ensureDirectory(path: string) {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

function buildFrontmatter(options: ExportOptions, type: string) {
  const exportedAt = options.exportedAt ?? new Date();
  const lines = [
    "---",
    `title: "${options.bookTitle.replace(/"/g, '\\"')}"`,
    `author: "${(options.bookAuthor ?? "Unknown").replace(/"/g, '\\"')}"`,
    `date: ${formatDate(exportedAt)}`,
    `type: ${type}`,
    `tags: [${FRONTMATTER_TAGS.join(", ")}]`,
    "---",
    "",
  ];

  return lines.join("\n");
}

function noteHeading(note: Note, index: number) {
  if (note.title?.trim()) {
    return note.title.trim();
  }
  return `笔记 ${index + 1}`;
}

export async function exportNotesToObsidian(notes: Note[], options: ExportOptions): Promise<string> {
  await ensureDirectory(options.obsidianVaultPath);

  const fileName = `${sanitizeFileName(options.bookTitle)} - 阅读笔记.md`;
  const filePath = `${options.obsidianVaultPath}/${fileName}`;
  const content = [
    buildFrontmatter(options, "reading-notes"),
    `# ${options.bookTitle}`,
    "",
    `> 作者：${options.bookAuthor ?? "Unknown"} | 导出时间：${formatDate(options.exportedAt ?? new Date())}`,
    "",
    ...notes.flatMap((note, index) => [
      `## ${noteHeading(note, index)}`,
      "",
      note.content?.trim() || "_无正文内容_",
      "",
      `- 创建时间：${new Date(note.createdAt).toLocaleString()}`,
      `- 更新时间：${new Date(note.updatedAt).toLocaleString()}`,
      "",
    ]),
  ].join("\n");

  await writeTextFile(filePath, ensureTrailingNewLine(content));
  return filePath;
}

function partToText(part: UIMessagePart<any, any>) {
  if (part.type === "text") {
    return part.text ?? "";
  }

  if (part.type === "reasoning") {
    return "";
  }

  if (part.type === "quote") {
    return `> ${part.text ?? ""}`;
  }

  if (part.type?.startsWith("tool-")) {
    const toolName = part.type.replace(/^tool-/, "");
    if (part.state === "output-available" && part.output) {
      return `\`\`\`json\n${JSON.stringify(part.output, null, 2)}\n\`\`\``;
    }
    if (part.state === "output-error") {
      return `工具 ${toolName} 调用失败：${part.errorText ?? "未知错误"}`;
    }
    return `工具 ${toolName} 调用中`;
  }

  return "";
}

function messageToMarkdown(message: UIMessage) {
  const role = message.role === "assistant" ? "AI" : "用户";
  const body = Array.isArray(message.parts)
    ? message.parts
        .map((part) => partToText(part))
        .filter((item) => item.trim().length > 0)
        .join("\n\n")
    : "";

  return [`## ${role}`, "", body || "_空消息_", ""].join("\n");
}

export async function exportThreadToObsidian(thread: Thread, options: ExportOptions): Promise<string> {
  await ensureDirectory(options.obsidianVaultPath);

  const fileName = `${sanitizeFileName(options.bookTitle)} - 对话记录.md`;
  const filePath = `${options.obsidianVaultPath}/${fileName}`;
  const noteLink = `[[${sanitizeFileName(options.bookTitle)} - 阅读笔记]]`;
  const content = [
    buildFrontmatter(options, "reading-chat"),
    `# ${options.bookTitle} 对话记录`,
    "",
    `关联笔记：${noteLink}`,
    "",
    ...thread.messages.map((message) => messageToMarkdown(message)),
  ].join("\n");

  await writeTextFile(filePath, ensureTrailingNewLine(content));
  return filePath;
}

type OutlineNode = {
  id: string;
  text: string;
  depth: number;
};

function parseMarkdownOutline(markdown: string): OutlineNode[] {
  const lines = markdown.split(/\r?\n/);
  const nodes: OutlineNode[] = [];
  let counter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      counter += 1;
      nodes.push({
        id: `node-${counter}`,
        text: headingMatch[2].trim(),
        depth: headingMatch[1].length,
      });
      continue;
    }

    const listMatch = rawLine.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      counter += 1;
      nodes.push({
        id: `node-${counter}`,
        text: listMatch[2].trim(),
        depth: Math.floor(listMatch[1].length / 2) + 2,
      });
    }
  }

  return nodes;
}

export function markdownToCanvas(title: string, markdown: string): CanvasData {
  const outline = parseMarkdownOutline(markdown);
  const rootId = "node-root";
  const nodes: CanvasNode[] = [
    {
      id: rootId,
      type: "text",
      text: title,
      x: 0,
      y: 0,
      width: 320,
      height: 120,
    },
  ];
  const edges: CanvasEdge[] = [];
  const lastNodeByDepth = new Map<number, string>([[1, rootId]]);
  const nextYByDepth = new Map<number, number>();
  const xGap = 420;
  const yGap = 180;

  outline.forEach((item, index) => {
    const depth = Math.max(2, item.depth);
    const x = (depth - 1) * xGap;
    const y = nextYByDepth.get(depth) ?? (index === 0 ? 0 : index * yGap);

    nodes.push({
      id: item.id,
      type: "text",
      text: item.text,
      x,
      y,
      width: 320,
      height: 120,
    });

    const parentId = lastNodeByDepth.get(depth - 1) ?? rootId;
    edges.push({
      id: `edge-${item.id}`,
      fromNode: parentId,
      toNode: item.id,
    });

    lastNodeByDepth.set(depth, item.id);
    nextYByDepth.set(depth, y + yGap);

    for (const key of [...lastNodeByDepth.keys()]) {
      if (key > depth) {
        lastNodeByDepth.delete(key);
      }
    }
  });

  return { nodes, edges };
}

export async function exportCanvasToObsidian(
  canvas: CanvasData,
  options: ExportOptions,
  suffix = "思维导图",
): Promise<string> {
  await ensureDirectory(options.obsidianVaultPath);

  const fileName = `${sanitizeFileName(options.bookTitle)} - ${sanitizeFileName(suffix)}.canvas`;
  const filePath = `${options.obsidianVaultPath}/${fileName}`;

  await writeTextFile(
    filePath,
    JSON.stringify(
      {
        nodes: canvas.nodes,
        edges: canvas.edges,
      },
      null,
      2,
    ),
  );

  return filePath;
}

/**
 * OBS-01: 将 AI 生成的 Digest Markdown 保存到 Obsidian vault
 * Digest 内容已包含 YAML frontmatter，直接写入即可
 */
export async function exportDigestToObsidian(
  markdown: string,
  options: ExportOptions,
): Promise<string> {
  await ensureDirectory(options.obsidianVaultPath);

  const date = formatDate(options.exportedAt ?? new Date());
  const fileName = `${sanitizeFileName(options.bookTitle)} - 核心摘录 - ${date}.md`;
  const filePath = `${options.obsidianVaultPath}/${fileName}`;

  await writeTextFile(filePath, ensureTrailingNewLine(markdown));
  return filePath;
}
