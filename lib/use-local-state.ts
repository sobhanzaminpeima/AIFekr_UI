"use client";
import { useEffect, useState } from "react";

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) setValue(JSON.parse(stored));
      } catch {}
    };
    read();
    const sync = (event: Event) => {
      if (
        event instanceof CustomEvent
          ? event.detail === key
          : (event as StorageEvent).key === key
      )
        read();
    };
    window.addEventListener("aifekr-local-update", sync);
    window.addEventListener("storage", sync);
    setReady(true);
    return () => {
      window.removeEventListener("aifekr-local-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);
  function save(next: T) {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("aifekr-local-update", { detail: key }),
    );
  }
  return [value, save, ready] as const;
}
