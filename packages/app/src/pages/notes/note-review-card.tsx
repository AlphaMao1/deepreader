import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/note";
import { AlertTriangle, CheckCircle2, Clock3, Trash2 } from "lucide-react";

export type ReviewStatus = "important" | "normal" | "discard" | "unreviewed";

interface NoteReviewCardProps {
  note: Note;
  status: ReviewStatus;
  onStatusChange: (status: ReviewStatus) => void;
}

const STATUS_META: Record<
  ReviewStatus,
  {
    label: string;
    badgeClassName: string;
  }
> = {
  important: {
    label: "重要",
    badgeClassName: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  },
  normal: {
    label: "一般",
    badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  discard: {
    label: "丢弃",
    badgeClassName: "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
  },
  unreviewed: {
    label: "待整理",
    badgeClassName: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
};

export function NoteReviewCard({ note, status, onStatusChange }: NoteReviewCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-background p-4 transition-all",
        status === "discard"
          ? "border-dashed border-red-200 opacity-60 dark:border-red-900"
          : "border-border shadow-sm hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-base text-foreground">{note.title?.trim() || "未命名笔记"}</h3>
            <Badge className={cn("border", STATUS_META[status].badgeClassName)} variant="outline">
              {STATUS_META[status].label}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {note.content?.trim() || "这条笔记还没有正文内容。"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{new Date(note.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={status === "important" ? "default" : "outline"} onClick={() => onStatusChange("important")}>
          <AlertTriangle className="mr-1 h-4 w-4" />
          重要
        </Button>
        <Button type="button" size="sm" variant={status === "normal" ? "default" : "outline"} onClick={() => onStatusChange("normal")}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          一般
        </Button>
        <Button type="button" size="sm" variant={status === "discard" ? "destructive" : "outline"} onClick={() => onStatusChange("discard")}>
          <Trash2 className="mr-1 h-4 w-4" />
          丢弃
        </Button>
      </div>
    </article>
  );
}
