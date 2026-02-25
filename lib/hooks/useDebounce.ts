import { useState, useEffect } from "react";

/**
 * Debounce a value by a given delay (ms).
 * Returns the debounced value that only updates after the specified delay.
 * Available for future use — useful for search inputs, form auto-save, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
