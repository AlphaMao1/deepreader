/**
 * digest-view.tsx
 *
 * DIG-01/02/03: 批量整理划线的两阶段视图
 * Phase 1 - 选择阶段: 显示划线列表，支持手动勾选 + AI 精选
 * Phase 2 - 结果阶段: 展示 AI 生成的 Obsidian 摘录，支持保存
 */
import { Button } from "@/components/ui/button";
import {
  generateBookDigest,
  highlightCuration,
  type HighlightItem,
} from "@/services/digest-service";
import { exportDigestToObsidian } from "@/services/export-service";
import { getBookById } from "@/services/book-service";
import { getBookNotes } from "@/services/book-note-service";
import { useExportSettingsStore } from "@/store/export-settings-store";
import type { BookNote } from "@/types/book";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeft,
  BookMarked,
  CheckSquare,
  FolderOpen,
  Loader2,
  Sparkles,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface DigestViewProps {
  bookId: string;
  /** 可选，若不传则内部自动从 DB 查询 */
  bookTitle?: string;
  /** 可选，若不传则内部自动从 DB 查询 */
  bookAuthor?: string;
  onClose: () => void;
}

type ViewPhase = "select" | "result";

function annotationToHighlight(ann: BookNote): HighlightItem {
  // 包含用户想法时，一起带入整理
  const text = ann.note ? `${ann.text}\n\n[想法] ${ann.note}` : (ann.text ?? "");
  return {
    id: ann.id,
    text,
    chapterInfo: undefined,
  };
}

export function DigestView({ bookId, bookTitle: propTitle, bookAuthor: propAuthor, onClose }: DigestViewProps) {
  const [phase, setPhase] = useState<ViewPhase>("select");
  const [annotations, setAnnotations] = useState<BookNote[]>([]);
  const [bookTitle, setBookTitle] = useState(propTitle ?? "");
  const [bookAuthor, setBookAuthor] = useState(propAuthor ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCurating, setIsCurating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");

  const { obsidianVaultPath, setObsidianVaultPath } = useExportSettingsStore();

  // 加载标注 + 书名（数据源：BookNote annotations，与左侧标注栏同源）
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [bookNotes, book] = await Promise.all([
          getBookNotes(bookId),
          getBookById(bookId),
        ]);
        // 只取类型为 annotation 且未删除的，按创建时间升序
        const anns = bookNotes
          .filter((n) => n.type === "annotation" && !n.deletedAt && (n.text ?? "").trim().length > 0)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setAnnotations(anns);
        if (book) {
          if (!propTitle) setBookTitle(book.title ?? "");
          if (!propAuthor) setBookAuthor(book.author ?? "");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [bookId, propTitle, propAuthor]);

  const highlights = useMemo(() => annotations.map(annotationToHighlight), [annotations]);

  const selectedCount = selectedIds.size;
  const totalCount = highlights.length;

  // 勾选/取消
  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === highlights.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(highlights.map((h) => h.id)));
    }
  }, [selectedIds.size, highlights]);

  // AI 精选
  const handleCurate = async () => {
    if (highlights.length === 0) return;
    setIsCurating(true);
    try {
      const ids = await highlightCuration(highlights, { bookTitle, bookAuthor });
      setSelectedIds(new Set(ids));
      toast.success(`AI 精选完成，已选中 ${ids.length} 条`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 精选失败，请重试");
    } finally {
      setIsCurating(false);
    }
  };

  // 生成摘录
  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    const selected = highlights.filter((h) => selectedIds.has(h.id));
    setIsGenerating(true);
    try {
      const markdown = await generateBookDigest(selected, { bookTitle, bookAuthor });
      setGeneratedMarkdown(markdown);
      setPhase("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 选择 Obsidian 目录
  const handlePickDirectory = async () => {
    const result = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 Obsidian 知识库目录",
    });
    if (typeof result === "string" && result.trim()) {
      setObsidianVaultPath(result);
    }
  };

  // 保存到 Obsidian
  const handleSave = async () => {
    if (!obsidianVaultPath.trim()) {
      toast.error("请先选择 Obsidian 知识库目录");
      return;
    }
    if (!generatedMarkdown) return;
    setIsSaving(true);
    try {
      const path = await exportDigestToObsidian(generatedMarkdown, {
        obsidianVaultPath: obsidianVaultPath.trim(),
        bookTitle,
        bookAuthor,
      });
      toast.success("已保存到 Obsidian", { description: path, duration: 6000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // ── 选择阶段 UI ────────────────────────────────────────────────────────────

  if (phase === "select") {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">整理本书划线</span>
          </div>
          <button
            type="button"
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        {/* Book info */}
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="font-medium text-sm">《{bookTitle}》</p>
          <p className="text-muted-foreground text-xs">{bookAuthor}</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
              onClick={toggleAll}
            >
              {selectedIds.size === totalCount && totalCount > 0 ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              全选
            </button>
            <span className="text-muted-foreground text-xs">
              共 {totalCount} 条，已选 {selectedCount} 条
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleCurate}
              disabled={isCurating || highlights.length === 0}
            >
              {isCurating ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}
              AI 帮我挑
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleGenerate}
              disabled={selectedCount === 0 || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              生成摘录
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : highlights.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              这本书还没有高亮或笔记
            </div>
          ) : (
            <ul className="divide-y">
              {highlights.map((h) => {
                const selected = selectedIds.has(h.id);
                return (
                  <li
                    key={h.id}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${selected ? "bg-primary/5" : ""}`}
                    onClick={() => toggleItem(h.id)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {selected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {h.chapterInfo && h.chapterInfo !== h.text && (
                        <p className="mb-0.5 text-muted-foreground text-xs">{h.chapterInfo}</p>
                      )}
                      <p className="text-sm leading-relaxed">{h.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── 结果阶段 UI ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
          onClick={() => setPhase("select")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <span className="font-semibold text-sm">摘录笔记</span>
        <button
          type="button"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onClose}
        >
          关闭
        </button>
      </div>

      {/* Result content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
          {generatedMarkdown}
        </pre>
      </div>

      {/* Save to Obsidian */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          {obsidianVaultPath ? (
            <span className="flex-1 truncate text-muted-foreground text-xs" title={obsidianVaultPath}>
              {obsidianVaultPath}
            </span>
          ) : (
            <span className="flex-1 text-muted-foreground text-xs">尚未选择 Obsidian 知识库</span>
          )}
          <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" onClick={handlePickDirectory}>
            <FolderOpen className="mr-1 h-3.5 w-3.5" />
            选择目录
          </Button>
          <Button
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={handleSave}
            disabled={!obsidianVaultPath.trim() || isSaving}
          >
            {isSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            保存到 Obsidian
          </Button>
        </div>
      </div>
    </div>
  );
}
