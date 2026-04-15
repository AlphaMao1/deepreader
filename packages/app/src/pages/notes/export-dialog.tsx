import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportNotesToObsidian } from "@/services/export-service";
import { useExportSettingsStore } from "@/store/export-settings-store";
import type { Note } from "@/types/note";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string;
  notes: Note[];
}

export function ExportDialog({ open, onClose, bookTitle, bookAuthor, notes }: ExportDialogProps) {
  const { obsidianVaultPath, setObsidianVaultPath } = useExportSettingsStore();
  const [isExporting, setIsExporting] = useState(false);

  const canExport = useMemo(
    () => Boolean(obsidianVaultPath.trim()) && notes.length > 0,
    [obsidianVaultPath, notes.length],
  );

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

  const handleExport = async () => {
    if (!canExport) {
      toast.error("请先选择导出目录");
      return;
    }

    setIsExporting(true);
    try {
      const exportOptions = {
        obsidianVaultPath: obsidianVaultPath.trim(),
        bookTitle,
        bookAuthor,
      };

      const filePath = await exportNotesToObsidian(notes, exportOptions);

      toast.success("导出完成", {
        description: filePath,
        duration: 6000,
      });
      onClose();
    } catch (error) {
      toast.error("导出失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出原始笔记到 Obsidian</DialogTitle>
          <DialogDescription>
            导出你的划线和想法。AI 整理的笔记请在对话中通过「整理笔记」工作流保存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4">
          <section className="space-y-2">
            <Label htmlFor="obsidian-path">Obsidian 知识库路径</Label>
            <div className="flex gap-2">
              <Input
                id="obsidian-path"
                value={obsidianVaultPath}
                onChange={(event) => setObsidianVaultPath(event.target.value)}
                placeholder="C:\\Users\\lenovo\\OneDrive\\Obsidian库\\个人知识库"
                className="font-mono text-sm"
              />
              <Button type="button" variant="outline" onClick={handlePickDirectory}>
                <FolderOpen className="mr-1 h-4 w-4" />
                选择目录
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border p-4">
            <div className="space-y-1">
              <h3 className="font-medium text-sm">导出内容</h3>
              <p className="text-muted-foreground text-xs">
                将导出 {notes.length} 条原始笔记（未标记为"丢弃"的），附带 frontmatter 元数据。
              </p>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
            取消
          </Button>
          <Button type="button" onClick={handleExport} disabled={!canExport || isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            导出笔记
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
