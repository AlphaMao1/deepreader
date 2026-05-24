import { describe, expect, it } from "vitest";
import {
  bytesToBase64,
  decryptWithRecoveryKey,
  encryptWithRecoveryKey,
  parseProviderConfigBackup,
} from "./cloud-config-service";

describe("parseProviderConfigBackup", () => {
  it("base64 encodes large byte arrays without spreading the whole payload", () => {
    const bytes = new Uint8Array(70_000).fill(65);

    expect(bytesToBase64(bytes)).toBe(btoa("A".repeat(70_000)));
  });

  it("accepts a valid provider config backup", () => {
    const backup = parseProviderConfigBackup(
      JSON.stringify({
        modelProviders: [
          {
            name: "OpenAI",
            active: true,
            provider: "openai",
            apiKey: "sk-test",
            models: [{ id: "gpt-test", name: "GPT Test", active: true }],
          },
        ],
        selectedModel: {
          modelId: "gpt-test",
          providerId: "openai",
          providerName: "OpenAI",
          modelName: "GPT Test",
        },
        memoryExtractionModel: null,
      }),
    );

    expect(backup.modelProviders[0].provider).toBe("openai");
    expect(backup.selectedModel?.modelId).toBe("gpt-test");
    expect(backup.vectorModels).toEqual([]);
    expect(backup.selectedVectorModelId).toBeNull();
    expect(backup.vectorModelEnabled).toBe(false);
  });

  it("accepts remote vector model config in provider backups", () => {
    const backup = parseProviderConfigBackup(
      JSON.stringify({
        modelProviders: [],
        selectedModel: null,
        memoryExtractionModel: null,
        vectorModels: [
          {
            id: "embedding-openai",
            name: "OpenAI Embedding",
            url: "https://api.openai.com/v1/embeddings",
            modelId: "text-embedding-3-small",
            apiKey: "sk-vector",
            dimension: 1536,
          },
        ],
        selectedVectorModelId: "embedding-openai",
        vectorModelEnabled: true,
      }),
    );

    expect(backup.vectorModels[0].apiKey).toBe("sk-vector");
    expect(backup.selectedVectorModelId).toBe("embedding-openai");
    expect(backup.vectorModelEnabled).toBe(true);
  });

  it("rejects malformed provider config backups before local restore", () => {
    expect(() =>
      parseProviderConfigBackup(
        JSON.stringify({
          modelProviders: [{ name: "Broken", provider: "broken", models: "not-an-array" }],
          selectedModel: null,
          memoryExtractionModel: null,
        }),
      ),
    ).toThrow("云端模型供应商配置格式无效");
  });

  it("rejects selected chat model references that are absent from the backup", () => {
    expect(() =>
      parseProviderConfigBackup(
        JSON.stringify({
          modelProviders: [
            {
              name: "OpenAI",
              active: true,
              provider: "openai",
              models: [{ id: "gpt-present", name: "GPT Present" }],
            },
          ],
          selectedModel: {
            modelId: "gpt-missing",
            providerId: "openai",
            providerName: "OpenAI",
            modelName: "GPT Missing",
          },
          memoryExtractionModel: null,
        }),
      ),
    ).toThrow("云端模型选择不存在");
  });

  it("allows selected chat model references when provider model list is empty", () => {
    const backup = parseProviderConfigBackup(
      JSON.stringify({
        modelProviders: [
          {
            name: "Custom",
            active: true,
            provider: "custom",
            models: [],
          },
        ],
        selectedModel: {
          modelId: "manual-model",
          providerId: "custom",
          providerName: "Custom",
          modelName: "Manual Model",
        },
        memoryExtractionModel: null,
      }),
    );

    expect(backup.selectedModel?.modelId).toBe("manual-model");
  });

  it("rejects malformed vector model backups before local restore", () => {
    expect(() =>
      parseProviderConfigBackup(
        JSON.stringify({
          modelProviders: [],
          selectedModel: null,
          memoryExtractionModel: null,
          vectorModels: [{ id: "broken", name: "Broken", url: "https://example.com", apiKey: 123 }],
          selectedVectorModelId: null,
          vectorModelEnabled: true,
        }),
      ),
    ).toThrow("云端向量模型配置格式无效");
  });

  it("rejects vector model selection that is not present in the backup", () => {
    expect(() =>
      parseProviderConfigBackup(
        JSON.stringify({
          modelProviders: [],
          selectedModel: null,
          memoryExtractionModel: null,
          vectorModels: [
            {
              id: "embedding-openai",
              name: "OpenAI Embedding",
              url: "https://api.openai.com/v1/embeddings",
              modelId: "text-embedding-3-small",
              apiKey: "sk-vector",
            },
          ],
          selectedVectorModelId: "missing-model",
          vectorModelEnabled: true,
        }),
      ),
    ).toThrow("云端向量模型选择不存在");
  });

  it("keeps provider config encrypted and rejects a wrong recovery key", async () => {
    const plaintext = JSON.stringify({
      modelProviders: [
        {
          name: "OpenAI",
          active: true,
          provider: "openai",
          apiKey: "sk-secret",
          models: [],
        },
      ],
      selectedModel: null,
      memoryExtractionModel: null,
    });

    const encrypted = await encryptWithRecoveryKey(plaintext, "correct-key");

    expect(encrypted.encryptedValue).not.toContain("sk-secret");
    await expect(decryptWithRecoveryKey(encrypted.encryptedValue, encrypted.iv, "wrong-key")).rejects.toThrow();
  });
});
