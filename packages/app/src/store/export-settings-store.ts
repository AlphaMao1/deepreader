import { tauriStorage } from "@/lib/tauri-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ExportSettingsState {
  obsidianVaultPath: string;
  setObsidianVaultPath: (path: string) => void;
}

export const useExportSettingsStore = create<ExportSettingsState>()(
  persist(
    (set) => ({
      obsidianVaultPath: "",
      setObsidianVaultPath: (path) => set({ obsidianVaultPath: path }),
    }),
    {
      name: "export-settings",
      storage: createJSONStorage(() => tauriStorage),
    },
  ),
);
