import { Button } from "@/components/ui/button";
import { BookMarked } from "lucide-react";

interface NotepadHeaderProps {
  annotationCount: number;
  onOpenDigest: () => void;
}

export const NotepadHeader = ({ annotationCount, onOpenDigest }: NotepadHeaderProps) => {
  return (
    <div className="flex select-none items-center justify-between border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-700">
      <span className="text-neutral-500 text-xs">
        {annotationCount} 条记录
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 rounded-full text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700"
        onClick={onOpenDigest}
        disabled={annotationCount === 0}
      >
        <BookMarked className="size-3.5" />
        整理
      </Button>
    </div>
  );
};
