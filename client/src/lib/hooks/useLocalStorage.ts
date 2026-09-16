import { useCallback, useEffect, useState } from 'react';

type SetValue<T> = T | ((current: T) => T);

const LOCAL_STORAGE_EVENT = 'termhive:local-storage';

const readStorageValue = <T,>(key: string, initialValue: T): T => {
  if (typeof window === 'undefined') {
    return initialValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? initialValue : (JSON.parse(raw) as T);
  } catch {
    return initialValue;
  }
};

export const useLocalStorage = <T,>(
  key: string,
  initialValue: T,
): [T, (value: SetValue<T>) => void, () => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => readStorageValue(key, initialValue));

  const notify = useCallback(() => {
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } }));
  }, [key]);

  const setValue = useCallback(
    (value: SetValue<T>) => {
      const nextValue = value instanceof Function ? value(storedValue) : value;

      try {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
      } catch {
        // Storage can be unavailable in private contexts; state still updates.
      }

      setStoredValue(nextValue);
      notify();
    },
    [key, notify, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore unavailable storage.
    }

    setStoredValue(initialValue);
    notify();
  }, [initialValue, key, notify]);

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === key) {
        setStoredValue(readStorageValue(key, initialValue));
      }
    };
    const onLocalStorage = (event: Event): void => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === key) {
        setStoredValue(readStorageValue(key, initialValue));
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_STORAGE_EVENT, onLocalStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_STORAGE_EVENT, onLocalStorage);
    };
  }, [initialValue, key]);

  return [storedValue, setValue, removeValue];
};
