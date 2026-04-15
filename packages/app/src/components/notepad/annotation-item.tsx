import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { HIGHLIGHT_COLOR_HEX, HIGHLIGHT_COLOR_RGBA } from "@/services/constants";
import type { BookNote } from "@/types/book";
import { Menu } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import dayjs from "dayjs";
import { X } from "lucide-react";
import { useCallback } from "react";

interface AnnotationItemProps {
  annotation: BookNote;
  bookId: string;
  bookTitle?: string;
  onDelete?: (id: string) => void;
}

export const AnnotationItem = ({ annotation, onDelete }: AnnotationItemProps) => {
  const view = useReaderStore((state) => state.view);
  const bgColor = annotation.color ? HIGHLIGHT_COLOR_RGBA[annotation.color] : HIGHLIGHT_COLOR_RGBA.yellow;
  const lineColor = annotation.color ? HIGHLIGHT_COLOR_HEX[annotation.color] : HIGHLIGHT_COLOR_HEX.yellow;
  const style = annotation.style || "highlight";

  const handleClick = useCallback(() => {
    if (view) {
      view.goTo(annotation.cfi);
    }
  }, [annotation.cfi, view]);

  const handleNativeDelete = useCallback(async () => {
    try {
      const confirmed = await ask(`确定要删除这条标注吗？\n\n"${annotation.text || ""}"\n\n此操作无法撤销。`, {
        title: "确认删除",
        kind: "warning",
      });

      if (confirmed && onDelete) {
        await onDelete(annotation.id);
      }
    } catch (error) {
      console.error("删除标注失败:", error);
    }
  }, [annotation, onDelete]);

  const handleMenuClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const menu = await Menu.new({
          items: [
            {
              id: "delete",
              text: "删除",
              action: () => {
                handleNativeDelete();
              },
            },
          ],
        });

        await menu.popup(new LogicalPosition(e.clientX, e.clientY));
      } catch (error) {
        console.error("显示菜单失败:", error);
      }
    },
    [handleNativeDelete],
  );

  return (
    <div
      className="group relative cursor-pointer rounded-lg bg-muted p-2 transition-colors dark:bg-neutral-900"
      onClick={handleClick}
      onContextMenu={handleMenuClick}
    >
      {/* hover 删除按钮 */}
      <button
        type="button"
        className="absolute top-1.5 right-1.5 hidden rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-neutral-300 hover:text-neutral-700 group-hover:block dark:hover:bg-neutral-600 dark:hover:text-neutral-200"
        onClick={(e) => {
          e.stopPropagation();
          handleNativeDelete();
        }}
        title="删除"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {annotation.context && (
            <div className="mb-1 text-sm leading-relaxed">
              <span className="text-neutral-600 dark:text-neutral-200">...{annotation.context.before}</span>
              <span
                className="font-medium text-sm"
                style={{
                  backgroundColor: style === "highlight" ? bgColor : "transparent",
                  textDecoration: style === "underline" || style === "squiggly" ? "underline" : "none",
                  textDecorationColor: style !== "highlight" ? lineColor : undefined,
                  textDecorationThickness: "2px",
                  textDecorationStyle: style === "squiggly" ? "wavy" : "solid",
                }}
              >
                {annotation.text}
              </span>
              <span className="text-neutral-600 dark:text-neutral-200">{annotation.context.after}...</span>
            </div>
          )}

          {!annotation.context && (
            <div className="mb-2">
              <span
                className="font-medium text-sm"
                style={{
                  backgroundColor: style === "highlight" ? bgColor : "transparent",
                  textDecoration: style === "underline" || style === "squiggly" ? "underline" : "none",
                  textDecorationColor: style !== "highlight" ? lineColor : undefined,
                  textDecorationThickness: "2px",
                  textDecorationStyle: style === "squiggly" ? "wavy" : "solid",
                }}
              >
                {annotation.text}
              </span>
            </div>
          )}

          {/* 用户的想法 */}
          {annotation.note && (
            <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900 text-xs italic dark:bg-amber-900/20 dark:text-amber-200">
              💡 {annotation.note}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 text-neutral-500 text-xs dark:text-neutral-500">
            <span>{dayjs(annotation.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
