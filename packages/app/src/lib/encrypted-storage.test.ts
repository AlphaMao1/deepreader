import { describe, expect, it } from "vitest";
import { isEncryptedStoragePayload } from "./encrypted-storage";

describe("isEncryptedStoragePayload", () => {
  it("recognizes encrypted storage envelopes without treating legacy JSON as encrypted", () => {
    expect(
      isEncryptedStoragePayload(
        JSON.stringify({
          version: 1,
          nonce: "abc",
          ciphertext: "def",
        }),
      ),
    ).toBe(true);

    expect(isEncryptedStoragePayload(JSON.stringify({ state: { apiKey: "plain" } }))).toBe(false);
  });
});
