import mermaid from "mermaid";
import { memo, useEffect, useRef, useState } from "react";

interface MindmapViewerProps {
  mermaidCode: string;
}

let mermaidInitialized = false;

const MindmapViewerComponent = ({ mermaidCode }: MindmapViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        mindmap: {
          useMaxWidth: true,
          padding: 16,
        },
        securityLevel: "strict",
      });
      mermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !mermaidCode) return;

    const renderMermaid = async () => {
      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode.trim());
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Make SVG responsive
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.minHeight = "300px";
          }
        }
      } catch (err) {
        console.error("Mermaid render failed:", err);
        setError(err instanceof Error ? err.message : "思维导图渲染失败");
      }
    };

    renderMermaid();
  }, [mermaidCode]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
        <p className="text-sm">思维导图渲染失败</p>
        <pre className="max-h-40 w-full overflow-auto rounded bg-muted p-3 text-xs">{error}</pre>
        <details className="w-full">
          <summary className="cursor-pointer text-xs text-muted-foreground">查看原始代码</summary>
          <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-3 text-xs">{mermaidCode}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-auto px-4 py-2">
        <div ref={containerRef} className="flex min-h-[300px] items-center justify-center" />
      </div>
    </div>
  );
};

export const MindmapViewer = memo(MindmapViewerComponent);
