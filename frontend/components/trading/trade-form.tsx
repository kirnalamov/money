"use client";

import { useEffect, useRef, useState } from "react";
import { useBrokerSettings } from "@/lib/broker-settings";
import { useTranslation } from "react-i18next";
import { format, isSameDay, subDays } from "date-fns";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import { fmtMoney, fmtNum, hashColor } from "@/lib/plutus-format";
import { evalAmount, Card, Chip, CURRENCY_SYMBOL, Dot, DoneScreen, Fld, fldInput, GhostBtn, Hint, Lbl, LinkBtn, ModalActions, parseRuDate, Pick, PrimaryBtn, Seg, Suffix, Warn, TONE } from "@/components/ui/modal-kit";
import { TickerField } from "@/components/trading/ticker-field";
import { resolveHit, type TickerInfo } from "@/lib/ticker";
import type { PriceHint } from "@/lib/moex";
import type { Position } from "@/types";

export const COMMISSION = 0.0005; // 0,05%

type Side = "buy" | "sell";

type Mode = "qty" | "sum";

export interface TradePreset {
  side: Side;
  /** заранее выбранная бумага (например, при продаже из таблицы позиций) */
  symbol?: string;
  hint?: PriceHint;
  asset_class?: "stock" | "etf" | "bond" | "crypto" | "cash";
}

