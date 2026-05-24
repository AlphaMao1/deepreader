import { getOSPlatform } from "@/utils/misc";
import type { OsPlatform } from "@/types/system";

export const isMobilePlatform = () => ["android", "ios"].includes(getOSPlatform());

export const supportsLocalLlmForPlatform = (platform: OsPlatform) => !["android", "ios"].includes(platform);

export const supportsLocalLlm = () => supportsLocalLlmForPlatform(getOSPlatform());
