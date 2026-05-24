import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getAuthSnapshot,
  getSupabaseClient,
  hasSupabaseConfig,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/services/auth-service";
import {
  getCloudLastSyncedAt,
  shouldConfirmCloudSyncAccountBoundary,
  withCloudLastSyncedAt,
} from "@/services/cloud-sync-state";
import { downloadProviderConfigBackup, uploadProviderConfigBackup } from "@/services/cloud-config-service";
import { runFullSync, runIncrementalSync } from "@/services/sync-service";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLlamaStore } from "@/store/llama-store";
import { useProviderStore } from "@/store/provider-store";
import { ask } from "@tauri-apps/plugin-dialog";
import type { Session, User } from "@supabase/supabase-js";
import { Github, Loader2, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function CloudSyncSettings() {
  const { settings, setSettings } = useAppSettingsStore();
  const {
    modelProviders,
    selectedModel,
    memoryExtractionModel,
    setModelProviders,
    setSelectedModel,
    setMemoryExtractionModel,
  } = useProviderStore();
  const {
    vectorModels,
    selectedVectorModelId,
    vectorModelEnabled,
    setVectorModels,
    setSelectedVectorModelId,
    setVectorModelEnabled,
  } = useLlamaStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const config = useMemo(
    () => ({
      url: settings.supabaseUrl,
      anonKey: settings.supabaseAnonKey,
    }),
    [settings.supabaseAnonKey, settings.supabaseUrl],
  );

  const updateSettings = (updates: Partial<typeof settings>) => {
    const latest = useAppSettingsStore.getState().settings;
    setSettings({ ...latest, ...updates });
  };

  useEffect(() => {
    if (!hasSupabaseConfig(config)) {
      setSession(null);
      setUser(null);
      return;
    }

    getAuthSnapshot(config)
      .then((snapshot) => {
        setSession(snapshot.session);
        setUser(snapshot.user);
      })
      .catch(() => {
        setSession(null);
        setUser(null);
      });
  }, [config]);

  const handlePasswordLogin = async () => {
    setBusy("login");
    try {
      const data = await signInWithPassword(config, email.trim(), password);
      setSession(data.session);
      setUser(data.user);
      updateSettings({ cloudSyncEnabled: true });
      toast.success("已登录，云同步已开启");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setBusy(null);
    }
  };

  const handleRegister = async () => {
    setBusy("register");
    try {
      const data = await signUpWithPassword(config, email.trim(), password);
      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session && data.user) {
        updateSettings({ cloudSyncEnabled: true });
        toast.success(`已注册并登录。恢复密钥已生成：${data.recoveryKey}`);
      } else {
        updateSettings({ cloudSyncEnabled: false });
        toast.success(`注册请求已提交，请完成邮箱验证后登录。恢复密钥已生成：${data.recoveryKey}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setBusy(null);
    }
  };

  const handleLogout = async () => {
    setBusy("logout");
    try {
      await signOut(config);
      setSession(null);
      setUser(null);
      toast.success("已退出登录");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出失败");
    } finally {
      setBusy(null);
    }
  };

  const confirmAccountBoundary = async () => {
    const currentSettings = useAppSettingsStore.getState().settings;
    if (!user || !shouldConfirmCloudSyncAccountBoundary(currentSettings, user.id)) return true;

    let confirmed = false;
    try {
      confirmed = await ask(
        "这是本机首次使用当前云账号同步。本地资料库会作为本机数据参与同步；如果你希望使用一个空资料库，请先切换到新的本地数据目录或应用配置。\n\n是否继续同步？",
        {
          title: "确认同步账号",
          kind: "warning",
        },
      );
    } catch (error) {
      console.error("Confirm cloud sync account boundary failed:", error);
      toast.error("无法打开同步确认，请稍后重试");
      return false;
    }

    if (!confirmed) {
      toast.info("已取消同步");
    }

    return confirmed;
  };

  const handleSyncNow = async () => {
    if (!user) return;
    if (!(await confirmAccountBoundary())) return;
    setBusy("sync");
    try {
      const currentSettings = useAppSettingsStore.getState().settings;
      const result = await runIncrementalSync({
        client: getSupabaseClient(config),
        userId: user.id,
        lastSyncedAt: getCloudLastSyncedAt(currentSettings, user.id),
        epubCloudSyncEnabled: currentSettings.epubCloudSyncEnabled,
      });
      const latest = useAppSettingsStore.getState().settings;
      updateSettings({ ...withCloudLastSyncedAt(latest, user.id, result.syncedAt), cloudSyncEnabled: true });
      toast.success(
        `同步完成：上传 ${result.uploaded} 条，下载 ${result.downloaded} 条，文件上传 ${result.uploadedFiles} 个，文件下载 ${result.downloadedFiles} 个`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setBusy(null);
    }
  };

  const handleFullSyncNow = async () => {
    if (!user) return;
    if (!(await confirmAccountBoundary())) return;
    setBusy("full-sync");
    try {
      const currentSettings = useAppSettingsStore.getState().settings;
      const result = await runFullSync({
        client: getSupabaseClient(config),
        userId: user.id,
        epubCloudSyncEnabled: currentSettings.epubCloudSyncEnabled,
      });
      const latest = useAppSettingsStore.getState().settings;
      updateSettings({ ...withCloudLastSyncedAt(latest, user.id, result.syncedAt), cloudSyncEnabled: true });
      toast.success(
        `全量同步完成：上传 ${result.uploaded} 条，下载 ${result.downloaded} 条，文件上传 ${result.uploadedFiles} 个，文件下载 ${result.downloadedFiles} 个`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "全量同步失败");
    } finally {
      setBusy(null);
    }
  };

  const handleBackupProviderConfig = async () => {
    if (!user || !recoveryKey.trim()) return;
    setBusy("config-backup");
    try {
      await uploadProviderConfigBackup(getSupabaseClient(config), user.id, recoveryKey.trim(), {
        modelProviders,
        selectedModel,
        memoryExtractionModel,
        vectorModels,
        selectedVectorModelId,
        vectorModelEnabled,
      });
      toast.success("模型配置已加密备份到云端");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "配置备份失败");
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreProviderConfig = async () => {
    if (!user || !recoveryKey.trim()) return;
    setBusy("config-restore");
    try {
      const backup = await downloadProviderConfigBackup(getSupabaseClient(config), user.id, recoveryKey.trim());
      setModelProviders(backup.modelProviders);
      setSelectedModel(backup.selectedModel);
      setMemoryExtractionModel(backup.memoryExtractionModel);
      setVectorModels(backup.vectorModels);
      setSelectedVectorModelId(backup.selectedVectorModelId);
      setVectorModelEnabled(backup.vectorModelEnabled);
      toast.success("模型配置已恢复");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "配置恢复失败");
    } finally {
      setBusy(null);
    }
  };

  const configured = hasSupabaseConfig(config);
  const hasCredentials = Boolean(email.trim() && password);
  const currentUserLastSyncedAt = user ? getCloudLastSyncedAt(settings, user.id) : 0;
  const needsAccountBoundaryConfirmation = user
    ? shouldConfirmCloudSyncAccountBoundary(settings, user.id)
    : false;
  const isBusy = busy !== null;

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">账号</h2>
        {session && user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm dark:text-neutral-200">{user.email ?? user.id}</span>
                <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">
                  上次同步：
                  {currentUserLastSyncedAt ? new Date(currentUserLastSyncedAt).toLocaleString() : "尚未同步"}
                </p>
                {needsAccountBoundaryConfirmation && (
                  <p className="mt-2 text-amber-700 text-xs dark:text-amber-300">
                    检测到本机曾同步过其他云账号。首次同步当前账号前需要确认，本地资料库会参与合并。
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={handleLogout} disabled={isBusy}>
                <LogOut className="mr-1 h-3 w-3" />
                退出
              </Button>
            </div>
            <Button size="sm" onClick={handleSyncNow} disabled={isBusy}>
              {busy === "sync" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              立即同步
            </Button>
            <Button size="sm" variant="outline" onClick={handleFullSyncNow} disabled={isBusy}>
              {busy === "full-sync" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              全量同步
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sync-email">邮箱</Label>
                <Input id="sync-email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-password">密码</Label>
                <Input
                  id="sync-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            {!configured && (
              <p className="text-amber-700 text-xs dark:text-amber-300">
                请先在下方 Supabase 区域填写 URL 和 anon key，填写后登录/注册按钮会自动变亮。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handlePasswordLogin}
                disabled={!configured || !hasCredentials || isBusy}
              >
                {busy === "login" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                登录
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegister}
                disabled={!configured || !hasCredentials || isBusy}
              >
                注册
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled
                title="GitHub OAuth 回调尚未接入，M1 先使用邮箱登录"
              >
                <Github className="mr-1 h-3 w-3" />
                GitHub 稍后支持
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">同步</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm dark:text-neutral-200">云同步</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">
                书籍元数据、进度、笔记、标签、记忆和技能库
              </p>
            </div>
            <Switch
              checked={settings.cloudSyncEnabled}
              onCheckedChange={(checked) => updateSettings({ cloudSyncEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm dark:text-neutral-200">EPUB 文件云同步</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">默认关闭，单文件建议不超过 50MB</p>
            </div>
            <Switch
              checked={settings.epubCloudSyncEnabled}
              onCheckedChange={(checked) => updateSettings({ epubCloudSyncEnabled: checked })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">恢复密钥</h2>
        <div className="space-y-3">
          <p className="text-neutral-600 text-xs dark:text-neutral-400">
            Recovery Key 只用于加密备份和恢复模型供应商/远程 embeddings 配置与 API Key，不恢复书籍、阅读进度或登录会话。
          </p>
          <div className="space-y-2">
            <Label htmlFor="recovery-key">Recovery Key</Label>
            <Input
              id="recovery-key"
              type="password"
              value={recoveryKey}
              onChange={(event) => setRecoveryKey(event.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBackupProviderConfig}
              disabled={!user || !recoveryKey.trim() || isBusy}
            >
              {busy === "config-backup" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              备份模型配置
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestoreProviderConfig}
              disabled={!user || !recoveryKey.trim() || isBusy}
            >
              {busy === "config-restore" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              恢复模型配置
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">Supabase</h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">URL</Label>
            <Input
              id="supabase-url"
              value={settings.supabaseUrl}
              onChange={(event) => updateSettings({ supabaseUrl: event.target.value })}
              placeholder="https://project.supabase.co"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabase-anon-key">anon key</Label>
            <Input
              id="supabase-anon-key"
              type="password"
              value={settings.supabaseAnonKey}
              onChange={(event) => updateSettings({ supabaseAnonKey: event.target.value })}
              className="font-mono"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
