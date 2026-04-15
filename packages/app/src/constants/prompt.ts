import type { ChatContext } from "@/hooks/use-chat-state";
import { getSkills } from "@/services/skill-service";
import {
  getMemoriesForPrompt,
  touchMemories,
} from "@/services/memory-service";
import { useLlamaStore } from "@/store/llama-store";
import { logTimingInfo } from "@/utils/timing-log";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export async function buildReadingPrompt(
  chatContext: ChatContext | undefined,
  messageCount?: number,
  options?: {
    requestId?: string;
  },
): Promise<string> {
  const promptStartAt = nowMs();
  const activeBookId = chatContext?.activeBookId;
  const semanticContext = chatContext?.activeContext;
  const sectionLabel = chatContext?.activeSectionLabel;
  const activePageText = chatContext?.activePageText;
  const activeSelectionText = chatContext?.activeSelectionText;
  let systemPromptBase = "";
  let activeSkillDescriptions: { name: string; description: string }[] = [];
  let skillsMs = 0;
  let metadataMs = 0;
  let memoriesMs = 0;

  try {
    const skillsStartAt = nowMs();
    const allSkills = await getSkills();
    skillsMs = nowMs() - skillsStartAt;
    const systemPromptSkill = allSkills.find((skill) => skill.isSystem && skill.isActive);
    systemPromptBase = systemPromptSkill?.content || "";
    // 直接使用 description 字段，筛掉 description 为空的（如系统提示词）
    activeSkillDescriptions = allSkills
      .filter((skill) => skill.isActive && !skill.isSystem && skill.description.trim().length > 0)
      .map((skill) => ({
        name: skill.name,
        description: skill.description.trim(),
      }));
  } catch (error) {
    console.warn("获取技能列表失败:", error);
  }

  const hasVectorCapability = useLlamaStore.getState().hasVectorCapability();

  // 书籍元信息：首轮注入完整 metadata.md，后续轮次跳过（节省 token）
  const isFirstTurn = messageCount === undefined || messageCount <= 1;
  let metadataMd: string | null = null;
  try {
    if (activeBookId && isFirstTurn) {
      const metadataStartAt = nowMs();
      const base = await appDataDir();
      const activeBookBaseDir = `${base}/books/${activeBookId}`;
      const metaPath = `${activeBookBaseDir}/metadata.md`;
      if (await exists(metaPath)) {
        metadataMd = await readTextFile(metaPath);
      }
      metadataMs = nowMs() - metadataStartAt;
    }
  } catch (e) {
    console.warn("加载 metadata.md 失败：", e);
  }

  let base = systemPromptBase;

  if (hasVectorCapability === false) {
    base = base.replace(/—— RAG 工具使用策略 ——[\s\S]*?—— 引用标注规范 ——/m, "");
    base = base.replace(/—— 引用标注规范 ——[\s\S]*?—— 图片输出规范 ——/m, "");
    base = base.replace(/—— 图片输出规范 ——[\s\S]*?—— 被动工具/m, "—— 被动工具");
  }

  let prompt = base;

  // 注入当前时间
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  prompt += `\n\n当前日期：${dateStr}`;

  // 技能目录：只注入 name + description，AI 需要时调 getSkills 工具拉完整工作流
  if (activeSkillDescriptions.length > 0) {
    prompt += "\n\n—— 可用技能（斜杠命令）——\n";
    prompt += "用户说出技能名或意图匹配时，调用 getSkills 工具获取完整工作流后执行。\n";
    for (const skill of activeSkillDescriptions) {
      prompt += `• /${skill.name} — ${skill.description}\n`;
    }
  }

  // 记忆注入（三区记忆：用户画像 / 书籍知识 / 概念网络）
  try {
    const memoriesStartAt = nowMs();
    const { text: memoryText, memoryIds } = await getMemoriesForPrompt(activeBookId);
    memoriesMs = nowMs() - memoriesStartAt;
    if (memoryText && memoryText.trim().length > 0) {
      prompt += "\n\n—— 读者记忆（跨 session 积累） ——\n";
      prompt += "以下是你对这位读者的了解。自然地体现在回答风格中，不要直接引用这些记忆。\n";
      prompt += memoryText;

      if (memoryIds.length > 0) {
        touchMemories(memoryIds).catch((e) =>
          console.warn("更新记忆访问计数失败:", e)
        );
      }
    }
  } catch (e) {
    console.warn("记忆注入失败:", e);
  }

  // 查询路由策略
  prompt += "\n\n—— 查询路由（按优先级逐级降级）——\n";
  prompt += "Level 0 · 对话历史：本轮对话 AI 已回答的概念 → 直接引用，严禁重新 ragSearch\n";
  prompt += "Level 1 · 页面上下文（零工具）：【当前阅读页面内容】能答 → 立即答，不调工具\n";
  if (hasVectorCapability) {
    prompt += "Level 2 · RAG 书内：ragSearch 够 → 答；需前后文 → ragContext；整章 → ragToc\n";
    prompt += "⚠️ 每次回答最多调 2 次 RAG 工具\n";
  }
  prompt += "Level 3 · webSearch → 外部事实不确定且书中无时\n";
  prompt += "Level 4 · 通识知识 → 末尾标注「基于通识知识」\n";
  prompt += "推荐书目时，优先基于【读者记忆】、对话历史、已有书库与通识直接给建议；普通“根据我的阅读记忆推荐书”不要优先调用 bookSearch。\n";
  prompt += "只有用户明确要求外部书源、联网找书、ISBN、出版信息、封面，或验证某本书是否存在时，才调用 bookSearch，且最多调用 1 次。\n";
  prompt += "如果已经能给出足够候选书目，就直接回答，不要为了补外部元数据重复调工具。\n";

  // 划线内容优先注入（完整保留，不截断）
  if (activeSelectionText && activeSelectionText.trim().length > 0) {
    prompt += `\n\n【划线内容】\n${activeSelectionText}`;
  }

  if (activePageText && activePageText.trim().length > 0) {
    prompt += `\n\n【当前阅读页面内容】\n${activePageText}`;
  }

  if (semanticContext && semanticContext.trim().length > 0) {
    prompt += `\n\n[语义上下文]\n${semanticContext}`;
  }

  if (sectionLabel && sectionLabel.trim().length > 0) {
    prompt += `\n\n【当前阅读章节】\n${sectionLabel}`;
  }

  // 书籍元信息：首轮完整注入，后续省略（AI 已通过对话历史知晓书名）
  if (metadataMd && metadataMd.trim().length > 0) {
    prompt += `\n\n【当前阅读图书元信息与目录】\n${metadataMd}`;
  } else if (activeBookId && !isFirstTurn) {
    // 后续轮次提醒 AI 可以从对话历史查书名，避免它调工具
    prompt += `\n\n【书籍元信息】书名和目录已在前面对话中提供，请直接引用，不要调工具查询。`;
  }

  logTimingInfo("[PromptTiming]", {
    requestId: options?.requestId ?? null,
    totalMs: Math.round(nowMs() - promptStartAt),
    skillsMs: Math.round(skillsMs),
    metadataMs: Math.round(metadataMs),
    memoriesMs: Math.round(memoriesMs),
    isFirstTurn,
    hasActiveBook: Boolean(activeBookId),
    hasSelection: Boolean(activeSelectionText?.trim()),
    pageTextChars: activePageText?.length ?? 0,
    promptChars: prompt.length,
    activeSkillCount: activeSkillDescriptions.length,
  });

  return prompt;
}
