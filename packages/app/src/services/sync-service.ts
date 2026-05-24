import type { SupabaseClient } from "@supabase/supabase-js";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";

export type SyncRow = Record<string, unknown> & {
  updated_at?: number | string;
  deleted_at?: number | string | null;
};

export interface LwwResolution<T extends SyncRow> {
  uploadRows: T[];
  applyRemoteRows: T[];
}

export interface SyncTableConfig {
  table: string;
  primaryKey: string;
}

export interface SyncRunOptions {
  client: SupabaseClient;
  userId: string;
  lastSyncedAt: number;
  tables?: SyncTableConfig[];
  epubCloudSyncEnabled?: boolean;
}

export interface SyncRunResult {
  syncedAt: number;
  uploaded: number;
  downloaded: number;
  uploadedFiles: number;
  downloadedFiles: number;
}

let syncRunInFlight: Promise<SyncRunResult> | null = null;

interface TombstoneRow {
  table: string;
  row: SyncRow;
}

const describeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return String(
      value.message ?? value.error_description ?? value.details ?? value.hint ?? value.code ?? JSON.stringify(value),
    );
  }
  return "未知错误";
};

const EPUB_STORAGE_BUCKET = "epubs";

const getStringField = (row: SyncRow, key: string): string => {
  const value = row[key];
  return typeof value === "string" ? value : "";
};

const isEpubFormat = (row: SyncRow): boolean => getStringField(row, "format").toUpperCase() === "EPUB";

const getSafePathSegment = (value: string, fallback: string): string => {
  const reservedWindowsName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
  const safe = value
    .split(/[\\/]/)
    .pop()
    ?.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim();
  if (!safe || safe === "." || safe === ".." || reservedWindowsName.test(safe)) return fallback;
  return safe;
};

const getSafeBookId = (row: SyncRow): string => getSafePathSegment(getStringField(row, "id"), "book");

const getSafeEpubFileName = (row: SyncRow): string => {
  const fileName = getSafePathSegment(getStringField(row, "file_path"), "book.epub");
  return fileName.toLowerCase().endsWith(".epub") ? fileName : `${fileName}.epub`;
};

export const isActiveEpubBookRow = (row: SyncRow): boolean => {
  return getStringField(row, "id") !== "" && getStringField(row, "file_path") !== "" && row.deleted_at == null;
};

export const getEpubStoragePath = (userId: string, row: SyncRow): string => {
  return `${userId}/${getSafeBookId(row)}/${getSafeEpubFileName(row)}`;
};

export const getSafeLocalBookFilePath = (row: SyncRow): string => {
  return `books/${getSafeBookId(row)}/${getSafeEpubFileName(row)}`;
};

export const normalizeRemoteBookRow = <T extends SyncRow>(row: T): T => {
  if (!isEpubFormat(row)) return row;
  return { ...row, file_path: getSafeLocalBookFilePath(row) };
};

const getLocalBookPath = async (row: SyncRow): Promise<string> => {
  const filePath = getStringField(row, "file_path");
  if (/^(?:[a-z]:)?[\\/]/i.test(filePath)) return filePath;
  return await join(await appDataDir(), filePath);
};

const ensureParentDirectory = async (filePath: string): Promise<void> => {
  const normalized = filePath.replace(/\\/g, "/");
  const parent = normalized.slice(0, normalized.lastIndexOf("/"));
  if (parent) {
    await mkdir(parent, { recursive: true });
  }
};

const uploadEpubFiles = async (client: SupabaseClient, userId: string, rows: SyncRow[]): Promise<number> => {
  let uploadedFiles = 0;
  for (const row of rows) {
    if (!isActiveEpubBookRow(row) || !isEpubFormat(row)) continue;

    const localPath = await getLocalBookPath(row);
    if (!(await exists(localPath))) {
      throw new Error(`EPUB 文件不存在，已跳过云端 metadata 发布: ${localPath}`);
    }

    const bytes = await readFile(localPath);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const { error } = await client.storage
      .from(EPUB_STORAGE_BUCKET)
      .upload(getEpubStoragePath(userId, row), new Blob([body], { type: "application/epub+zip" }), {
        upsert: true,
        contentType: "application/epub+zip",
      });

    if (error) throw new Error(`EPUB 文件上传失败: ${describeError(error)}`);
    uploadedFiles += 1;
  }
  return uploadedFiles;
};

const downloadEpubFiles = async (client: SupabaseClient, userId: string, rows: SyncRow[]): Promise<number> => {
  let downloadedFiles = 0;
  for (const row of rows) {
    if (!isActiveEpubBookRow(row) || !isEpubFormat(row)) continue;
    const safeRow = normalizeRemoteBookRow(row);

    const localPath = await getLocalBookPath(safeRow);
    if (await exists(localPath)) continue;

    const { data, error } = await client.storage.from(EPUB_STORAGE_BUCKET).download(getEpubStoragePath(userId, row));
    if (error) throw new Error(`EPUB 文件下载失败: ${describeError(error)}`);

    await ensureParentDirectory(localPath);
    await writeFile(localPath, new Uint8Array(await data.arrayBuffer()));
    downloadedFiles += 1;
  }
  return downloadedFiles;
};

export const SYNC_TABLES: SyncTableConfig[] = [
  { table: "books", primaryKey: "id" },
  { table: "book_status", primaryKey: "book_id" },
  { table: "book_notes", primaryKey: "id" },
  { table: "notes", primaryKey: "id" },
  { table: "tags", primaryKey: "id" },
  { table: "skills", primaryKey: "id" },
  { table: "user_memories", primaryKey: "id" },
  { table: "reading_sessions", primaryKey: "id" },
];

