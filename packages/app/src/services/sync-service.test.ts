import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEpubStoragePath,
  getSafeLocalBookFilePath,
  isActiveEpubBookRow,
  normalizeRemoteBookRow,
  resolveLwwRows,
  runIncrementalSync,
  SYNC_TABLES,
} from "./sync-service";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn(async () => "C:/app-data"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);
const existsMock = vi.mocked(exists);

const createEmptySupabaseClient = () => {
  const order = vi.fn(async () => ({ data: [], error: null }));
  const gt = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ gt }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from };
};

beforeEach(() => {
  invokeMock.mockReset();
  existsMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveLwwRows", () => {
  it("uploads local rows when local updated_at is newer and applies remote rows when remote is newer", () => {
    const result = resolveLwwRows(
      [{ id: "local-newer", updated_at: 300 }],
      [
        { id: "local-newer", updated_at: 200 },
        { id: "remote-newer", updated_at: 400 },
      ],
      "id",
    );

    expect(result.uploadRows.map((row) => row.id)).toEqual(["local-newer"]);
    expect(result.applyRemoteRows.map((row) => row.id)).toEqual(["remote-newer"]);
  });

  it("treats local tombstones as upload rows when they are newer than remote rows", () => {
    const result = resolveLwwRows(
      [{ id: "deleted-local", updated_at: 500, deleted_at: 500 }],
      [{ id: "deleted-local", updated_at: 300, deleted_at: null }],
      "id",
    );

    expect(result.uploadRows).toHaveLength(1);
    expect(result.applyRemoteRows).toHaveLength(0);
  });

  it("keeps reading progress in the default sync table set", () => {
    expect(SYNC_TABLES).toContainEqual({ table: "book_status", primaryKey: "book_id" });
  });

  it("resolves reading progress conflicts by book_id and updated_at", () => {
    const result = resolveLwwRows(
      [{ book_id: "book-a", progress_current: 12, progress_total: 100, updated_at: 200 }],
      [{ book_id: "book-a", progress_current: 30, progress_total: 100, updated_at: 300 }],
      "book_id",
    );

    expect(result.uploadRows).toHaveLength(0);
    expect(result.applyRemoteRows).toEqual([
      { book_id: "book-a", progress_current: 30, progress_total: 100, updated_at: 300 },
    ]);
  });

  it("builds user-scoped EPUB storage paths", () => {
    expect(getEpubStoragePath("user-a", { id: "book-a", file_path: "books/book-a/book.epub" })).toBe(
      "user-a/book-a/book.epub",
    );
  });

  it("sanitizes EPUB storage and restore paths", () => {
    const row = { id: "../book-a", format: "EPUB", file_path: "C:\\temp\\..\\evil:name" };

    expect(getEpubStoragePath("user-a", row)).toBe("user-a/book-a/evil_name.epub");
    expect(getSafeLocalBookFilePath(row)).toBe("books/book-a/evil_name.epub");
    expect(normalizeRemoteBookRow(row).file_path).toBe("books/book-a/evil_name.epub");
  });

  it("normalizes restored EPUB paths when the remote format casing differs", () => {
    const row = { id: "book-a", format: "epub", file_path: "C:\\temp\\book-a.epub" };

    expect(normalizeRemoteBookRow(row).file_path).toBe("books/book-a/book-a.epub");
  });

  it("avoids Windows reserved names in restored EPUB paths", () => {
    const row = { id: "CON", format: "EPUB", file_path: "AUX.epub" };

    expect(getSafeLocalBookFilePath(row)).toBe("books/book/book.epub");
  });

  it("does not treat tombstoned books as active EPUB file rows", () => {
    expect(isActiveEpubBookRow({ id: "book-a", file_path: "books/book-a/book.epub", deleted_at: 123 })).toBe(false);
    expect(isActiveEpubBookRow({ id: "book-a", file_path: "books/book-a/book.epub", deleted_at: null })).toBe(true);
  });

  it("returns a conservative sync-start cursor", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    invokeMock.mockResolvedValue([]);

    const client = createEmptySupabaseClient();
    const resultPromise = runIncrementalSync({
      client: client as any,
      userId: "user-a",
      lastSyncedAt: 0,
      tables: [{ table: "books", primaryKey: "id" }],
    });

    vi.setSystemTime(2000);
    const result = await resultPromise;

    expect(result.syncedAt).toBe(999);
  });

  it("marks uploaded rows synced using the uploaded row snapshot", async () => {
    const localRow = {
      id: "book-a",
      title: "Book A",
      author: "Author",
      format: "EPUB",
      file_path: "books/book-a/book.epub",
      file_size: 10,
      language: "en",
      created_at: 100,
      updated_at: 200,
      deleted_at: null,
    };
    invokeMock.mockImplementation((command) => {
      if (command === "get_tombstones_since") return Promise.resolve([]) as any;
      if (command === "get_changed_since") return Promise.resolve([localRow]) as any;
      if (command === "mark_synced") return Promise.resolve(undefined) as any;
      return Promise.resolve([]) as any;
    });

    const order = vi.fn(async () => ({ data: [], error: null }));
    const gt = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ gt }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ select, upsert }));

    await runIncrementalSync({
      client: { from } as any,
      userId: "user-a",
      lastSyncedAt: 0,
      tables: [{ table: "books", primaryKey: "id" }],
    });

    expect(invokeMock).toHaveBeenCalledWith("mark_synced", {
      table: "books",
      rows: [localRow],
    });
  });

  it("rejects overlapping sync runs from different entry points", async () => {
    let releaseTombstones: ((rows: unknown[]) => void) | null = null;
    invokeMock.mockImplementation((command) => {
      if (command === "get_tombstones_since") {
        return new Promise((resolve) => {
          releaseTombstones = resolve;
        }) as any;
      }
      return Promise.resolve([]) as any;
    });

    const first = runIncrementalSync({
      client: createEmptySupabaseClient() as any,
      userId: "user-a",
      lastSyncedAt: 0,
      tables: [{ table: "books", primaryKey: "id" }],
    });

    await expect(
      runIncrementalSync({
        client: createEmptySupabaseClient() as any,
        userId: "user-a",
        lastSyncedAt: 0,
        tables: [{ table: "books", primaryKey: "id" }],
      }),
    ).rejects.toThrow("云同步正在进行中");

    releaseTombstones?.([]);
    await first;
  });

  it("does not publish active EPUB metadata when the local file is missing", async () => {
    invokeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "book-a",
          title: "Book A",
          author: "Author",
          format: "EPUB",
          file_path: "C:/missing/book-a.epub",
          file_size: 10,
          language: "en",
          created_at: 100,
          updated_at: 200,
          deleted_at: null,
        },
      ]);
    existsMock.mockResolvedValue(false);

    const order = vi.fn(async () => ({ data: [], error: null }));
    const gt = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ gt }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ select, upsert }));
    const upload = vi.fn(async () => ({ error: null }));

    await expect(
      runIncrementalSync({
        client: {
          from,
          storage: {
            from: vi.fn(() => ({ upload })),
          },
        } as any,
        userId: "user-a",
        lastSyncedAt: 0,
        tables: [{ table: "books", primaryKey: "id" }],
        epubCloudSyncEnabled: true,
      }),
    ).rejects.toThrow("EPUB 文件不存在");

    expect(upsert).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
});
