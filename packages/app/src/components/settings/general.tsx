import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useExportSettingsStore } from "@/store/export-settings-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { type SelectedModel, useProviderStore } from "@/store/provider-store";
import { useThemeStore } from "@/store/theme-store";
import type { ThemeMode } from "@/styles/themes";
import { getVersion } from "@tauri-apps/api/app";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { Check, ChevronDownIcon, Copy, Eye, EyeOff, FolderOpen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function GeneralSettings() {
  const [dataPath, setDataPath] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [showTavilyApiKey, setShowTavilyApiKey] = useState(false);

  const { themeMode, autoScroll, swapSidebars, setThemeMode, setAutoScroll, setSwapSidebars } = useThemeStore();
  const { settings, setSettings, setTavilyApiKey } = useAppSettingsStore();
  const { modelProviders, memoryExtractionModel, setMemoryExtractionModel } = useProviderStore();
  const { obsidianVaultPath, setObsidianVaultPath } = useExportSettingsStore();

  const availableModels = useMemo(() => {
    const models: Array<{
      modelId: string;
      providerId: string;
      providerName: string;
      modelName: string;
    }> = [];

    modelProviders.forEach((provider) => {
      if (!provider.active) return;

      provider.models.forEach((model) => {
        if (model.active) {
          models.push({
            modelId: model.id,
            providerId: provider.provider,
            providerName: provider.name,
            modelName: model.name || model.id,
          });
        }
      });
    });

    return models;
  }, [modelProviders]);

  const themeModeOptions = [
    { value: "auto" as ThemeMode, label: "跟随系统" },
    { value: "light" as ThemeMode, label: "浅色" },
    { value: "dark" as ThemeMode, label: "深色" },
  ];

  useEffect(() => {
    appDataDir().then(async (path) => {
      setDataPath(path);

      try {
        const appDataDirPath = await appDataDir();
        const directoryExists = await exists(appDataDirPath);

        if (!directoryExists) {
          await mkdir(appDataDirPath, { recursive: true });
        }
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });

    getVersion().then(setAppVersion).catch(console.error);
  }, []);

  const handleShowInFinder = async () => {
    try {
      await openPath(dataPath);
    } catch (error) {
      console.error("Failed to open data directory:", error);
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(dataPath);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const getCurrentThemeModeLabel = () => {
    return themeModeOptions.find((option) => option.value === themeMode)?.label || "跟随系统";
  };

  const handleSelectMemoryModel = (model: SelectedModel & { modelName: string }) => {
    setMemoryExtractionModel({
      modelId: model.modelId,
      providerId: model.providerId,
      providerName: model.providerName,
      modelName: model.modelName,
    });
  };

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">关于</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text dark:text-neutral-200">应用版本</span>
            <p className="text-neutral-600 text-xs dark:text-neutral-400">v{appVersion}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">外观</h2>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text dark:text-neutral-200">主题模式</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">选择你偏好的显示主题</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="w-32 justify-between">
                  {getCurrentThemeModeLabel()}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {themeModeOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => handleThemeModeChange(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">自动滚动</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">聊天时自动滚动到最新消息</p>
            </div>
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(checked === true)}
              className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">交换侧边栏</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">调整聊天和笔记侧边栏的位置</p>
            </div>
            <Checkbox
              checked={swapSidebars}
              onCheckedChange={(checked) => setSwapSidebars(checked === true)}
              className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">数据文件夹</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm dark:text-neutral-200">应用数据目录</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-background px-2 py-1 text-sm dark:bg-neutral-700 dark:text-neutral-300">
                  {dataPath}
                </span>
                <Button size="sm" variant="soft" onClick={handleCopyPath} className="size-6 p-0">
                  {isCopied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                </Button>
                <Button size="sm" variant="soft" onClick={handleShowInFinder} className="size-6 p-0">
                  <FolderOpen className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">Obsidian 知识库</h2>

        <div className="space-y-2">
          <span className="text-sm dark:text-neutral-200">知识库路径</span>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={obsidianVaultPath}
              onChange={(event) => setObsidianVaultPath(event.target.value)}
              placeholder="选择你的 Obsidian Vault 目录"
              className="h-8 flex-1 font-mono text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              onClick={async () => {
                const result = await openDialog({
                  directory: true,
                  multiple: false,
                  title: "选择 Obsidian 知识库目录",
                });
                if (typeof result === "string" && result.trim()) {
                  setObsidianVaultPath(result);
                }
              }}
            >
              <FolderOpen className="mr-1 h-3 w-3" />
              选择
            </Button>
            {obsidianVaultPath && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={() => setObsidianVaultPath("")}
                title="清除路径"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-neutral-500 text-xs dark:text-neutral-400">
            配置后，AI 可通过工具直接将笔记保存到此目录。划线整理生成的摘录也会自动保存到这里。
          </p>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">联网搜索</h2>

        <div className="space-y-2">
          <Label htmlFor="tavily-api-key" className="text-sm dark:text-neutral-200">
            Tavily API Key
          </Label>
          <div className="relative">
            <Input
              id="tavily-api-key"
              type={showTavilyApiKey ? "text" : "password"}
              value={settings.tavilyApiKey ?? ""}
              onChange={(event) => setTavilyApiKey(event.target.value)}
              placeholder="tvly-..."
              className="h-8 pr-10 font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6"
              onClick={() => setShowTavilyApiKey((value) => !value)}
            >
              {showTavilyApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-neutral-500 text-xs dark:text-neutral-400">
            用于启用 AI 的 Tavily 联网搜索能力。只有配置后才会注册 `webSearch` 工具。
          </p>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">记忆提取</h2>

        <div className="space-y-3">
          <div>
            <Label className="text-sm dark:text-neutral-200">提取模型</Label>
            <p className="mt-1 text-neutral-500 text-xs dark:text-neutral-400">
              用于后台自动提取对话中的持久化记忆。建议使用轻量、快速、成本较低的模型。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="min-w-[200px] justify-between gap-2">
                  <span className="truncate text-xs">
                    {memoryExtractionModel ? `${memoryExtractionModel.modelName}` : "未配置（自动记忆提取已关闭）"}
                  </span>
                  <ChevronDownIcon className="h-3 w-3 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="max-h-60 overflow-y-auto">
                  {availableModels.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground text-xs dark:text-neutral-400">
                      请先在“模型提供商”中配置模型
                    </div>
                  ) : (
                    (() => {
                      const grouped: Record<string, typeof availableModels> = {};
                      availableModels.forEach((model) => {
                        if (!grouped[model.providerId]) grouped[model.providerId] = [];
                        grouped[model.providerId].push(model);
                      });

                      return Object.entries(grouped).map(([providerId, models]) => (
                        <div key={providerId}>
                          <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs dark:text-neutral-400">
                            {models[0].providerName}
                          </div>
                          {models.map((model) => {
                            const isSelected =
                              memoryExtractionModel?.providerId === model.providerId &&
                              memoryExtractionModel?.modelId === model.modelId;

                            return (
                              <DropdownMenuItem
                                key={`${model.providerId}-${model.modelId}`}
                                className="cursor-pointer px-2 py-1.5 dark:hover:bg-neutral-700"
                                onClick={() => handleSelectMemoryModel(model)}
                              >
                                <span className="flex-1 truncate text-xs dark:text-neutral-200">{model.modelName}</span>
                                {isSelected && <Check className="h-3 w-3 flex-shrink-0 dark:text-neutral-200" />}
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                        </div>
                      ));
                    })()
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {memoryExtractionModel && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setMemoryExtractionModel(null)}
                title="清除配置"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <p className="text-neutral-500 text-xs dark:text-neutral-400">
            每 5 轮对话自动触发一次记忆提取。不配置该模型时不会自动提取，但 AI 仍可通过 `saveMemory`
            工具手动保存记忆。
          </p>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">隐私</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">匿名使用统计</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">
                帮助我们改进产品体验，不含任何个人数据
              </p>
            </div>
            <Checkbox
              checked={settings.telemetryEnabled ?? true}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  telemetryEnabled: checked === true,
                })
              }
              className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
