const backupKey = 'plutus-legacy-backup';
const dismissedBackupKey = 'plutus-legacy-backup-dismissed';
const applicationStorageKeys = ['plutus-storage', 'access_token', 'refresh_token', 'i18nextLng', 'sidebar-collapsed'];

import type { UserItems } from './api/user-items';

export interface LegacyBackup {
  raw: string;
  state: UserItems;
}

export function parseLegacyBackup(raw: string): LegacyBackup | null {
  try {
    const parsed = JSON.parse(raw) as { state?: Partial<UserItems> };
    const state = parsed.state;
    if (!state || typeof state !== 'object') return null;

    const normalized: UserItems = {
      limits: Array.isArray(state.limits) ? state.limits : [],
      positions: Array.isArray(state.positions) ? state.positions : [],
      recurringExpenses: Array.isArray(state.recurringExpenses) ? state.recurringExpenses : [],
    };
    if (Object.values(normalized).every((items) => items.length === 0)) return null;
    return { raw, state: normalized };
  } catch {
    return null;
  }
}

export function preserveLegacyData(storage: Storage) {
  const raw = storage.getItem('plutus-storage');
  if (!raw) return;
  if (getLegacyBackup(storage)) return;
  if (storage.getItem(backupKey)) storage.removeItem(backupKey);
  if (parseLegacyBackup(raw)) {
    storage.setItem(backupKey, raw);
  }
}

export function getLegacyBackup(storage: Storage): LegacyBackup | null {
  const raw = storage.getItem(backupKey);
  if (!raw) return null;
  const backup = parseLegacyBackup(raw);
  if (!backup) storage.removeItem(backupKey);
  return backup;
}

export function isLegacyBackupDismissed(storage: Storage, backup: LegacyBackup): boolean {
  return storage.getItem(dismissedBackupKey) === backup.raw;
}

export function dismissLegacyBackup(storage: Storage, backup: LegacyBackup) {
  storage.setItem(dismissedBackupKey, backup.raw);
}

export function resetApplicationStorage(storage: Storage) {
  for (const key of applicationStorageKeys) storage.removeItem(key);
}
