import { describe, expect, it } from "vitest";
import type { SystemSettings } from "@/types/settings";
import {
  getCloudLastSyncedAt,
  shouldConfirmCloudSyncAccountBoundary,
  withCloudLastSyncedAt,
} from "./cloud-sync-state";

const makeSettings = (overrides: Partial<SystemSettings> = {}) =>
  ({
    lastSyncedAtCloud: 999,
    cloudSyncStateByUserId: {},
    ...overrides,
  }) as SystemSettings;

describe("cloud sync account state", () => {
  it("does not reuse the legacy global cursor for a new account", () => {
    expect(getCloudLastSyncedAt(makeSettings(), "user-b")).toBe(0);
  });

  it("preserves separate cursors for different accounts", () => {
    const first = makeSettings({
      cloudSyncStateByUserId: {
        "user-a": { lastSyncedAt: 100 },
      },
    });

    const patch = withCloudLastSyncedAt(first, "user-b", 200);
    const next = { ...first, ...patch };

    expect(getCloudLastSyncedAt(next, "user-a")).toBe(100);
    expect(getCloudLastSyncedAt(next, "user-b")).toBe(200);
  });

  it("preserves existing per-account sync state fields when updating the cursor", () => {
    const first = makeSettings({
      cloudSyncStateByUserId: {
        "user-a": { lastSyncedAt: 100, confirmedAt: 123 } as any,
      },
    });

    const patch = withCloudLastSyncedAt(first, "user-a", 200);

    expect((patch.cloudSyncStateByUserId?.["user-a"] as any).confirmedAt).toBe(123);
    expect(patch.cloudSyncStateByUserId?.["user-a"].lastSyncedAt).toBe(200);
  });

  it("requires explicit confirmation before a new account syncs an existing local library", () => {
    const settings = makeSettings({
      lastSyncedAtCloud: 100,
      cloudSyncStateByUserId: {
        "user-a": { lastSyncedAt: 100 },
      },
    });

    expect(shouldConfirmCloudSyncAccountBoundary(settings, "user-b")).toBe(true);
    expect(shouldConfirmCloudSyncAccountBoundary(settings, "user-a")).toBe(false);
  });

  it("treats a legacy global cursor as unknown account history", () => {
    expect(shouldConfirmCloudSyncAccountBoundary(makeSettings({ lastSyncedAtCloud: 100 }), "user-b")).toBe(true);
  });
});
