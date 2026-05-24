import type { SupabaseClient } from "@supabase/supabase-js";
import type { SelectedModel } from "@/store/provider-store";
import type { VectorModelConfig } from "@/store/llama-store";

interface ProviderConfigBackup {
  modelProviders: ModelProvider[];
  selectedModel: SelectedModel | null;
  memoryExtractionModel: SelectedModel | null;
  vectorModels: VectorModelConfig[];
  selectedVectorModelId: string | null;
  vectorModelEnabled: boolean;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BASE64_CHUNK_SIZE = 0x8000;

export const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
};
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (isRecord(error)) {
    return String(
      error.message ?? error.error_description ?? error.details ?? error.hint ?? error.code ?? JSON.stringify(error),
    );
  }
  return "未知错误";
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const isModel = (value: unknown): value is Model => {
  if (!isRecord(value) || typeof value.id !== "string") return false;
  if (value.name !== undefined && typeof value.name !== "string") return false;
  if (value.active !== undefined && typeof value.active !== "boolean") return false;
  if (value.description !== undefined && typeof value.description !== "string") return false;
  if (value.capabilities !== undefined && !isStringArray(value.capabilities)) return false;
  if (value.manual !== undefined && typeof value.manual !== "boolean") return false;
  return true;
};

const isModelProvider = (value: unknown): value is ModelProvider => {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string" || typeof value.active !== "boolean" || typeof value.provider !== "string") {
    return false;
  }
  if (!Array.isArray(value.models) || !value.models.every(isModel)) return false;
  for (const key of ["exploreModelsUrl", "apiKey", "apiKeyHelpUrl", "baseUrl", "baseUrlHelpUrl"]) {
    if (value[key] !== undefined && typeof value[key] !== "string") return false;
  }
  return true;
};

const isSelectedModel = (value: unknown): value is SelectedModel | null => {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.modelId === "string" &&
    typeof value.providerId === "string" &&
    typeof value.providerName === "string" &&
    typeof value.modelName === "string"
  );
};

const selectedModelExists = (modelProviders: ModelProvider[], selectedModel: SelectedModel | null): boolean => {
  if (!selectedModel) return true;
  const provider = modelProviders.find((item) => item.provider === selectedModel.providerId);
  if (!provider) return false;
  if (provider.models.length === 0) return true;
  return provider.models.some((model) => model.id === selectedModel.modelId);
};

const isVectorModelConfig = (value: unknown): value is VectorModelConfig => {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.url !== "string" ||
    typeof value.modelId !== "string" ||
    typeof value.apiKey !== "string"
  ) {
    return false;
  }
  if (value.description !== undefined && typeof value.description !== "string") return false;
  if (value.dimension !== undefined && typeof value.dimension !== "number") return false;
  return true;
};

export const parseProviderConfigBackup = (plaintext: string): ProviderConfigBackup => {
  const parsed = JSON.parse(plaintext) as unknown;
  if (!isRecord(parsed)) throw new Error("云端模型配置格式无效");
  if (!Array.isArray(parsed.modelProviders) || !parsed.modelProviders.every(isModelProvider)) {
    throw new Error("云端模型供应商配置格式无效");
  }
  if (!isSelectedModel(parsed.selectedModel) || !isSelectedModel(parsed.memoryExtractionModel)) {
    throw new Error("云端模型选择配置格式无效");
  }
  if (
    !selectedModelExists(parsed.modelProviders, parsed.selectedModel) ||
    !selectedModelExists(parsed.modelProviders, parsed.memoryExtractionModel)
  ) {
    throw new Error("云端模型选择不存在");
  }
  if (parsed.vectorModels !== undefined) {
    if (!Array.isArray(parsed.vectorModels) || !parsed.vectorModels.every(isVectorModelConfig)) {
      throw new Error("云端向量模型配置格式无效");
    }
  }
  if (parsed.selectedVectorModelId !== undefined && parsed.selectedVectorModelId !== null) {
    if (typeof parsed.selectedVectorModelId !== "string") {
      throw new Error("云端向量模型选择配置格式无效");
    }
  }
  if (parsed.vectorModelEnabled !== undefined && typeof parsed.vectorModelEnabled !== "boolean") {
    throw new Error("云端向量模型启用配置格式无效");
  }
  const vectorModels = (parsed.vectorModels ?? []) as VectorModelConfig[];
  const selectedVectorModelId = (parsed.selectedVectorModelId ?? null) as string | null;
  if (selectedVectorModelId && !vectorModels.some((model) => model.id === selectedVectorModelId)) {
    throw new Error("云端向量模型选择不存在");
  }
  return {
    modelProviders: parsed.modelProviders,
    selectedModel: parsed.selectedModel,
    memoryExtractionModel: parsed.memoryExtractionModel,
    vectorModels,
    selectedVectorModelId,
    vectorModelEnabled: parsed.vectorModelEnabled === true,
  };
};

const deriveRecoveryKey = async (recoveryKey: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey("raw", encoder.encode(recoveryKey), "PBKDF2", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 210_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptWithRecoveryKey = async (plaintext: string, recoveryKey: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveRecoveryKey(recoveryKey, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext)),
  );

  return {
    encryptedValue: bytesToBase64(ciphertext),
    iv: JSON.stringify({
      version: 1,
      kdf: "PBKDF2-SHA256",
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
    }),
  };
};

export const decryptWithRecoveryKey = async (encryptedValue: string, ivPayload: string, recoveryKey: string) => {
  const parsed = JSON.parse(ivPayload) as { version: number; kdf?: string; salt: string; iv: string };
  if (parsed.version !== 1) throw new Error("不支持的恢复密钥版本");
  if (parsed.kdf && parsed.kdf !== "PBKDF2-SHA256") throw new Error("不支持的恢复密钥算法");
  if (typeof parsed.salt !== "string" || typeof parsed.iv !== "string") throw new Error("恢复密钥载荷格式无效");

  const key = await deriveRecoveryKey(recoveryKey, base64ToBytes(parsed.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(parsed.iv) },
    key,
    base64ToBytes(encryptedValue),
  );
  return decoder.decode(plaintext);
};

export const uploadProviderConfigBackup = async (
  client: SupabaseClient,
  userId: string,
  recoveryKey: string,
  backup: ProviderConfigBackup,
) => {
  const { encryptedValue, iv } = await encryptWithRecoveryKey(JSON.stringify(backup), recoveryKey);
  const { error } = await client.from("user_configs").upsert({
    user_id: userId,
    key: "model-provider",
    encrypted_value: encryptedValue,
    iv,
    updated_at: Date.now(),
  });
  if (error) throw new Error(`模型配置备份上传失败: ${describeError(error)}`);
};

export const downloadProviderConfigBackup = async (
  client: SupabaseClient,
  userId: string,
  recoveryKey: string,
): Promise<ProviderConfigBackup> => {
  const { data, error } = await client
    .from("user_configs")
    .select("encrypted_value, iv")
    .eq("user_id", userId)
    .eq("key", "model-provider")
    .single();

  if (error) throw new Error(`模型配置备份下载失败: ${describeError(error)}`);
  if (!data) throw new Error("云端没有可恢复的模型配置备份");
  const plaintext = await decryptWithRecoveryKey(data.encrypted_value, data.iv, recoveryKey);
  return parseProviderConfigBackup(plaintext);
};
