import { createEncryptedStorage } from "@/lib/encrypted-storage";
import { tauriStorage } from "@/lib/tauri-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export interface TTSConfig {
  apiKey: string;
  voice: string;
  languageType: string;
}

interface TTSStore {
  config: TTSConfig;
  setApiKey: (apiKey: string) => void;
  setVoice: (voice: string) => void;
  setLanguageType: (languageType: string) => void;
  setConfig: (config: Partial<TTSConfig>) => void;
}

const legacyTtsStorage: StateStorage = {
  getItem: async (name) => {
    const current = await tauriStorage.getItem(name);
    if (current) return current;

    if (typeof window === "undefined") return null;
    return localStorage.getItem(name) ?? localStorage.getItem(`deepreader:${name}`);
  },
  setItem: async (name, value) => {
    await tauriStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    await tauriStorage.removeItem(name);
    if (typeof window !== "undefined") {
      localStorage.removeItem(name);
      localStorage.removeItem(`deepreader:${name}`);
    }
  },
};

export const useTTSStore = create<TTSStore>()(
  persist(
    (set) => ({
      config: {
        apiKey: "",
        voice: "Cherry",
        languageType: "Chinese",
      },
      setApiKey: (apiKey) =>
        set((state) => ({
          config: { ...state.config, apiKey },
        })),
      setVoice: (voice) =>
        set((state) => ({
          config: { ...state.config, voice },
        })),
      setLanguageType: (languageType) =>
        set((state) => ({
          config: { ...state.config, languageType },
        })),
      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),
    }),
    {
      name: "tts-config-storage",
      storage: createJSONStorage(() => createEncryptedStorage(legacyTtsStorage)),
    },
  ),
);
