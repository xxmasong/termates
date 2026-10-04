const PREFIX = 'termates';
const LEGACY_PREFIX = 'termhive';

/** Carry this browser's settings over from the pre-rename `termhive:*` keys. */
export const migrateLegacyStorage = (): void => {
  try {
    const { localStorage } = window;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(`${LEGACY_PREFIX}:`)) continue;
      const nextKey = PREFIX + key.slice(LEGACY_PREFIX.length);
      const value = localStorage.getItem(key);
      if (value !== null && localStorage.getItem(nextKey) === null) {
        localStorage.setItem(nextKey, value);
      }
      localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in private contexts; defaults apply.
  }
};