export function TradeForm({ onClose, preset }: { onClose: () => void; preset?: TradePreset }) {
  const { t } = useTranslation();
  const { accounts, positions, addPosition, deletePosition, updateAccount } = useStore();
  const { settingsFor } = useBrokerSettings();

  const [side, setSide] = useState<Side>(preset?.side ?? "buy");
  const [ticker, setTicker] = useState<TickerInfo | null>(null);
  const [mode, setMode] = useState<Mode>("qty");
  const [qtyText, setQtyText] = useState("");
  const [sumText, setSumText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [brokerageId, setBrokerageId] = useState<number | null>(null);
  const [day, setDay] = useState(() => new Date());
  const [otherDate, setOtherDate] = useState(false);
  const [dateText, setDateText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);
  const savingRef = useRef(false);
  const presetRef = useRef(preset);

  useEffect(() => {
    const p = presetRef.current;
    if (!p?.symbol || !p.hint) return;
    let alive = true;
    void resolveHit({ symbol: p.symbol, hint: p.hint, asset_class: p.asset_class ?? "stock" }).then((info) => { if (alive && info) setTicker(info); });
    return () => { alive = false; };
  }, []);

  // все брокерские счета; счёт с бумагой и в той же валюте — первыми. Если валюта счёта другая, пересчёт идёт по курсу.
  const holderId = ticker ? positions.find((p) => p.symbol === ticker.symbol)?.accountId : undefined;
  const brokerages = ticker
    ? accounts
        .filter((a) => a.type === "brokerage")
        .sort((a, b) => Number(b.id === holderId) - Number(a.id === holderId) || Number(b.currency === ticker.currency) - Number(a.currency === ticker.currency))
    : [];
  const account = brokerages.find((a) => a.id === brokerageId) ?? brokerages[0];
  const existing: Position | undefined = ticker && account ? positions.find((p) => p.symbol === ticker.symbol && p.accountId === account.id) : undefined;
  const held = existing?.quantity ?? 0;
  const sym = ticker ? CURRENCY_SYMBOL[ticker.currency] ?? ticker.currency : "";
  const isCrypto = ticker?.assetClass === "crypto";

  const manualPrice = evalAmount(priceText);
  const hasManual = Number.isFinite(manualPrice) && manualPrice > 0;
  const price = hasManual ? manualPrice : ticker?.price ?? 0;

  const rawQty = mode === "qty" ? evalAmount(qtyText) : price > 0 ? evalAmount(sumText) / price : NaN;
  const qty = Number.isFinite(rawQty) && rawQty > 0 ? (mode === "sum" && !isCrypto ? Math.floor(rawQty) : Math.round(rawQty * 1e8) / 1e8) : 0;
  const deal = qty * price;
  const nkd = qty * (ticker?.accrued ?? 0);
  const broker = settingsFor(account?.id);
  const commission = ((deal + nkd) * broker.commissionPct) / 100;
  const cash = account?.balance ?? 0;
  const delta = side === "buy" ? -(deal + nkd + commission) : deal + nkd - commission;
  const cashDelta = ticker && account ? convertCurrency(delta, ticker.currency, account.currency) : 0;
  const cashAfter = cash + cashDelta;
  const qtyAfter = side === "buy" ? held + qty : held - qty;

  const warn = !ticker ? "" :
    brokerages.length === 0 ? t("dialogs.trade_no_brokerage", "Нет брокерского счёта в валюте бумаги.") :
    side === "buy" && qty > 0 && cashAfter < 0 ? t("dialogs.trade_short", "На брокерском счёте не хватает {{amount}}.", { amount: fmtMoney(-cashAfter, account?.currency) }) :
    side === "sell" && qty > held + 1e-9 ? t("dialogs.trade_sell_over", "В портфеле только {{qty}} шт.", { qty: fmtNum(held, 4) }) :
    "";
  const invalid = !ticker || !account || qty <= 0 || !!warn;

  useEffect(() => { setError(null); }, [side, ticker, qtyText, sumText, priceText]);

  const dateValue = otherDate ? parseRuDate(dateText) : day;
  const isToday = !otherDate && isSameDay(day, new Date());
  const isYesterday = !otherDate && isSameDay(day, subDays(new Date(), 1));

  const reset = () => {
    setTicker(null); setQtyText(""); setSumText(""); setPriceText(""); setDay(new Date()); setOtherDate(false);
    setDateText(""); setError(null); setDone(null); setSaving(false); savingRef.current = false;
  };

  const save = async () => {
    if (savingRef.current || invalid || !ticker || !account) return;
    if (!dateValue || dateValue > new Date()) { setError(t("transactions.dialog.bad_date")); return; }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (side === "buy") {
        const newQty = held + qty;
        const avg = existing ? (held * existing.avgPrice + qty * price) / newQty : price;
        await addPosition({
          symbol: ticker.symbol,
          name: existing?.name || ticker.symbol,
          quantity: newQty,
          avgPrice: avg,
          currentPrice: ticker.price,
          currency: ticker.currency,
          accountId: account.id,
          assetClass: existing?.assetClass ?? ticker.assetClass,
          purchaseDate: existing?.purchaseDate ?? format(dateValue, "yyyy-MM-dd"),
        });
      } else if (existing) {
        const left = held - qty;
        if (left <= 1e-9) await deletePosition(existing.symbol, existing.accountId);
        else await addPosition({ ...existing, quantity: left, currentPrice: ticker.price });
      }
      await updateAccount(account.id, { balance: Math.round(cashAfter * 100) / 100, expected_balance: account.balance });
      setDone([
        `${fmtNum(qty, 4)} ${t("dialogs.pcs", "шт")} × ${fmtMoney(price, ticker.currency)}`,
        `${t("dialogs.trade_commission", "Комиссия")} ${fmtMoney(commission, ticker.currency)}`,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dialogs.trade_failed", "Не удалось провести сделку."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (done && ticker) {
    return (
      <DoneScreen
        title={side === "buy" ? t("dialogs.trade_done_buy", "Куплено {{sym}}", { sym: ticker.symbol }) : t("dialogs.trade_done_sell", "Продано {{sym}}", { sym: ticker.symbol })}
        lines={done}
        actions={
          <>
            <GhostBtn className="min-h-11" onClick={reset}>{t("dialogs.trade_again", "Ещё сделку")}</GhostBtn>
            <PrimaryBtn className="min-h-11" onClick={onClose}>{t("transactions.dialog.done")}</PrimaryBtn>
          </>
        }
      />
    );
  }

  const rows: { k: string; v: string; strong?: boolean; tone?: string }[] = ticker && qty > 0 ? [
    { k: t("dialogs.trade_deal_sum", "Сумма сделки"), v: fmtMoney(deal, ticker.currency) },
    ...(nkd > 0 ? [{ k: t("portfolio.nkd", "НКД"), v: fmtMoney(nkd, ticker.currency) }] : []),
    { k: t("dialogs.trade_commission_rate", "Комиссия {{pct}}%", { pct: String(broker.commissionPct).replace(".", ",") }), v: fmtMoney(commission, ticker.currency) },
    { k: side === "buy" ? t("dialogs.trade_total_buy", "Спишется") : t("dialogs.trade_total_sell", "Зачислится"), v: fmtMoney(Math.abs(delta), ticker.currency), strong: true },
    ...(account && account.currency !== ticker.currency
      ? [{ k: side === "buy" ? t("dialogs.trade_from_account", "Спишется со счёта (по курсу)") : t("dialogs.trade_to_account", "Зачислится на счёт (по курсу)"), v: fmtMoney(Math.abs(cashDelta), account.currency) }]
      : []),
    ...(side === "sell" && existing && broker.taxPct > 0
      ? [{ k: t("dialogs.trade_tax_est", "Налог с прибыли (оценка)"), v: fmtMoney(Math.max(0, (price - existing.avgPrice) * qty - commission) * broker.taxPct / 100, ticker.currency) }]
      : []),
    { k: t("dialogs.trade_cash_after", "Свободно после"), v: fmtMoney(cashAfter, account?.currency), tone: cashAfter < 0 ? TONE.expense : undefined },
    { k: t("dialogs.trade_pos_after", "В портфеле после"), v: `${fmtNum(Math.max(qtyAfter, 0), 4)} ${t("dialogs.pcs", "шт")}` },
  ] : [];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-[18px]">
      <div role="group" aria-label={t("dialogs.trade_side", "Покупка или продажа")} className="flex gap-1.5">
        <Seg active={side === "buy"} tone={TONE.income} className="min-h-11" onClick={() => setSide("buy")}>{t("dialogs.buy", "Купить")}</Seg>
        <Seg active={side === "sell"} tone={TONE.expense} className="min-h-11" onClick={() => setSide("sell")}>{t("dialogs.sell", "Продать")}</Seg>
      </div>

      <TickerField
        idPrefix="trade"
        value={ticker}
        onChange={(v) => { setTicker(v); setBrokerageId(null); setPriceText(""); }}
        holdingText={ticker && account ? (held > 0 ? t("dialogs.trade_holding", "В портфеле: {{qty}} шт", { qty: fmtNum(held, 4) }) : t("dialogs.trade_not_held", "Этой бумаги в портфеле пока нет")) : undefined}
      />

      {ticker && (
        <>
          <div>
            <Lbl
              htmlFor="trade-qty"
              hint={
                <span className="flex gap-1">
                  <Chip small active={mode === "qty"} className="!h-7 !px-2.5" onClick={() => setMode("qty")}>{t("dialogs.by_qty", "Штуки")}</Chip>
                  <Chip small active={mode === "sum"} className="!h-7 !px-2.5" onClick={() => setMode("sum")}>{t("dialogs.by_sum", "Сумма")}</Chip>
                </span>
              }
            >
              {mode === "qty" ? t("dialogs.quantity", "Количество") : t("dialogs.trade_amount", "Сумма сделки")}
            </Lbl>
            <Fld suffix={<Suffix>{mode === "qty" ? t("dialogs.pcs", "шт") : sym}</Suffix>}>
              <input
                id="trade-qty"
                inputMode="decimal"
                autoComplete="off"
                className={fldInput}
                placeholder="0"
                value={mode === "qty" ? qtyText : sumText}
                onChange={(e) => { if (/^[\d\s.,+]*$/.test(e.target.value)) (mode === "qty" ? setQtyText : setSumText)(e.target.value); }}
              />
            </Fld>
            {mode === "sum" && qty > 0 && <Hint>{t("dialogs.trade_approx_qty", "≈ {{qty}} шт по текущей цене", { qty: fmtNum(qty, 4) })}</Hint>}
            {side === "sell" && held > 0 && (
              <div className="mt-2.5 flex gap-1.5">
                {[0.25, 0.5, 1].map((share) => (
                  <Chip key={share} small className="min-h-11" onClick={() => { setMode("qty"); setQtyText(String(Math.round(held * share * 1e8) / 1e8)); }}>
                    {share === 1 ? t("dialogs.all", "Всё") : `${share * 100}%`}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div>
            <Lbl htmlFor="trade-price" hint={<span className={hasManual ? "" : "text-[#6EE7A0]"}>{hasManual ? t("dialogs.price_manual", "вручную") : t("dialogs.price_market", "рыночная")}</span>}>
              {t("dialogs.price_per_unit", "Цена за 1 шт")}
            </Lbl>
            <Fld suffix={<Suffix>{sym}</Suffix>}>
              <input id="trade-price" inputMode="decimal" autoComplete="off" className={fldInput} placeholder={fmtNum(ticker.price, 2)} value={priceText} onChange={(e) => { if (/^[\d\s.,]*$/.test(e.target.value)) setPriceText(e.target.value); }} />
            </Fld>
            {hasManual && <div className="mt-2"><LinkBtn onClick={() => setPriceText("")}>{t("dialogs.price_reset", "Вернуть рыночную цену")}</LinkBtn></div>}
          </div>

          {rows.length > 0 && (
            <Card className="flex flex-col gap-[9px] text-[13.5px]">
              {rows.map((r) => (
                <div key={r.k} className="flex justify-between gap-3">
                  <span className="text-[#8D9388]">{r.k}</span>
                  <span className={r.strong ? "font-bold" : "font-medium"} style={r.tone ? { color: r.tone } : undefined}>{r.v}</span>
                </div>
              ))}
            </Card>
          )}

          {warn && <Warn><b>!</b><span>{warn}</span></Warn>}

          <div>
            <Lbl>{t("dialogs.brokerage", "Брокерский счёт")}</Lbl>
            {brokerages.length === 0 ? (
              <Hint className="mt-0">{t("dialogs.trade_no_brokerage", "Нет брокерского счёта в валюте бумаги.")}</Hint>
            ) : (
              <div className="flex flex-col gap-1.5">
                {brokerages.map((a) => (
                  <Pick key={a.id} active={account?.id === a.id} className="min-h-11" onClick={() => setBrokerageId(a.id)}>
                    <Dot color={hashColor(String(a.id))} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{a.name}</span>
                    <span className="text-[13px] text-[#8D9388]">{t("dialogs.free", "свободно")} <b className="text-[#F1F3EE]">{fmtMoney(a.balance, a.currency)}</b></span>
                  </Pick>
                ))}
              </div>
            )}
          </div>

          <div>
            <Lbl hint={dateValue ? format(dateValue, "dd.MM.yyyy") : undefined}>{t("transactions.dialog.date")}</Lbl>
            <div role="group" aria-label={t("transactions.dialog.date")} className="flex flex-wrap gap-2">
              <Chip active={isToday} className="min-h-11" onClick={() => { setDay(new Date()); setOtherDate(false); }}>{t("transactions.dialog.today")}</Chip>
              <Chip active={isYesterday} className="min-h-11" onClick={() => { setDay(subDays(new Date(), 1)); setOtherDate(false); }}>{t("transactions.dialog.yesterday")}</Chip>
              <Chip active={otherDate} className="min-h-11" onClick={() => { setOtherDate(true); setDateText(format(day, "dd.MM.yyyy")); }}>{t("transactions.dialog.pick_date")}</Chip>
            </div>
            {otherDate && (
              <Fld className="mt-2.5">
                <input className={fldInput} autoComplete="off" aria-label={t("transactions.dialog.date")} placeholder={t("transactions.dialog.date_placeholder")} value={dateText} onChange={(e) => setDateText(e.target.value)} />
              </Fld>
            )}
          </div>
        </>
      )}

      {error && <Warn><span>{error}</span></Warn>}

      <ModalActions>
        <GhostBtn className="min-h-11" onClick={onClose}>{t("transactions.dialog.cancel")}</GhostBtn>
        <PrimaryBtn className="min-h-11" disabled={invalid || saving} onClick={save}>
          {saving ? t("transactions.dialog.saving") : side === "buy" ? t("dialogs.trade_buy_btn", "Купить") : t("dialogs.trade_sell_btn", "Продать")}
        </PrimaryBtn>
      </ModalActions>
    </div>
  );
}
