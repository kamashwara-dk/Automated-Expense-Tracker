'use client';

import { useState, useEffect } from 'react';

/**
 * useState that persists to localStorage.
 * SSR-safe: reads from localStorage only after hydration.
 * 
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if key is not in storage
 */
export function useLocalStorage(key, initialValue) {
  // Use a function initializer to avoid reading from storage on server
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // After mount, read from localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (err) {
      console.warn(`[useLocalStorage] Failed to read key "${key}":`, err);
    }
    setIsHydrated(true);
  }, [key]);

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err) {
      console.warn(`[useLocalStorage] Failed to write key "${key}":`, err);
    }
  };

  return [storedValue, setValue, isHydrated];
}
