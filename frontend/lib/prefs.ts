"use client";

import { useCallback, useEffect, useState } from "react";
import { getPreferences, savePreferences, type Preferences } from "@/lib/api/user-items";

/**
 * Настройки интерфейса (налог, виды категорий, обязательные категории, уведомления лимитов)
 * хранятся на сервере и кэшируются в localStorage: страницы читают их мгновенно,
 * а изменения уходят на сервер с небольшой задержкой.
 */
export const PREF_KEYS = ["plutus-tax-settings", "plutus-category-kinds", "plutus-mandatory-categories", "plutus-limit-toggles", "plutus-notifications", "plutus-ui"] as const;
type PrefKey = (typeof PREF_KEYS)[number];

let serverPrefs: Preferences | null = null;
let pulling: Promise<Preferences | null> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function readLocal(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function pull(): Promise<Preferences | null> {
  if (!pulling) {
    pulling = getPreferences()
      .then((remote) => {
        serverPrefs = remote;
        // сервер главнее; то, чего на сервере ещё нет, отправляем из браузера (однократный перенос)
        let needPush = false;
        for (const key of PREF_KEYS) {
          if (remote[key]) writeLocal(key, remote[key]);
          else if (readLocal(key)) needPush = true;
        }
        listeners.forEach((fn) => fn());
        if (needPush) schedulePush();
        return remote;
      })
      .catch(() => {
        pulling = null; // повторим при следующем обращении
        return null;
      });
  }
  return pulling;
}

function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const payload: Preferences = {};
    for (const key of PREF_KEYS) {
      const value = readLocal(key);
      if (value) payload[key] = value;
    }
    savePreferences(payload).then((saved) => { serverPrefs = saved; }).catch(() => { /* останется в браузере и уйдёт при следующем изменении */ });
  }, 600);
}

/** Сбросить кэш при выходе из аккаунта. */
export function resetPrefsCache() {
  serverPrefs = null;
  pulling = null;
  if (timer) clearTimeout(timer);
  for (const key of PREF_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

export function usePref<T extends Record<string, unknown>>(key: PrefKey, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const load = () => {
      const local = readLocal(key);
      if (local) setValue({ ...initial, ...(local as T) });
    };
    load();
    listeners.add(load);
    void pull();
    return () => { listeners.delete(load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback((updater: (prev: T) => T) => {
    setValue((prev) => {
      const next = updater(prev);
      writeLocal(key, next);
      schedulePush();
      // другие места, использующие эту настройку, перечитывают её (например, колокольчик и блок на «Обзоре»)
      queueMicrotask(() => listeners.forEach((fn) => fn()));
      return next;
    });
  }, [key]);

  return [value, update] as const;
}

export function hasServerPrefs() {
  return serverPrefs !== null;
}
