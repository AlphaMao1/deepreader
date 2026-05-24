import type { SystemSettings } from "@/types/settings";

export const getCloudLastSyncedAt = (settings: SystemSettings, userId: string): number => {
  return settings.cloudSyncStateByUserId?.[userId]?.lastSyncedAt ?? 0;
};

export const getKnownCloudSyncUserIds = (settings: SystemSettings): string[] => {
  return Object.entries(settings.cloudSyncStateByUserId ?? {})
    .filter(([, state]) => (state?.lastSyncedAt ?? 0) > 0)
    .map(([userId]) => userId);
};

export const hasCloudSyncAccountHistory = (settings: SystemSettings, userId: string): boolean => {
  return getCloudLastSyncedAt(settings, userId) > 0;
};

export const shouldConfirmCloudSyncAccountBoundary = (settings: SystemSettings, userId: string): boolean => {
  if (hasCloudSyncAccountHistory(settings, userId)) return false;

  const knownUserIds = getKnownCloudSyncUserIds(settings);
  const hasOtherKnownAccount = knownUserIds.some((knownUserId) => knownUserId !== userId);
  const hasLegacyUnknownAccount = knownUserIds.length === 0 && settings.lastSyncedAtCloud > 0;

  return hasOtherKnownAccount || hasLegacyUnknownAccount;
};

export const withCloudLastSyncedAt = (
  settings: SystemSettings,
  userId: string,
  lastSyncedAt: number,
): Partial<SystemSettings> => ({
  cloudSyncStateByUserId: {
    ...(settings.cloudSyncStateByUserId ?? {}),
    [userId]: {
      ...(settings.cloudSyncStateByUserId?.[userId] ?? {}),
      lastSyncedAt,
    },
  },
  lastSyncedAtCloud: lastSyncedAt,
});
