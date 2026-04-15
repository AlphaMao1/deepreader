import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

type TimingLevel = "info" | "error";

const MAX_LOG_CHARS = 200_000;

let timingLogPathPromise: Promise<string> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

const hasTauriApis = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const getTimingLogPath = async () => {
  if (!timingLogPathPromise) {
    timingLogPathPromise = (async () => {
      const baseDir = await appDataDir();
      const logDir = `${baseDir}/logs`;

      if (!(await exists(logDir))) {
        await mkdir(logDir, { recursive: true });
      }

      return `${logDir}/chat-timing.log`;
    })();
  }

  return await timingLogPathPromise;
};

const normalizeLogContent = (content: string) => {
  if (content.length <= MAX_LOG_CHARS) {
    return content;
  }

  const tail = content.slice(-MAX_LOG_CHARS);
  const firstLineBreak = tail.indexOf("\n");
  return firstLineBreak >= 0 ? tail.slice(firstLineBreak + 1) : tail;
};

const serializePayload = (payload: Record<string, unknown>) =>
  JSON.stringify(payload, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    return value;
  });

const appendTimingLine = async (line: string) => {
  if (!hasTauriApis()) {
    return;
  }

  const filePath = await getTimingLogPath();
  const current = (await exists(filePath)) ? await readTextFile(filePath) : "";
  await writeTextFile(filePath, normalizeLogContent(`${current}${line}`));
};

export const logTimingEvent = (level: TimingLevel, event: string, payload: Record<string, unknown>) => {
  if (level === "error") {
    console.error(event, payload);
  } else {
    console.info(event, payload);
  }

  const line = `${serializePayload({
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  })}\n`;

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await appendTimingLine(line);
      } catch (error) {
        console.error("[TimingLog] persist_failed", {
          event,
          error,
        });
      }
    });
};

export const logTimingInfo = (event: string, payload: Record<string, unknown>) => {
  logTimingEvent("info", event, payload);
};

export const logTimingError = (event: string, payload: Record<string, unknown>) => {
  logTimingEvent("error", event, payload);
};
