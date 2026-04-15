import { DigestView } from "@/pages/notes/digest-view";
import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { useReaderStore as useAppReaderStore } from "@/store/reader-store";
import { AnnotationItem } from "./annotation-item";
import { useAnnotations } from "./hooks";
import { NotepadHeader } from "./notepad-header";

interface NotepadContentProps {
  bookId: string;
  showDigest: boolean;
  onOpenDigest: () => void;
  onCloseDigest: () => void;
}

export const NotepadContent = ({ bookId, showDigest, onOpenDigest, onCloseDigest }: NotepadContentProps) => {
  const { annotations, status: annotationStatus, handleDeleteAnnotation } = useAnnotations({ bookId });
  const { activeBook } = useAppReaderStore();
  const progress = useReaderStore((state) => state.progress);

  // DigestView 作为整页覆盖
  if (showDigest) {
    return (
      <DigestView
        bookId={bookId}
        bookTitle={progress?.sectionLabel ?? activeBook?.title ?? "本书"}
        bookAuthor={activeBook?.author ?? ""}
        onClose={onCloseDigest}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <NotepadHeader annotationCount={annotations.length} onOpenDigest={onOpenDigest} />
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-1">
          {annotationStatus === "pending" ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
            </div>
          ) : annotationStatus === "error" ? (
            <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
              <p>加载失败</p>
            </div>
          ) : annotations.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
              <p>选中文本并高亮来创建第一条记录</p>
            </div>
          ) : (
            annotations.map((annotation) => (
              <AnnotationItem
                key={annotation.id}
                annotation={annotation}
                bookId={bookId}
                bookTitle={activeBook?.title}
                onDelete={handleDeleteAnnotation}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
