import { PromptInput, PromptInputAction, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { useIsChatPage } from "@/hooks/use-is-chat-page";
import { getSkills, type Skill } from "@/services/skill-service";
import type { ChatReference } from "@/types/message";
import { ArrowUp, BookOpen, Brain, Compass, FileText, Paperclip, Quote, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContextPopover } from "./context-popover";

interface ChatInputAreaProps {
  references: ChatReference[];
  input: string;
  status: string;
  activeBookId: string | undefined;
  showToolDetail?: boolean;

  setInput: (value: string) => void;
  onRemoveReference: (id: string) => void;
  onSubmit: (promptOverride?: string) => Promise<void>;
  onStop: () => void;
  setActiveBookId: (bookId: string | undefined) => void;
}

/**
 * QuickAction：只放不需要额外用户输入的动作。
 * 需要输入的（解释概念等）走斜杠命令。
 */
const QUICK_ACTIONS = [
  { label: "总结本章", icon: BookOpen, prompt: "帮我总结当前章节的核心论点、推理路径和关键结论。" },
  { label: "知识图谱", icon: Brain, prompt: "帮我把当前内容生成一个 Mermaid 知识图谱。" },
  {
    label: "笔记格式化",
    icon: FileText,
    prompt: "帮我把我们刚才的对话整理成一篇结构化的 Obsidian 笔记，先呈现给我看，我确认后再保存。",
  },
  {
    label: "预读导航",
    icon: Compass,
    prompt: "我准备开始读这本书，帮我做一个预读导航——了解全书结构、重点章节、阅读路径建议。",
  },
] as const;

export function ChatInputArea({
  input,
  status,
  references,
  activeBookId,
  showToolDetail = false,

  setActiveBookId,
  onRemoveReference,
  onSubmit,
  onStop,
  setInput,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChatPage = useIsChatPage();

  // 斜杠命令状态
  const [slashSkills, setSlashSkills] = useState<Skill[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // 键盘选中索引

  // 每次打开斜杠菜单时重新拉取技能，保证新建技能立即出现
  const loadSkills = useCallback(async () => {
    try {
      const all = await getSkills();
      setSlashSkills(all.filter((s) => s.isActive && !s.isSystem));
    } catch { /* 静默 */ }
  }, []);

  // 初次加载
  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  // 过滤列表
  const slashQuery = input.startsWith("/") ? input.slice(1).split(" ")[0].toLowerCase() : "";
  const filteredSkills = showSlashMenu
    ? slashSkills.filter((s) => s.name.toLowerCase().includes(slashQuery))
    : [];

  // 检测 / 触发斜杠菜单
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      const hasSelected = slashSkills.some((s) => value.startsWith(`/${s.name} `));
      const isSlash = value.startsWith("/") && !hasSelected && !value.includes(" ");
      if (isSlash && !showSlashMenu) {
        // 重新拉取，保证包含最新技能
        void loadSkills();
      }
      setShowSlashMenu(isSlash);
      setActiveIndex(0);
    },
    [setInput, slashSkills, showSlashMenu, loadSkills],
  );

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    if (status === "ready") {
      void onSubmit(prompt);
    }
  };

  // 斜杠选中技能 → 填入前缀，用户继续输入
  const handleSlashSelect = useCallback((skill: Skill) => {
    setShowSlashMenu(false);
    setActiveIndex(0);
    setInput(`/${skill.name} `);
  }, [setInput]);

  /** 发送时：将 /技能名 用户内容 转换为实际 prompt */
  const transformSlashInput = useCallback(
    (raw: string): string => {
      if (!raw.startsWith("/")) return raw;
      const match = slashSkills.find((s) => raw.startsWith(`/${s.name}`));
      if (!match) return raw;
      const userInput = raw.slice(`/${match.name}`.length).trim();
      return userInput
        ? `请执行「${match.name}」技能：${userInput}`
        : `请执行「${match.name}」技能。`;
    },
    [slashSkills],
  );

  const handleSubmitWithTransform = useCallback(() => {
    setShowSlashMenu(false);
    const transformed = transformSlashInput(input);
    setInput(transformed);
    void onSubmit(transformed);
  }, [input, transformSlashInput, onSubmit, setInput]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSlashMenu || filteredSkills.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredSkills.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredSkills[activeIndex];
        if (selected) handleSlashSelect(selected);
      } else if (e.key === "Escape") {
        setShowSlashMenu(false);
      }
    },
    [showSlashMenu, filteredSkills, activeIndex, handleSlashSelect],
  );

  const renderQuickButtons = () =>
    QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
      <PromptInputAction key={label} tooltip={label}>
        <Button
          variant="soft"
          className="h-7 cursor-pointer"
          size="sm"
          onClick={() => handleQuickPrompt(prompt)}
        >
          <Icon className="size-4" />
          {!showToolDetail && <span className="text-xs">{label}</span>}
        </Button>
      </PromptInputAction>
    ));

  return (
    <div className="z-10 shrink-0 px-2 pr-0 pl-1.5">
      {!isChatPage && (
        <div className="flex items-center justify-between gap-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {renderQuickButtons()}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl">
        <PromptInput
          isLoading={status !== "ready"}
          value={input}
          onValueChange={handleInputChange}
          onSubmit={handleSubmitWithTransform}
          className="relative z-10 w-full rounded-2xl border bg-background shadow-around dark:bg-neutral-800"
        >
          {isChatPage && (
            <div className="flex items-center justify-between gap-2 py-2">
              <ContextPopover activeBookId={activeBookId} setActiveBookId={setActiveBookId} />
              <div className="flex flex-wrap items-center gap-2">
                {renderQuickButtons()}
              </div>
            </div>
          )}

          {/* 斜杠命令菜单 */}
          {showSlashMenu && filteredSkills.length > 0 && (
            <div className="border-t border-neutral-200 p-1 dark:border-neutral-700">
              <p className="px-2 py-1 text-neutral-400 text-xs">↑↓ 选择，Enter 确认，Esc 关闭</p>
              {filteredSkills.map((skill, index) => (
                <button
                  key={skill.id}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    index === activeIndex
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "hover:bg-muted dark:hover:bg-neutral-700"
                  }`}
                  onClick={() => handleSlashSelect(skill)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="text-neutral-400 text-xs">/</span>
                  <span className="font-medium">{skill.name}</span>
                </button>
              ))}
            </div>
          )}

          {references.length > 0 && (
            <div className="my-1 flex flex-col">
              {references.map((reference) => (
                <div
                  key={reference.id}
                  className="group flex w-full items-start gap-2 rounded-xl border border-neutral-200 bg-muted/70 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-700/70"
                >
                  <Quote className="mt-[1px] size-3.5 text-neutral-600 dark:text-neutral-100" />
                  <span className="flex-1 whitespace-pre-wrap break-words text-left text-neutral-700 dark:text-neutral-100">
                    {reference.text}
                  </span>
                  <button
                    type="button"
                    className="mt-0.5 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveReference(reference.id);
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <PromptInputTextarea
            placeholder="问我任何问题... 输入 / 查看技能"
            className="flex-1 py-2 pl-2 text-sm leading-[1.3] placeholder:font-light dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400"
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center justify-between gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" />
            <PromptInputAction tooltip="上传文件">
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="size-8 rounded-full dark:border-neutral-600 dark:hover:bg-neutral-700"
              >
                <Paperclip className="size-4" />
              </Button>
            </PromptInputAction>

            <Button
              type="submit"
              size="icon"
              disabled={status === "ready" ? !input.trim() : status !== "submitted" && status !== "streaming"}
              onClick={() => {
                if (status === "ready") {
                  handleSubmitWithTransform();
                } else {
                  onStop();
                }
              }}
              className="size-8 rounded-full"
            >
              {status === "ready" ? (
                <ArrowUp size={18} />
              ) : (
                <span className="size-2 rounded-xs bg-white dark:bg-neutral-900" />
              )}
            </Button>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}
