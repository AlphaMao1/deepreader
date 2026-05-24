import { type Session, type SupabaseClient, type User, createClient } from "@supabase/supabase-js";
import { createEncryptedStorage } from "@/lib/encrypted-storage";
import { immediateTauriStorage } from "@/lib/tauri-storage";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
}

export interface AuthStateSnapshot {
  session: Session | null;
  user: User | null;
}

const defaultUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const defaultAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

const authStorage = createEncryptedStorage(immediateTauriStorage);

const getAuthStorageKey = (url: string): string => {
  try {
    return `supabase-auth-${new URL(url).host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  } catch {
    return "supabase-auth";
  }
};

const generateRecoveryKey = (): string => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "");
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const hasSupabaseConfig = (config: SupabaseConfig): boolean => {
  return Boolean((config.url || defaultUrl)?.trim() && (config.anonKey || defaultAnonKey)?.trim());
};

export const getSupabaseClient = (config: SupabaseConfig): SupabaseClient => {
  const url = (config.url || defaultUrl || "").trim();
  const anonKey = (config.anonKey || defaultAnonKey || "").trim();
  const cacheKey = `${url}::${anonKey}`;

  if (!url || !anonKey) {
    throw new Error("Supabase URL 和 anon key 尚未配置");
  }

  if (!cachedClient || cachedKey !== cacheKey) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: authStorage,
        storageKey: getAuthStorageKey(url),
      },
    });
    cachedKey = cacheKey;
  }

  return cachedClient;
};

export const getAuthSnapshot = async (config: SupabaseConfig): Promise<AuthStateSnapshot> => {
  const client = getSupabaseClient(config);
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return { session: data.session, user: data.session?.user ?? null };
};

export const signInWithPassword = async (config: SupabaseConfig, email: string, password: string) => {
  const client = getSupabaseClient(config);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUpWithPassword = async (config: SupabaseConfig, email: string, password: string) => {
  const client = getSupabaseClient(config);
  const recoveryKey = generateRecoveryKey();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { recovery_key_hint: recoveryKey.slice(-6) },
    },
  });
  if (error) throw error;
  return { ...data, recoveryKey };
};

export const signInWithGithub = async (config: SupabaseConfig) => {
  const client = getSupabaseClient(config);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) {
    throw new Error("GitHub 登录地址生成失败，请确认 Supabase 已启用 GitHub Provider");
  }
  await openUrl(data.url);
  return data;
};

export const signOut = async (config: SupabaseConfig) => {
  const client = getSupabaseClient(config);
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
