import { describe, expect, it } from "vitest";
import { supportsLocalLlmForPlatform } from "./platform-features";

describe("platform feature gates", () => {
  it("disables local LLM on mobile targets", () => {
    expect(supportsLocalLlmForPlatform("android")).toBe(false);
    expect(supportsLocalLlmForPlatform("ios")).toBe(false);
  });

  it("keeps local LLM available on desktop targets", () => {
    expect(supportsLocalLlmForPlatform("windows")).toBe(true);
    expect(supportsLocalLlmForPlatform("macos")).toBe(true);
    expect(supportsLocalLlmForPlatform("linux")).toBe(true);
  });
});
