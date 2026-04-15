import type { ReadingSession } from "@/types/reading-session";
import { invoke } from "@tauri-apps/api/core";
import { tool } from "ai";
import { z } from "zod";

async function loadSessions(bookId: string, limit: number): Promise<ReadingSession[]> {
  if (limit <= 0) return [];
  return await invoke<ReadingSession[]>("get_reading_sessions_by_book", { bookId, limit });
}

async function loadAllSessions(limit = 200): Promise<ReadingSession[]> {
  return await invoke<ReadingSession[]>("get_all_reading_sessions", { limit });
}

function summarizeSessions(sessions: ReadingSession[]) {
  if (!sessions.length) return null;
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const lastSession = sessions[0];
  return {
    totalSessions: sessions.length,
    totalDurationMinutes: Number((totalDurationSeconds / 60).toFixed(1)),
    averageDurationMinutes: Number((totalDurationSeconds / sessions.length / 60).toFixed(1)),
    lastSession: {
      id: lastSession.id,
      startedAt: lastSession.startedAt,
      endedAt: lastSession.endedAt ?? null,
      durationMinutes: Number((lastSession.durationSeconds / 60).toFixed(1)),
    },
  };
}

function buildGlobalSummary(sessions: ReadingSession[]) {
  if (!sessions.length) {
    return {
      totalSessions: 0,
      totalDurationMinutes: 0,
      uniqueBooks: 0,
      topBooks: [],
      recentDays: 0,
    };
  }

  const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const bookMap = new Map<string, number>();
  for (const s of sessions) {
    bookMap.set(s.bookId, (bookMap.get(s.bookId) ?? 0) + s.durationSeconds);
  }

  // 按时长排序取 top 5
  const topBooks = [...bookMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([bookId, secs]) => ({
      bookId,
      durationMinutes: Number((secs / 60).toFixed(1)),
    }));

  // 最近 7 天的活跃天数
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentDays = new Set(
    sessions
      .filter((s) => s.startedAt >= sevenDaysAgo)
      .map((s) => new Date(s.startedAt).toDateString())
  ).size;

  return {
    totalSessions: sessions.length,
    totalDurationMinutes: Number((totalDuration / 60).toFixed(1)),
    uniqueBooks: bookMap.size,
    topBooks,          // bookId + 时长，AI 可用 getBooks 工具查书名
    recentActiveDays: recentDays,
  };
}

export const getReadingStatsTool = tool({
  description: `获取阅读统计信息。支持两种模式：
• 全局汇总（不传 bookId）：总阅读时长、活跃书目数、最近 7 天活跃天数、耗时最多的前 5 本书的 bookId。token 消耗极少。
• 单书详情（传 bookId）：该书的阅读会话列表和统计摘要。`,

  inputSchema: z.object({
    reasoning: z.string().min(1).describe("调用此工具的原因"),
    bookId: z.string().min(1).optional().describe("书籍ID。不传则返回全局统计"),
    sessionLimit: z.number().int().min(1).max(20).default(5).describe("单书模式：返回的会话数量，默认5"),
  }),

  execute: async ({
    reasoning,
    bookId,
    sessionLimit,
  }: {
    reasoning: string;
    bookId?: string;
    sessionLimit?: number;
  }) => {
    try {
      // ── 全局汇总模式 ──
      if (!bookId) {
        const allSessions = await loadAllSessions(500);
        const summary = buildGlobalSummary(allSessions);
        return {
          mode: "global",
          summary,
          note: "topBooks 里只有 bookId，调用 getBooks 工具可查书名",
          meta: { reasoning },
        };
      }

      // ── 单书详情模式 ──
      const sessions = await loadSessions(bookId.trim(), sessionLimit || 5);
      const summary = summarizeSessions(sessions);
      const results = sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        durationMinutes: Number((s.durationSeconds / 60).toFixed(1)),
        isActive: s.endedAt == null,
      }));

      return {
        mode: "book",
        results,
        summary: summary ?? {
          totalSessions: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastSession: null,
        },
        meta: { reasoning, bookId, sessionLimit: sessionLimit || 5 },
      };
    } catch (error) {
      throw new Error(`获取阅读统计失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  },
});
