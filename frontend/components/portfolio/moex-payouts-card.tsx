"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Landmark, Search, Loader2 } from "lucide-react";
import { Position } from "@/types";
import { fetchMoexPayouts, MoexPayoutsResult } from "@/lib/moex";
import { fmtNum } from "@/lib/plutus-format";
import { cn } from "@/lib/utils";

const MAX_BARS = 24;

const CUR_SYMBOL: Record<string, string> = {
  RUB: "₽",
  SUR: "₽",
  USD: "$",
  EUR: "€",
};

function curSym(c: string) {
  return CUR_SYMBOL[c?.toUpperCase()] || c;
}

interface Props {
  positions: Position[];
}

export function MoexPayoutsCard({ positions }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;

  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: { symbol: string; qty: number }[] = [];
    // RUB-бумаги первыми: они торгуются на МосБирже
    const sorted = [...positions].sort((a, b) =>
      a.currency === "RUB" === (b.currency === "RUB") ? 0 : a.currency === "RUB" ? -1 : 1
    );
    sorted.forEach((p) => {
      const s = p.symbol.toUpperCase();
      if (seen.has(s)) return;
      seen.add(s);
      out.push({ symbol: s, qty: p.quantity });
    });
    return out.slice(0, 6);
  }, [positions]);

  const [secid, setSecid] = useState<string>("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<MoexPayoutsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const cache = useRef(new Map<string, MoexPayoutsResult>());

  // стартовый тикер: первая RUB-бумага портфеля, иначе SBER
  useEffect(() => {
    if (!secid) {
      const first = chips.find((c) =>
        positions.some((p) => p.symbol.toUpperCase() === c.symbol && p.currency === "RUB")
      );
      setSecid(first?.symbol || "SBER");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips.length]);

  useEffect(() => {
    if (!secid) return;
    let dead = false;
    const cached = cache.current.get(secid);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setData(null);
    setHover(null);
    setPinned(null);
    fetchMoexPayouts(secid)
      .then((res) => {
        if (dead) return;
        cache.current.set(secid, res);
        setData(res);
      })
      .finally(() => !dead && setLoading(false));
    return () => {
      dead = true;
    };
  }, [secid]);

  const qtyFor = (sym: string) => {
    const p = positions.find((x) => x.symbol.toUpperCase() === sym.toUpperCase());
    return p?.quantity;
  };

  const view = useMemo(() => {
    const payouts = data?.payouts || [];
    const shown = payouts.slice(-MAX_BARS);
    const max = Math.max(...shown.map((p) => p.value), 0.000001);
    // «красивый» шаг сетки
    const rawStep = max / 3;
    const pw = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    let st = pw * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pw >= rawStep) {
        st = k * pw;
        break;
      }
    }
    const top = st * Math.ceil(max / st) || 1;
    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= top + 1e-9; v += st) {
      yTicks.push({
        top: 100 - (v / top) * 100,
        label: fmtNum(v, v < 10 ? 2 : 0),
      });
    }
    // подписи лет под первым платежом каждого года
    let prevYear = "";
    const bars = shown.map((p, i) => {
      const year = p.date.slice(0, 4);
      const label = year !== prevYear ? year : "";
      prevYear = year;
      return { ...p, i, h: (p.value / top) * 100, yearLabel: label };
    });

    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString()
      .slice(0, 10);
    const t12 = payouts
      .filter((p) => !p.isFuture && p.date >= yearAgo)
      .reduce((s, p) => s + p.value, 0);
    const paid = payouts.filter((p) => !p.isFuture);
    const last = paid[paid.length - 1];
    const cur = payouts[0] ? curSym(payouts[0].currency) : "₽";
    return { bars, yTicks, t12, last, paidCount: paid.length, cur };
  }, [data]);

  const active = pinned ?? hover;
  const activeBar = active != null ? view.bars[active] : null;
  const qty = qtyFor(secid);

  const submitInput = () => {
    const v = input.trim().toUpperCase();
    if (v) {
      setSecid(v);
      setInput("");
    }
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232721] px-7 py-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
            <Landmark className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-base font-semibold">
              {t("portfolio.moex_title", "Выплаты по данным МосБиржи")}
            </h2>
            <p className="mt-1 text-[13.5px] text-[#8D9388]">
              {t(
                "portfolio.moex_desc",
                "Фактические выплаты на одну бумагу из открытого ISS API Московской биржи."
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.symbol}
              onClick={() => setSecid(c.symbol)}
              className={cn(
                "h-9 rounded-[10px] border px-3.5 text-[13px] font-semibold transition-colors",
                secid === c.symbol
                  ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#C6F24E]"
                  : "border-[#2A2E27] text-[#A2A89C] hover:text-[#F1F3EE]"
              )}
            >
              {c.symbol}
            </button>
          ))}
          <label className="flex h-9 items-center gap-2 rounded-[10px] border border-[#2A2E27] bg-[#0E0F0E] px-3 focus-within:border-[#C6F24E]">
            <Search className="h-3.5 w-3.5 text-[#8D9388]" strokeWidth={1.8} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitInput()}
              placeholder={t("portfolio.moex_input", "Код бумаги…")}
              className="w-28 bg-transparent text-[13px] text-[#F1F3EE] outline-none placeholder:text-[#8D9388]"
            />
          </label>
        </div>
      </div>

      <div className="p-7">
        {loading && (
          <div className="flex items-center gap-3 py-10 text-[#8D9388]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("portfolio.moex_loading", "Запрашиваем МосБиржу…")} {secid}
          </div>
        )}

        {!loading && data && data.source === null && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[14px] border border-dashed border-[#2A2E27] px-6 py-5">
            <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-[#1E211C] text-[#8D9388]">
              <Landmark className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="flex flex-[1_1_320px] flex-col gap-1">
              <span className="font-semibold">
                {t("portfolio.moex_empty_title", "Нет открытых данных по")}{" "}
                {data.secid}
              </span>
              <span className="text-[13px] leading-relaxed text-[#8D9388]">
                {t(
                  "portfolio.moex_empty_desc",
                  "МосБиржа убрала историю дивидендов по акциям из бесплатного ISS API. Открытыми остаются купоны облигаций — введите код облигации (например, SU26238RMFS4), чтобы увидеть реальные выплаты."
                )}
              </span>
            </span>
            <button
              onClick={() => setSecid("SU26238RMFS4")}
              className="h-10 rounded-xl border border-[#2A2E27] px-4 text-[13.5px] font-semibold text-[#C9CEC3] transition-colors hover:border-[#C6F24E] hover:text-[#C6F24E]"
            >
              {t("portfolio.moex_try_bond", "Показать пример: ОФЗ 26238")}
            </button>
          </div>
        )}

        {!loading && data && data.source !== null && (
          <div>
            {/* Summary */}
            <div className="mb-7 flex flex-wrap items-end gap-x-12 gap-y-5">
              <div>
                <div className="text-[13px] font-medium text-[#8D9388]">
                  {data.source === "dividends"
                    ? t("portfolio.moex_last_div", "Последний дивиденд")
                    : t("portfolio.moex_last_cpn", "Последний купон")}
                  {" · "}
                  {data.secid}
                </div>
                <div className="mt-1 text-4xl font-bold leading-[1.15] tracking-[-0.02em]">
                  {view.last
                    ? `${fmtNum(view.last.value)} ${curSym(view.last.currency)}`
                    : "—"}
                </div>
                {view.last && (
                  <div className="mt-0.5 text-[13px] text-[#8D9388]">
                    {format(new Date(view.last.date), "d MMMM yyyy", {
                      locale: dateLocale,
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[13px] text-[#8D9388]">
                  {t("portfolio.moex_last_12m", "За последние 12 месяцев")}
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {fmtNum(view.t12)}{" "}{view.cur}
                  <span className="ml-1 text-[13px] font-medium text-[#8D9388]">
                    {t("portfolio.moex_per_unit", "на бумагу")}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[13px] text-[#8D9388]">
                  {t("portfolio.moex_paid_count", "Выплат всего")}
                </div>
                <div className="mt-1 text-xl font-semibold">{view.paidCount}</div>
              </div>
              {qty != null && view.last && (
                <div>
                  <div className="text-[13px] text-[#8D9388]">
                    {t("portfolio.moex_your_position", "На вашу позицию")} (
                    {fmtNum(qty, qty % 1 ? 2 : 0)} {t("portfolio.moex_pcs", "шт.")})
                  </div>
                  <div className="mt-1 text-xl font-semibold text-[#6EE7A0]">
                    +{fmtNum(view.last.value * qty)}
                    {curSym(view.last.currency)}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive chart */}
            <div
              className="relative ml-12 h-[220px]"
              onMouseLeave={() => setHover(null)}
            >
              {view.yTicks.map((yk, i) => (
                <div key={i}>
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-[#232721]"
                    style={{ top: `${yk.top}%` }}
                  />
                  <div
                    className="absolute -left-12 w-10 -translate-y-1/2 text-right text-xs text-[#8D9388]"
                    style={{ top: `${yk.top}%` }}
                  >
                    {yk.label}
                  </div>
                </div>
              ))}
              {view.bars.map((b, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setPinned(pinned === i ? null : i)}
                  aria-label={`${b.date}: ${fmtNum(b.value)}`}
                  className="group absolute bottom-0 top-0 flex cursor-pointer flex-col items-center justify-end border-0 bg-transparent p-0"
                  style={{
                    left: `${(i / view.bars.length) * 100}%`,
                    width: `${100 / view.bars.length}%`,
                  }}
                >
                  <div
                    className={cn(
                      "w-[56%] rounded-t transition-colors",
                      b.kind === "dividend" ? "bg-[#C6F24E]" : "bg-[#7DD3FC]",
                      b.isFuture && "opacity-35",
                      active === i && "ring-2 ring-[#F1F3EE]/60"
                    )}
                    style={{ height: `${Math.max(b.h, 1.5)}%` }}
                  />
                </button>
              ))}

              {/* Tooltip */}
              {activeBar && (
                <div
                  className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  style={{
                    left: `${((activeBar.i + 0.5) / view.bars.length) * 100}%`,
                    bottom: `${Math.min(activeBar.h + 6, 72)}%`,
                  }}
                >
                  <div className="text-xs text-[#8D9388]">
                    {format(new Date(activeBar.date), "d MMMM yyyy", {
                      locale: dateLocale,
                    })}
                    {activeBar.isFuture &&
                      ` · ${t("portfolio.moex_planned", "план")}`}
                  </div>
                  <div className="mt-1 text-[15px] font-bold">
                    {fmtNum(activeBar.value)}{" "}{curSym(activeBar.currency)}
                    <span className="ml-1 text-xs font-medium text-[#8D9388]">
                      {t("portfolio.moex_per_unit", "на бумагу")}
                    </span>
                  </div>
                  {qty != null && (
                    <div className="mt-0.5 text-[13px] font-semibold text-[#6EE7A0]">
                      +{fmtNum(activeBar.value * qty)}
                      {curSym(activeBar.currency)}{" "}
                      <span className="font-medium text-[#8D9388]">
                        × {fmtNum(qty, qty % 1 ? 2 : 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* X labels: годы */}
            <div className="relative ml-12 mt-2 h-[20px]">
              {view.bars.map(
                (b, i) =>
                  b.yearLabel && (
                    <span
                      key={i}
                      className="absolute top-0 text-xs text-[#8D9388]"
                      style={{ left: `${(i / view.bars.length) * 100}%` }}
                    >
                      {b.yearLabel}
                    </span>
                  )
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[#8D9388]">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-[3px]",
                    data.source === "dividends" ? "bg-[#C6F24E]" : "bg-[#7DD3FC]"
                  )}
                />
                {data.source === "dividends"
                  ? t("portfolio.dividends", "Дивиденды")
                  : t("portfolio.coupons", "Купоны")}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-[3px] opacity-35",
                    data.source === "dividends" ? "bg-[#C6F24E]" : "bg-[#7DD3FC]"
                  )}
                />
                {t("portfolio.moex_future", "Будущие (план)")}
              </span>
              <span>
                {t(
                  "portfolio.moex_source",
                  "Источник: iss.moex.com, выплаты на одну бумагу."
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
