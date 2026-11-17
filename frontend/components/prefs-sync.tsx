"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { hasServerPrefs, usePref } from "@/lib/prefs";
import type { Currency } from "@/types";

const CURRENCIES = ["USD", "EUR", "GBP", "RUB"];

function Sync() {
  const { defaultCurrency, setDefaultCurrency } = useStore();
  const [ui, updateUi] = usePref<{ currency?: string }>("plutus-ui", {});

  useEffect(() => {
    const saved = ui.currency;
    if (saved && CURRENCIES.includes(saved)) {
      if (saved !== defaultCurrency) setDefaultCurrency(saved as Currency);
    } else if (hasServerPrefs() && defaultCurrency !== "USD") {
      // однократный перенос валюты, выбранной ранее только в этом браузере
      updateUi((prev) => ({ ...prev, currency: defaultCurrency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.currency]);

  // фоновое обновление данных: раз в минуту и при возвращении на вкладку
  const { fetchAllData } = useStore();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void fetchAllData(true); };
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [fetchAllData]);

  return null;
}

/** Валюта отображения хранится в аккаунте и применяется на всех страницах. */
export function PrefsSync() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Sync /> : null;
}
