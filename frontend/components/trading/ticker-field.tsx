"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Chip, Fld, fldInput, Lbl, Mono, Card, Hint, Pick } from "@/components/ui/modal-kit";
import { hashColor, fmtMoney } from "@/lib/plutus-format";
import {
  POPULAR_TICKERS,
  pricesForHits,
  resolveHit,
  searchSecurities,
  type SecurityHit,
  type TickerInfo,
} from "@/lib/ticker";

/** Выбор бумаги: поиск по тикеру или названию со списком подходящих вариантов, быстрые чипы, карточка выбранной. */
export function TickerField({
  value,
  onChange,
  holdingText,
  idPrefix,
}: {
  value: TickerInfo | null;
  onChange: (v: TickerInfo | null) => void;
  holdingText?: string;
  idPrefix: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SecurityHit[]>([]);
  const [prices, setPrices] = useState<Record<string, { price: number; currency: string }>>({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  // Поиск с задержкой: показываем подходящие бумаги, ничего не выбираем сами.
  useEffect(() => {
    if (value) return;
    const q = query.trim();
    const my = ++seq.current;
    if (q.length < 1) { setHits([]); setPrices({}); setSearching(false); setSearched(false); return; }
    setSearching(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      const found = await searchSecurities(q, ctrl.signal);
      if (my !== seq.current) return;
      setHits(found);
      setSearched(true);
      setSearching(false);
      setFailed(false);
      if (found.length) {
        const p = await pricesForHits(found);
        if (my === seq.current) setPrices(p);
      }
    }, 350);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [query, value]);

  const choose = async (hit: Pick<SecurityHit, "symbol" | "hint" | "asset_class">) => {
    const key = `${hit.symbol}:${hit.hint}`;
    setResolving(key);
    setFailed(false);
    const info = await resolveHit(hit);
    setResolving(null);
    if (info) onChange(info);
    else setFailed(true);
  };

  const classLabel = (c: string) => t(`portfolio.asset_classes.${c}`, c);
  const sourceLabel = (h: string) => (h === "moex" ? t("dialogs.src_moex", "Мосбиржа") : h === "crypto" ? t("dialogs.src_crypto", "Криптобиржа") : t("dialogs.src_global", "Мировой рынок"));

  return (
    <div>
      <Lbl htmlFor={`${idPrefix}-ticker`} hint={value ? undefined : t("dialogs.ticker_hint", "цена подтянется сама")}>
        {t("dialogs.security", "Бумага")}
      </Lbl>
      {!value ? (
        <div>
          <Fld prefix={<Search className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
            <input
              id={`${idPrefix}-ticker`}
              type="text"
              autoComplete="off"
              className={fldInput}
              placeholder={t("dialogs.ticker_placeholder", "Введите тикер или название: AAPL, SBER, Apple")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Fld>
          {searching && <Hint>{t("dialogs.ticker_searching", "Ищем подходящие бумаги…")}</Hint>}
          {failed && <Hint tone="red">{t("dialogs.ticker_no_price", "Не удалось получить цену этой бумаги. Выберите другую.")}</Hint>}
          {!searching && searched && hits.length === 0 && <Hint>{t("dialogs.ticker_none", "Бумага не найдена. Проверьте тикер или название.")}</Hint>}
          {hits.length > 0 && (
            <div role="listbox" aria-label={t("dialogs.ticker_results", "Подходящие бумаги")} className="mt-2 flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-0.5">
              <div className="px-0.5 text-xs text-[#8D9388]">{t("dialogs.ticker_pick", "Выберите нужную бумагу")}</div>
              {hits.map((hit) => {
                const key = `${hit.symbol}:${hit.hint}`;
                const price = prices[key];
                return (
                  <Pick key={key} role="option" aria-selected={false} disabled={resolving !== null} className="min-h-11" onClick={() => void choose(hit)}>
                    <Mono color={hashColor(hit.symbol)}>{hit.symbol.slice(0, 2)}</Mono>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold">{hit.symbol} <span className="font-medium text-[#8D9388]">· {classLabel(hit.asset_class)}</span></span>
                      <span className="block truncate text-[12.5px] text-[#8D9388]">{hit.name} · {hit.exchange || sourceLabel(hit.hint)}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {resolving === key ? "…" : price ? fmtMoney(price.price, price.currency) : ""}
                    </span>
                  </Pick>
                );
              })}
            </div>
          )}
          {!query.trim() && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((item) => (
                <Chip key={`${item.symbol}:${item.hint}`} className="min-h-11" onClick={() => void choose(item)}>
                  <b className="font-bold text-[#F1F3EE]">{item.symbol}</b>
                </Chip>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <Card className="flex items-center gap-3">
            <Mono color={hashColor(value.symbol)}>{value.symbol.slice(0, 2)}</Mono>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{value.symbol} <span className="font-medium text-[#8D9388]">· {classLabel(value.assetClass)}</span></span>
              <span className="block truncate text-[12.5px] text-[#8D9388]">{sourceLabel(value.hint)}</span>
            </span>
            <span className="text-right font-bold">{fmtMoney(value.price, value.currency)}</span>
            <button
              type="button"
              onClick={() => { onChange(null); setQuery(""); setHits([]); }}
              aria-label={t("dialogs.change_security", "Сменить бумагу")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#8D9388] hover:bg-[#232721] hover:text-[#F1F3EE]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Card>
          {holdingText ? <Hint>{holdingText}</Hint> : null}
        </>
      )}
    </div>
  );
}
