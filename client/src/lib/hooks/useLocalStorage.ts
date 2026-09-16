import { useCallback, useEffect, useState } from 'react';

type SetValue<T> = T | ((current: T) => T);

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

  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue((current) => {
        const nextValue = value instanceof Function ? value(current) : value;

        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // Storage can be unavailable in private contexts; state still updates.
        }

        return nextValue;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore unavailable storage.
    }

    setStoredValue(initialValue);
  }, [initialValue, key]);

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === key) {
        setStoredValue(readStorageValue(key, initialValue));
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [initialValue, key]);

  return [storedValue, setValue, removeValue];
};
