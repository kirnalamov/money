const backupKey = 'plutus-legacy-backup';

export function preserveLegacyData(storage: Storage) {
  const raw = storage.getItem('plutus-storage');
  if (!raw || storage.getItem(backupKey)) return;
  const state = JSON.parse(raw)?.state;
  if (['limits', 'positions', 'recurringExpenses'].some(key => Array.isArray(state?.[key]) && state[key].length > 0)) {
    storage.setItem(backupKey, raw);
  }
}

export function getLegacyBackup(storage: Storage) {
  return storage.getItem(backupKey);
}
