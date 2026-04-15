import type { ExplainTextEventDetail } from "@/services/iframe-service";
import { useCallback, useEffect } from "react";

interface UseTextEventHandlerOptions {
  sendMessage: any;
  onTextReceived?: (text: string) => void;
  activeBookId?: string;
  handleNewThread?: () => void;
}

export const useTextEventHandler = (options: UseTextEventHandlerOptions) => {
  const { sendMessage, onTextReceived, activeBookId, handleNewThread } = options;

  const handleTextEvent = useCallback(
    (event: CustomEvent<ExplainTextEventDetail>) => {
      const { selectedText, question, bookId, newThread } = event.detail;

      if (bookId && bookId !== activeBookId) {
        return;
      }

      if (selectedText && question) {
        onTextReceived?.(selectedText);

        // 划线询问强制开新对话
        if (newThread && handleNewThread) {
          handleNewThread();
        }

        const parts = [
          {
            type: "quote",
            text: selectedText,
            source: "划线引用",
          },
          {
            type: "text",
            text: question,
          },
        ];

        // 短暂延迟确保新线程状态已就绪
        if (newThread) {
          setTimeout(() => sendMessage({ parts }), 50);
        } else {
          sendMessage({ parts });
        }
      }
    },
    [sendMessage, onTextReceived, activeBookId, handleNewThread],
  );

  useEffect(() => {
    window.addEventListener("explainText", handleTextEvent as EventListener);

    return () => {
      window.removeEventListener("explainText", handleTextEvent as EventListener);
    };
  }, [handleTextEvent]);
};
