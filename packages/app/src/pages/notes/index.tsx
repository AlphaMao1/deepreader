import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteMemory,
  getMemories,
  type Memory,
} from "@/services/memory-service";
import { Brain, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CATEGORY_LABEL: Record<Memory["category"], { label: string; color: string }> = {
  user_profile: { label: "读者画像", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  book_gist: { label: "书籍知识", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  concept: { label: "概念定义", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Memory["category"] | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getMemories({
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      setMemories(all);
    } catch (e) {
      console.error("加载记忆失败:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error("删除记忆失败:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filter === "all" ? memories : memories.filter((m) => m.category === filter);

  const counts = {
    all: memories.length,
    user_profile: memories.filter((m) => m.category === "user_profile").length,
    book_gist: memories.filter((m) => m.category === "book_gist").length,
    concept: memories.filter((m) => m.category === "concept").length,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-2xl">记忆</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              AI 在对话中积累的跨 session 记忆——读者偏好、书籍认知、重要概念。每次对话自动注入。
            </p>
          </div>
          <Badge variant="outline" className="text-sm shrink-0">
            {counts.all} 条
          </Badge>
        </div>

        {/* 分类过滤 */}
        <div className="mt-4 flex gap-2">
          {(["all", "user_profile", "book_gist", "concept"] as const).map((cat) => {
            const isActive = filter === cat;
            const info = cat === "all" ? { label: "全部" } : CATEGORY_LABEL[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {info.label}
                <span className="ml-1 opacity-70">
                  {cat === "all" ? counts.all : counts[cat]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            正在加载记忆…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {filter === "all"
              ? "还没有记忆。在阅读器中与 AI 深度对话后，它会自动积累。"
              : `没有「${CATEGORY_LABEL[filter as Memory["category"]].label}」类型的记忆。`}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((memory) => {
              const catInfo = CATEGORY_LABEL[memory.category];
              return (
                <div
                  key={memory.id}
                  className="group flex items-start gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      {memory.key && (
                        <span className="font-medium text-sm truncate">{memory.key}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{memory.value}</p>
                    <p className="text-xs text-muted-foreground/60">
                      访问 {memory.accessCount} 次 ·{" "}
                      {new Date(memory.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                    disabled={deletingId === memory.id}
                    onClick={() => handleDelete(memory.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
