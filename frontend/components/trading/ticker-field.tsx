"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Chip, Fld, fldInput, Lbl, Mono, Card, Hint } from "@/components/ui/modal-kit";
import { hashColor, fmtMoney } from "@/lib/plutus-format";
import { lookupTicker, POPULAR_TICKERS, type TickerInfo } from "@/lib/ticker";

/** Выбор бумаги: поле тикера, быстрые чипы, карточка выбранной бумаги. */
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
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const seq = useRef(0);

  const pick = async (sym: string) => {
    const my = ++seq.current;
    setLoading(true);
    setMissing(false);
    const info = await lookupTicker(sym);
    if (my !== seq.current) return;
    setLoading(false);
    if (info) onChange(info);
    else setMissing(true);
  };

  useEffect(() => {
    if (value) return;
    const q = query.trim();
    if (q.length < 2) { setMissing(false); setLoading(false); return; }
    const id = setTimeout(() => { void pick(q); }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, value]);

  const classLabel = (c: string) => t(`portfolio.asset_classes.${c}`, c);

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
              placeholder={t("dialogs.ticker_placeholder", "Введите тикер: AAPL, SBER, VOO")}
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void pick(query); } }}
            />
          </Fld>
          {loading && <Hint>{t("dialogs.ticker_searching", "Ищем котировку…")}</Hint>}
          {!loading && missing && <Hint>{t("dialogs.ticker_none", "Бумага не найдена. Проверьте тикер.")}</Hint>}
          {!query.trim() && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((sym) => (
                <Chip key={sym} onClick={() => void pick(sym)}><b className="font-bold text-[#F1F3EE]">{sym}</b></Chip>
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
              <span className="block truncate text-[12.5px] text-[#8D9388]">{value.hint === "moex" ? t("dialogs.src_moex", "Мосбиржа") : value.hint === "crypto" ? t("dialogs.src_crypto", "Криптобиржа") : t("dialogs.src_global", "Мировой рынок")}</span>
            </span>
            <span className="text-right font-bold">{fmtMoney(value.price, value.currency)}</span>
            <button
              type="button"
              onClick={() => { onChange(null); setQuery(""); }}
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