const toTimestamp = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const date = Date.parse(value);
    if (Number.isFinite(date)) return date;
  }
  return 0;
};

export const resolveLwwRows = <T extends SyncRow>(
  localRows: T[],
  remoteRows: T[],
  primaryKey: string,
): LwwResolution<T> => {
  const remoteById = new Map(remoteRows.map((row) => [row[primaryKey], row]));
  const localById = new Map(localRows.map((row) => [row[primaryKey], row]));

  const uploadRows = localRows.filter((localRow) => {
    const remoteRow = remoteById.get(localRow[primaryKey]);
    return !remoteRow || toTimestamp(localRow.updated_at) >= toTimestamp(remoteRow.updated_at);
  });

  const applyRemoteRows = remoteRows.filter((remoteRow) => {
    const localRow = localById.get(remoteRow[primaryKey]);
    return !localRow || toTimestamp(remoteRow.updated_at) > toTimestamp(localRow.updated_at);
  });

  return { uploadRows, applyRemoteRows };
};

export const fetchLocalChanges = async (table: string, timestamp: number): Promise<SyncRow[]> => {
  return await invoke<SyncRow[]>("get_changed_since", { table, timestamp });
};

export const fetchLocalTombstones = async (timestamp: number): Promise<TombstoneRow[]> => {
  return await invoke<TombstoneRow[]>("get_tombstones_since", { timestamp });
};

export const fetchRemoteChanges = async (
  client: SupabaseClient,
  table: string,
  userId: string,
  timestamp: number,
): Promise<SyncRow[]> => {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", timestamp)
    .order("updated_at", { ascending: true });

  if (error) throw new Error(`${table} 远端查询失败: ${describeError(error)}`);
  return (data ?? []) as SyncRow[];
};

const runIncrementalSyncUnsafe = async ({
  client,
  userId,
  lastSyncedAt,
  tables = SYNC_TABLES,
  epubCloudSyncEnabled = false,
}: SyncRunOptions): Promise<SyncRunResult> => {
  const syncStartedAt = Date.now();
  const nextCursor = Math.max(0, syncStartedAt - 1);
  let uploaded = 0;
  let downloaded = 0;
  let uploadedFiles = 0;
  let downloadedFiles = 0;
  const tombstones = await fetchLocalTombstones(lastSyncedAt);

  for (const tableConfig of tables) {
    const tableTombstones = tombstones
      .filter((tombstone) => tombstone.table === tableConfig.table)
      .map((tombstone) => tombstone.row);
    const [localRows, remoteRows] = await Promise.all([
      fetchLocalChanges(tableConfig.table, lastSyncedAt),
      fetchRemoteChanges(client, tableConfig.table, userId, lastSyncedAt),
    ]);

    const { uploadRows, applyRemoteRows } = resolveLwwRows(
      [...localRows, ...tableTombstones],
      remoteRows,
      tableConfig.primaryKey,
    );

    if (uploadRows.length > 0) {
      if (tableConfig.table === "books" && epubCloudSyncEnabled) {
        uploadedFiles += await uploadEpubFiles(client, userId, uploadRows);
      }

      const rowsWithUser = uploadRows.map((row) => ({ ...row, user_id: userId, sync_status: "synced" }));
      const { error } = await client.from(tableConfig.table).upsert(rowsWithUser, {
        onConflict: `user_id,${tableConfig.primaryKey}`,
      });
      if (error) throw new Error(`${tableConfig.table} 上传失败: ${describeError(error)}`);

      await invoke("mark_synced", {
        table: tableConfig.table,
        rows: uploadRows,
      });
      uploaded += uploadRows.length;
    }

    if (applyRemoteRows.length > 0) {
      if (tableConfig.table === "books" && epubCloudSyncEnabled) {
        downloadedFiles += await downloadEpubFiles(client, userId, applyRemoteRows);
      }

      await invoke("bulk_upsert", {
        table: tableConfig.table,
        rows: applyRemoteRows.map(({ user_id: _userId, ...row }) => ({
          ...(tableConfig.table === "books" ? normalizeRemoteBookRow(row) : row),
          sync_status: "synced",
        })),
      }).catch((error) => {
        throw new Error(`${tableConfig.table} 写入本地失败: ${describeError(error)}`);
      });
      downloaded += applyRemoteRows.length;
    }

    if (tableConfig.table === "books" && epubCloudSyncEnabled && remoteRows.length > 0) {
      downloadedFiles += await downloadEpubFiles(client, userId, remoteRows);
    }
  }

  return {
    syncedAt: nextCursor,
    uploaded,
    downloaded,
    uploadedFiles,
    downloadedFiles,
  };
};

export const runIncrementalSync = async (options: SyncRunOptions): Promise<SyncRunResult> => {
  if (syncRunInFlight) {
    throw new Error("云同步正在进行中，请稍后再试");
  }

  syncRunInFlight = runIncrementalSyncUnsafe(options);
  try {
    return await syncRunInFlight;
  } finally {
    syncRunInFlight = null;
  }
};

export const runFullSync = async (options: Omit<SyncRunOptions, "lastSyncedAt">): Promise<SyncRunResult> => {
  return runIncrementalSync({ ...options, lastSyncedAt: 0 });
};
