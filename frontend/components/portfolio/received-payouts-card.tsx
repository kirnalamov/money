"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Coins, Loader2, ChevronDown } from "lucide-react";
import { Currency, Position } from "@/types";
import {
  PayoutData,
  TaxSettings,
  buildReceived,
  sellEstimate,
} from "@/lib/payouts";
import { fmtMoney, fmtNum, plural } from "@/lib/plutus-format";
import { cn } from "@/lib/utils";

interface Props {
  positions: Position[];
  data: PayoutData;
  loading: boolean;
  currency: Currency;
  tax: TaxSettings;
  onTaxChange: (patch: Partial<TaxSettings>) => void;
  totalValue: number;
  totalCost: number;
}

interface Bucket {
  key: string;
  label: string;
  net: number;
  gross: number;
  items: ReturnType<typeof buildReceived>["items"];
}

export function ReceivedPayoutsCard({
  positions,
  data,
  loading,
  currency,
  tax,
  onTaxChange,
  totalValue,
  totalCost,
}: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;
  const [filter, setFilter] = useState<string>("all");
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const received = useMemo(
    () => buildReceived(positions, data, tax, currency),
    [positions, data, tax, currency]
  );

  const symbols = useMemo(
    () => Array.from(new Set(received.items.map((i) => i.symbol))),
    [received.items]
  );
  const items = useMemo(
    () => (filter === "all" ? received.items : received.items.filter((i) => i.symbol === filter)),
    [received.items, filter]
  );

  const sums = useMemo(() => {
    const gross = items.reduce((s, i) => s + i.gross, 0);
    const taxSum = items.reduce((s, i) => s + i.tax, 0);
    return { gross, taxSum, net: gross - taxSum };
  }, [items]);

  const allNet = received.items.reduce((s, i) => s + i.net, 0);
  const est = useMemo(
    () => sellEstimate(totalValue, totalCost, allNet, tax),
    [totalValue, totalCost, allNet, tax]
  );

  // группировка: по месяцам, а при длинной истории — по годам
  const buckets = useMemo<Bucket[]>(() => {
    if (!items.length) return [];
    const dates = items.map((i) => i.date).sort();
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const spanMonths =
      (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth();
    const byYear = spanMonths > 24;
    const map = new Map<string, Bucket>();
    [...items]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((it) => {
        const key = byYear ? it.date.slice(0, 4) : it.date.slice(0, 7);
        let b = map.get(key);
        if (!b) {
          b = {
            key,
            label: byYear
              ? key
              : format(new Date(`${key}-01`), "LLL yy", { locale: dateLocale }).replace(".", ""),
            net: 0,
            gross: 0,
            items: [],
          };
          map.set(key, b);
        }
        b.net += it.net;
        b.gross += it.gross;
        b.items.push(it);
      });
    return Array.from(map.values());
  }, [items, dateLocale]);

  const chart = useMemo(() => {
    const max = Math.max(...buckets.map((b) => b.net), 1);
    const rawStep = max / 3;
    const pw = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let st = pw * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pw >= rawStep) {
        st = k * pw;
        break;
      }
    }
    const top = st * Math.ceil(max / st) || 1;
    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= top + 1e-6; v += st) {
      yTicks.push({ top: 100 - (v / top) * 100, label: v === 0 ? "0" : fmtNum(v).replace(",00", "") });
    }
    return { top, yTicks };
  }, [buckets]);

  const active = pinned ?? hover;
  const activeBucket = active != null ? buckets[active] : null;
  const labelStep = Math.max(1, Math.ceil(buckets.length / 10));
  const shownRows = showAll ? items : items.slice(0, 6);

  const fieldCls =
    "flex h-9 w-[88px] items-center gap-1 rounded-[10px] border border-[#2A2E27] bg-[#0E0F0E] px-3 focus-within:border-[#C6F24E]";
  const numInput = (value: number, onChange: (v: number) => void) => (
    <input
      value={String(value).replace(".", ",")}
      onChange={(e) => {
        const v = parseFloat(e.target.value.replace(",", "."));
        onChange(Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);
      }}
      inputMode="decimal"
      className="w-full min-w-0 bg-transparent text-[13px] font-semibold text-[#F1F3EE] outline-none"
    />
  );

  const Tile = ({
    label,
    value,
    sub,
    color,
    big,
  }: {
    label: string;
    value: string;
    sub?: string;
    color?: string;
    big?: boolean;
  }) => (
    <div className="min-w-[150px] flex-[1_1_170px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
      <div className="text-[12.5px] text-[#8D9388]">{label}</div>
      <div
        className={cn("mt-1.5 font-bold", big ? "text-[26px]" : "text-[20px]")}
        style={{ color: color || "#F1F3EE" }}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[#8D9388]">{sub}</div>}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232721] px-7 py-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
            <Coins className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">
              {t("portfolio.received_title", "Полученные выплаты")}
            </h2>
            <p className="mt-1 text-sm text-[#8D9388]">
              {t(
                "portfolio.received_desc",
                "Сколько реально выплатили ваши бумаги с момента покупки: дивиденды и купоны за вычетом налога. Выплата считается полученной через 14 дней после даты отсечки."
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[#8D9388]">
            {t("portfolio.tax_pct", "Налог, %")}
            <span className={fieldCls}>
              {numInput(tax.taxPct, (v) => onTaxChange({ taxPct: v }))}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#8D9388]">
            {t("portfolio.commission_pct", "Комиссия, %")}
            <span className={fieldCls}>
              {numInput(tax.commissionPct, (v) => onTaxChange({ commissionPct: v }))}
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-7">
        {/* chips */}
        {symbols.length > 1 && (
          <div role="group" className="flex flex-wrap gap-2">
            {["all", ...symbols].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setPinned(null);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  filter === s
                    ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#C6F24E]"
                    : "border-[#2A2E27] text-[#C9CEC3] hover:border-[#5A6054] hover:text-[#F1F3EE]"
                )}
              >
                {s === "all" ? t("portfolio.tabs.all", "Все") : s}
              </button>
            ))}
          </div>
        )}

        {loading && !received.items.length ? (
          <div className="flex items-center gap-3 py-8 text-[#8D9388]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("portfolio.loading_payouts", "Загружаем историю выплат…")}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Tile
                big
                label={t("portfolio.received_net", "Получено на руки")}
                value={`+${fmtMoney(sums.net, currency)}`}
                color="#C6F24E"
                sub={`${items.length} ${plural(
                  items.length,
                  t("portfolio.payments_one", "выплата"),
                  t("portfolio.payments_few", "выплаты"),
                  t("portfolio.payments_many", "выплат")
                )}`}
              />
              <Tile
                label={t("portfolio.received_gross", "Начислено (до налога)")}
                value={fmtMoney(sums.gross, currency)}
              />
              <Tile
                label={t("portfolio.received_tax", "Удержан налог")}
                value={`−${fmtMoney(sums.taxSum, currency)}`}
                color="#F87171"
                sub={`${tax.taxPct}%`}
              />
            </div>

            {received.missingDates.length > 0 && (
              <p className="rounded-xl bg-[#FBBF24]/10 px-4 py-3 text-[13px] text-[#FBBF24]">
                {t(
                  "portfolio.missing_date",
                  "Не указана дата покупки для"
                )}{" "}
                {received.missingDates.join(", ")}:{" "}
                {t(
                  "portfolio.missing_date_hint",
                  "считаем за последние 12 месяцев. Укажите дату в карточке позиции (✎), чтобы получить точную сумму."
                )}
              </p>
            )}

            {buckets.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#2A2E27] px-6 py-8 text-center text-[#8D9388]">
                <div className="font-semibold text-[#C9CEC3]">
                  {t("portfolio.no_received", "С момента покупки выплат ещё не было")}
                </div>
                <div className="mt-1 text-[13px]">
                  {t(
                    "portfolio.no_received_hint",
                    "Когда ваши бумаги выплатят дивиденды или купоны, они появятся здесь."
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3 text-sm font-semibold">
                  {t("portfolio.received_chart", "Что и когда вам выплатили")}
                </div>
                <div className="relative ml-12 h-[220px]" onMouseLeave={() => setHover(null)}>
                  {chart.yTicks.map((yk, i) => (
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
                  {buckets.map((b, i) => (
                    <button
                      key={b.key}
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onClick={() => setPinned(pinned === i ? null : i)}
                      aria-label={`${b.label}: ${fmtNum(b.net)}`}
                      className="absolute bottom-0 top-0 flex cursor-pointer flex-col items-center justify-end border-0 bg-transparent p-0"
                      style={{
                        left: `${(i / buckets.length) * 100}%`,
                        width: `${100 / buckets.length}%`,
                      }}
                    >
                      <div
                        className={cn(
                          "w-[56%] max-w-[44px] rounded-t bg-[#C6F24E] transition-opacity",
                          active != null && active !== i && "opacity-50"
                        )}
                        style={{ height: `${Math.max((b.net / chart.top) * 100, 1.5)}%` }}
                      />
                    </button>
                  ))}

                  {activeBucket && (
                    <div
                      className="pointer-events-none absolute z-10 w-72 -translate-x-1/2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                      style={{
                        left: `${Math.min(86, Math.max(14, ((active! + 0.5) / buckets.length) * 100))}%`,
                        bottom: `${Math.min((activeBucket.net / chart.top) * 100 + 8, 58)}%`,
                      }}
                    >
                      <div className="text-[13px] font-semibold">{activeBucket.label}</div>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {activeBucket.items.slice(0, 6).map((it) => (
                          <div key={it.key} className="flex items-center justify-between gap-3 text-[13px]">
                            <span className="min-w-0">
                              <span className="font-semibold">{it.symbol}</span>{" "}
                              <span className="text-xs text-[#8D9388]">
                                {format(new Date(it.date), "d MMM", { locale: dateLocale })} ·{" "}
                                {fmtNum(it.qty, it.qty % 1 ? 2 : 0)} × {fmtNum(it.perUnit)}
                              </span>
                            </span>
                            <span className="flex-none font-semibold text-[#6EE7A0]">
                              +{fmtNum(it.net)}
                            </span>
                          </div>
                        ))}
                        {activeBucket.items.length > 6 && (
                          <div className="text-xs text-[#8D9388]">
                            +{activeBucket.items.length - 6} {t("portfolio.more", "ещё")}
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5 flex justify-between border-t border-[#232721] pt-2 text-xs text-[#8D9388]">
                        <span>
                          {t("portfolio.before_tax", "до налога")} {fmtNum(activeBucket.gross)}
                        </span>
                        <span className="font-semibold text-[#F1F3EE]">
                          {t("portfolio.on_hand", "На руки")} {fmtMoney(activeBucket.net, currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative ml-12 mt-2 h-[22px]">
                  {buckets.map((b, i) =>
                    i % labelStep === 0 ? (
                      <span
                        key={b.key}
                        className="absolute top-0 text-center text-xs text-[#8D9388]"
                        style={{
                          left: `${(i / buckets.length) * 100}%`,
                          width: `${100 / buckets.length}%`,
                        }}
                      >
                        {b.label}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* history */}
            {items.length > 0 && (
              <div className="overflow-hidden rounded-[14px] border border-[#232721]">
                <div className="overflow-x-auto">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-[1fr_1.4fr_1.3fr_1fr_1fr] gap-3 bg-[#121411] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388]">
                      <span>{t("portfolio.col_date", "Дата")}</span>
                      <span>{t("portfolio.col_security", "Бумага")}</span>
                      <span className="text-right">{t("portfolio.col_qty_per", "Кол-во × выплата")}</span>
                      <span className="text-right">{t("portfolio.received_tax", "Налог")}</span>
                      <span className="text-right">{t("portfolio.on_hand", "На руки")}</span>
                    </div>
                    {shownRows.map((it) => (
                      <div
                        key={it.key}
                        className="grid grid-cols-[1fr_1.4fr_1.3fr_1fr_1fr] gap-3 border-t border-[#1E211C] px-5 py-3 text-[13.5px]"
                      >
                        <span className="text-[#C9CEC3]">
                          {format(new Date(it.date), "d MMM yyyy", { locale: dateLocale })}
                        </span>
                        <span className="font-semibold">
                          {it.symbol}{" "}
                          <span className="text-xs font-medium text-[#8D9388]">
                            {it.kind === "dividend"
                              ? t("portfolio.dividend", "Дивиденд")
                              : t("portfolio.coupon", "Купон")}
                          </span>
                        </span>
                        <span className="text-right">
                          {fmtNum(it.qty, it.qty % 1 ? 2 : 0)} × {fmtNum(it.perUnit)}
                        </span>
                        <span className="text-right text-[#F87171]">−{fmtNum(it.tax)}</span>
                        <span className="text-right font-semibold text-[#6EE7A0]">
                          +{fmtNum(it.net)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {items.length > 6 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex w-full items-center justify-center gap-2 border-t border-[#1E211C] p-3.5 text-[13.5px] font-medium text-[#A2A89C] transition-colors hover:text-[#F1F3EE]"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")}
                      strokeWidth={2}
                    />
                    {showAll
                      ? t("portfolio.show_less", "Свернуть")
                      : `${t("portfolio.show_all", "Показать все")} ${items.length}`}
                  </button>
                )}
              </div>
            )}

            {/* costs */}
            <div>
              <div className="mb-3 text-sm font-semibold">
                {t("portfolio.costs_title", "Налоги и комиссии: итог, если продать сегодня")}
              </div>
              <div className="flex flex-wrap gap-3">
                <Tile
                  label={t("portfolio.broker_fee", "Комиссия брокера")}
                  value={`−${fmtMoney(est.buyComm + est.sellComm, currency)}`}
                  color="#F87171"
                  sub={`${t("portfolio.buy_word", "покупка")} ${fmtMoney(est.buyComm, currency)} · ${t("portfolio.sell_word", "продажа")} ${fmtMoney(est.sellComm, currency)}`}
                />
                <Tile
                  label={t("portfolio.gain_tax", "Налог с прибыли при продаже")}
                  value={`−${fmtMoney(est.gainTax, currency)}`}
                  color="#F87171"
                  sub={`${tax.taxPct}% ${t("portfolio.of_gain", "от прибыли за вычетом комиссий")}`}
                />
                <Tile
                  big
                  label={t("portfolio.net_if_sold", "Итог на руки (прибыль + выплаты − налоги − комиссии)")}
                  value={`${est.net >= 0 ? "+" : "−"}${fmtMoney(Math.abs(est.net), currency)}`}
                  color={est.net >= 0 ? "#6EE7A0" : "#F87171"}
                />
              </div>
              <p className="mt-3 text-[12.5px] text-[#8D9388]">
                {t(
                  "portfolio.costs_note",
                  "Оценка: ставка налога и комиссия настраиваются выше. По умолчанию — 13% (НДФЛ РФ для базовой ставки) и 0,3% за сделку; повышенные ставки при большом доходе, льготы и вычеты не учитываются."
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
