import { getAuthSnapshot } from "@/services/auth-service";
import {
  getCloudLastSyncedAt,
  shouldConfirmCloudSyncAccountBoundary,
  withCloudLastSyncedAt,
} from "@/services/cloud-sync-state";
import { runIncrementalSync } from "@/services/sync-service";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useSyncScheduler() {
  const runningRef = useRef(false);
  const accountBoundaryWarningRef = useRef<string | null>(null);
  const { settings, setSettings } = useAppSettingsStore();

  useEffect(() => {
    if (!settings.cloudSyncEnabled) return;
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) return;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const currentSettings = useAppSettingsStore.getState().settings;
        if (!currentSettings.cloudSyncEnabled) return;
        if (!currentSettings.supabaseUrl || !currentSettings.supabaseAnonKey) return;

        const auth = await getAuthSnapshot({
          url: currentSettings.supabaseUrl,
          anonKey: currentSettings.supabaseAnonKey,
        });
        if (!auth.user) return;
        if (shouldConfirmCloudSyncAccountBoundary(currentSettings, auth.user.id)) {
          if (accountBoundaryWarningRef.current !== auth.user.id) {
            accountBoundaryWarningRef.current = auth.user.id;
            toast.warning("当前云账号需要先在设置中手动确认同步，后台云同步已暂停");
          }
          return;
        }
        accountBoundaryWarningRef.current = null;

        const result = await runIncrementalSync({
          client: (await import("@/services/auth-service")).getSupabaseClient({
            url: currentSettings.supabaseUrl,
            anonKey: currentSettings.supabaseAnonKey,
          }),
          userId: auth.user.id,
          lastSyncedAt: getCloudLastSyncedAt(currentSettings, auth.user.id),
          epubCloudSyncEnabled: currentSettings.epubCloudSyncEnabled,
        });

        const latest = useAppSettingsStore.getState().settings;
        setSettings({
          ...latest,
          ...withCloudLastSyncedAt(latest, auth.user.id, result.syncedAt),
        });
      } catch (error) {
        console.warn("Cloud sync skipped:", error);
      } finally {
        runningRef.current = false;
      }
    };

    void run();
    const interval = window.setInterval(run, Math.max(settings.syncIntervalSeconds || 30, 10) * 1000);
    return () => window.clearInterval(interval);
  }, [
    settings.cloudSyncEnabled,
    settings.epubCloudSyncEnabled,
    settings.supabaseAnonKey,
    settings.supabaseUrl,
    settings.syncIntervalSeconds,
    setSettings,
  ]);
}
