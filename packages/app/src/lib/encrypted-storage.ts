import { invoke } from "@tauri-apps/api/core";
import type { StateStorage } from "zustand/middleware";

interface EncryptedStoragePayload {
  version: number;
  nonce: string;
  ciphertext: string;
}

const hasTauriApis = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isEncryptedStoragePayload = (value: string | null): boolean => {
  if (!value) return false;

  try {
    const parsed = JSON.parse(value) as Partial<EncryptedStoragePayload>;
    return parsed.version === 1 && typeof parsed.nonce === "string" && typeof parsed.ciphertext === "string";
  } catch {
    return false;
  }
};

export const encryptStorageValue = async (value: string): Promise<string> => {
  if (!hasTauriApis()) return value;
  return await invoke<string>("encrypt_secret_payload", { plaintext: value });
};

export const decryptStorageValue = async (value: string): Promise<string> => {
  if (!hasTauriApis() || !isEncryptedStoragePayload(value)) return value;
  return await invoke<string>("decrypt_secret_payload", { payload: value });
};

export const createEncryptedStorage = (storage: StateStorage): StateStorage => ({
  getItem: async (name) => {
    const value = await storage.getItem(name);
    if (!value) return null;

    try {
      return await decryptStorageValue(value);
    } catch (error) {
      console.error(`Encrypted storage getItem error for ${name}:`, error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await storage.setItem(name, await encryptStorageValue(value));
    } catch (error) {
      console.error(`Encrypted storage setItem error for ${name}:`, error);
    }
  },
  removeItem: async (name) => {
    await storage.removeItem(name);
  },
});
