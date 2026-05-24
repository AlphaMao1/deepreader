import { tauriStorageKey } from "@/constants/tauri-storage";
import { createEncryptedStorage } from "@/lib/encrypted-storage";
import { tauriStorage } from "@/lib/tauri-storage";
import {
  DEFAULT_BOOK_FONT,
  DEFAULT_BOOK_LAYOUT,
  DEFAULT_BOOK_STYLE,
  DEFAULT_CJK_VIEW_SETTINGS,
  DEFAULT_READSETTINGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_VIEW_CONFIG,
  SYSTEM_SETTINGS_VERSION,
} from "@/services/constants";
import type { SystemSettings } from "@/types/settings";
import { isCJKEnv } from "@/utils/misc";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";

interface AppSettingsState {
  isSettingsDialogOpen: boolean;
  settings: SystemSettings;
  toggleSettingsDialog: () => void;
  setSettings: (settings: SystemSettings) => void;
  setTavilyApiKey: (apiKey: string) => void;
}

const createDefaultSettings = (): SystemSettings =>
  ({
    ...DEFAULT_SYSTEM_SETTINGS,
    version: SYSTEM_SETTINGS_VERSION,
    globalReadSettings: DEFAULT_READSETTINGS,
    globalViewSettings: {
      ...DEFAULT_BOOK_LAYOUT,
      ...DEFAULT_BOOK_STYLE,
      ...DEFAULT_BOOK_FONT,
      ...(isCJKEnv() ? DEFAULT_CJK_VIEW_SETTINGS : {}),
      ...DEFAULT_VIEW_CONFIG,
    },
  }) as SystemSettings;

export const useAppSettingsStore = create<AppSettingsState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        isSettingsDialogOpen: false,
        settings: createDefaultSettings(),
        toggleSettingsDialog: () => set((state) => ({ isSettingsDialogOpen: !state.isSettingsDialogOpen })),
        setSettings: (settings: SystemSettings) => set({ settings }),
        setTavilyApiKey: (apiKey: string) =>
          set((state) => ({
            settings: {
              ...state.settings,
              tavilyApiKey: apiKey,
            },
          })),
      }),
      {
        name: tauriStorageKey.appSettings,
        storage: createJSONStorage(() => createEncryptedStorage(tauriStorage)),
        partialize: (state) => ({
          settings: state.settings,
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<AppSettingsState> | undefined;
          const persistedSettings = persisted?.settings ?? ({} as Partial<SystemSettings>);
          const defaultSettings = createDefaultSettings();

          return {
            ...currentState,
            ...persisted,
            settings: {
              ...defaultSettings,
              ...persistedSettings,
              globalReadSettings: {
                ...defaultSettings.globalReadSettings,
                ...(persistedSettings.globalReadSettings ?? {}),
              },
              globalViewSettings: {
                ...defaultSettings.globalViewSettings,
                ...(persistedSettings.globalViewSettings ?? {}),
              },
            },
          };
        },
      },
    ),
  ),
);
