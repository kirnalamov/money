"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import { fmtMoney, fmtNum, signedMoney, hashColor } from "@/lib/plutus-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CURRENCY_SYMBOL, Dot, DoneScreen, evalAmount, Fld, fldInput, GhostBtn, Hint, Lbl, LinkBtn, ModalActions, parseRuDate, Pick, PrimaryBtn, Suffix, SwitchRow, Warn, TONE } from "@/components/ui/modal-kit";
import { TickerField } from "@/components/trading/ticker-field";
import { hintFor, type TickerInfo } from "@/lib/ticker";
import type { Position } from "@/types";

export function PositionDialog({
  open,
  onOpenChange,
  editing,
  defaultAccountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Position | null;
  /** брокерский счёт по умолчанию для новой позиции */
  defaultAccountId?: number;
}) {
  const { t } = useTranslation();
  const { accounts, positions, addPosition, updatePosition, updateAccount } = useStore();
  const brokerages = accounts.filter((a) => a.type === "brokerage");

  const [ticker, setTicker] = useState<TickerInfo | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [dateText, setDateText] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [charge, setCharge] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null); setDone(null); setSaving(false); setCharge(!editing);
    if (editing) {
      setTicker({ symbol: editing.symbol, hint: hintFor(editing), price: editing.currentPrice, currency: editing.currency, assetClass: editing.assetClass ?? "stock" });
      setQty(String(editing.quantity));
      setPrice(String(editing.avgPrice));
      setDateText(editing.purchaseDate ? format(new Date(editing.purchaseDate), "dd.MM.yyyy") : "");
      setAccountId(editing.accountId);
    } else {
      setTicker(null); setQty(""); setPrice(""); setDateText(format(new Date(), "dd.MM.yyyy")); setAccountId(defaultAccountId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const sameCur = ticker ? brokerages.filter((a) => a.currency === ticker.currency) : [];
  const account = brokerages.find((a) => a.id === accountId) ?? sameCur[0] ?? brokerages[0];
  const sym = ticker ? CURRENCY_SYMBOL[ticker.currency] ?? ticker.currency : "";
  const qtyNum = evalAmount(qty);
  const priceNum = price.trim() === "" ? (ticker?.price ?? 0) : evalAmount(price);
  const manual = price.trim() !== "";
  const validQty = Number.isFinite(qtyNum) && qtyNum > 0;
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const cost = validQty && validPrice ? qtyNum * priceNum : 0;
  const value = validQty && ticker ? qtyNum * ticker.price : 0;
  const pnl = value - cost;
  // стоимость покупки списывается с брокерского счёта (если валюта другая — по курсу)
  const canCharge = !!account && !!ticker && !editing;
  const costInAccount = account && ticker ? convertCurrency(cost, ticker.currency, account.currency) : 0;
  const cashAfter = account ? account.balance - costInAccount : 0;
  const short = charge && canCharge && cost > 0 && cashAfter < 0;
  const date = parseRuDate(dateText);
  const invalid = !ticker || !account || !validQty || !validPrice || short;

  const save = async () => {
    if (saving || invalid || !ticker || !account) return;
    if (dateText.trim() && (!date || date > new Date())) { setError(t("transactions.dialog.bad_date")); return; }
    setSaving(true);
    setError(null);
    try {
      const purchaseDate = date ? format(date, "yyyy-MM-dd") : undefined;
      if (editing) {
        await updatePosition(editing.symbol, editing.accountId, {
          ...editing, quantity: qtyNum, avgPrice: priceNum, purchaseDate, accountId: account.id,
        });
      } else {
        const existing = positions.find((p) => p.symbol === ticker.symbol && p.accountId === account.id);
        const total = (existing?.quantity ?? 0) + qtyNum;
        await addPosition({
          symbol: ticker.symbol,
          name: existing?.name || ticker.symbol,
          quantity: total,
          avgPrice: existing ? ((existing.quantity * existing.avgPrice) + qtyNum * priceNum) / total : priceNum,
          currentPrice: ticker.price,
          currency: ticker.currency,
          accountId: account.id,
          assetClass: existing?.assetClass ?? ticker.assetClass,
          purchaseDate: existing?.purchaseDate ?? purchaseDate,
        });
        if (charge && canCharge) {
          await updateAccount(account.id, { balance: Math.round(cashAfter * 100) / 100, expected_balance: account.balance });
        }
      }
      if (editing) onOpenChange(false);
      else setDone([`${ticker.symbol} · ${fmtNum(qtyNum, 4)} ${t("dialogs.pcs", "шт")}`, `${t("dialogs.pos_cost", "Стоимость покупки")} ${fmtMoney(cost, ticker.currency)}`]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error", "Ошибка"));
    } finally {
      setSaving(false);
    }
  };

  const rows: { k: string; v: string; tone?: string; strong?: boolean }[] = ticker && validQty ? [
    { k: t("dialogs.pos_cost", "Стоимость покупки"), v: fmtMoney(cost, ticker.currency) },
    { k: t("dialogs.pos_value", "Сейчас стоит"), v: fmtMoney(value, ticker.currency) },
    { k: t("dialogs.pos_result", "Результат"), v: `${signedMoney(pnl, ticker.currency)}${cost > 0 ? ` (${pnl >= 0 ? "+" : "−"}${fmtNum(Math.abs(pnl / cost) * 100, 1)}%)` : ""}`, tone: pnl >= 0 ? TONE.income : TONE.expense, strong: true },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader className="pr-10">
          <DialogTitle>{editing ? t("portfolio.edit_position") : t("portfolio.add_position")}</DialogTitle>
          <DialogDescription>{editing ? t("portfolio.edit_position_desc") : t("dialogs.pos_desc", "Бумага уже у вас в портфеле? Введите тикер, остальное подтянется")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <DoneScreen
            title={t("dialogs.pos_done", "Позиция добавлена")}
            lines={done}
            actions={
              <>
                <GhostBtn className="min-h-11" onClick={() => { setDone(null); setTicker(null); setQty(""); setPrice(""); }}>{t("dialogs.add_more", "Добавить ещё")}</GhostBtn>
                <PrimaryBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("transactions.dialog.done")}</PrimaryBtn>
              </>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {brokerages.length === 0 && <Warn><span>{t("dialogs.pos_no_brokerage", "Сначала добавьте брокерский счёт в разделе «Счета».")}</span></Warn>}

            {editing ? (
              <Card className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full text-[12.5px] font-bold text-[#10170A]" style={{ background: hashColor(editing.symbol) }}>{editing.symbol.slice(0, 2)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{editing.symbol}</span>
                  <span className="block truncate text-[12.5px] text-[#8D9388]">{editing.name}</span>
                </span>
              </Card>
            ) : (
              <TickerField idPrefix="pos" value={ticker} onChange={(v) => { setTicker(v); setPrice(""); setAccountId(defaultAccountId ?? null); }} />
            )}

            {ticker && (
              <>
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <Lbl htmlFor="pos-qty">{t("dialogs.quantity", "Количество")}</Lbl>
                    <Fld suffix={<Suffix>{t("dialogs.pcs", "шт")}</Suffix>}>
                      <input id="pos-qty" inputMode="decimal" autoComplete="off" className={fldInput} placeholder="0" value={qty} onChange={(e) => { if (/^[\d\s.,+]*$/.test(e.target.value)) setQty(e.target.value); }} />
                    </Fld>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Lbl htmlFor="pos-price" hint={<span className={manual ? "" : "text-[#6EE7A0]"}>{manual ? t("dialogs.price_manual", "вручную") : t("dialogs.price_market", "рыночная")}</span>}>{t("dialogs.pos_avg", "Средняя цена")}</Lbl>
                    <Fld suffix={<Suffix>{sym}</Suffix>}>
                      <input id="pos-price" inputMode="decimal" autoComplete="off" className={fldInput} placeholder={fmtNum(ticker.price, 2)} value={price} onChange={(e) => { if (/^[\d\s.,]*$/.test(e.target.value)) setPrice(e.target.value); }} />
                    </Fld>
                  </div>
                </div>
                {manual && <div className="-mt-2"><LinkBtn onClick={() => setPrice("")}>{t("dialogs.pos_use_current", "Не помню цену — взять текущую")}</LinkBtn></div>}

                <div>
                  <Lbl htmlFor="pos-date" hint={t("dialogs.pos_date_hint", "если не помните, оставьте сегодняшнюю")}>{t("dialogs.pos_date", "Дата покупки")}</Lbl>
                  <Fld><input id="pos-date" className={fldInput} autoComplete="off" placeholder={t("transactions.dialog.date_placeholder")} value={dateText} onChange={(e) => setDateText(e.target.value)} /></Fld>
                </div>

                {brokerages.length > 1 && (
                  <div>
                    <Lbl>{t("dialogs.brokerage", "Брокерский счёт")}</Lbl>
                    <div className="flex flex-col gap-1.5">
                      {brokerages.map((a) => (
                        <Pick key={a.id} active={account?.id === a.id} className="min-h-11" onClick={() => setAccountId(a.id)}>
                          <Dot color={hashColor(String(a.id))} />
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{a.name}</span>
                          <span className="text-[13px] text-[#8D9388]">{fmtMoney(a.balance, a.currency)}</span>
                        </Pick>
                      ))}
                    </div>
                  </div>
                )}

                {!editing && (
                  <div>
                    <SwitchRow
                      id="pos-charge"
                      title={t("dialogs.pos_charge", "Списать с брокерского счёта")}
                      sub={!canCharge ? t("dialogs.pos_charge_cur", "Нет подходящего счёта") : charge && cost > 0 ? t("dialogs.pos_charge_after", "Свободно: {{a}} → {{b}}", { a: fmtMoney(account?.balance ?? 0, account?.currency), b: fmtMoney(cashAfter, account?.currency) }) : t("dialogs.pos_charge_off", "Деньги со счёта не списываются: бумага уже была в портфеле")}
                      checked={charge && canCharge}
                      onChange={(v) => canCharge && setCharge(v)}
                    />
                    {short && <Hint tone="red">{t("dialogs.trade_short", "На брокерском счёте не хватает {{amount}}.", { amount: fmtMoney(-cashAfter, account?.currency) })}</Hint>}
                  </div>
                )}

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
              </>
            )}

            {!editing && <div className="text-[12.5px] text-[#8D9388]">{t("dialogs.pos_trade_note", "Хотите купить или продать прямо сейчас? Это делается в окне «Новая операция» → «Сделка»: баланс счёта и позиция обновятся сами.")}</div>}

            <ModalActions>
              <GhostBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("common.cancel", "Отмена")}</GhostBtn>
              <PrimaryBtn className="min-h-11" disabled={invalid || saving} onClick={save}>
                {saving ? t("common.loading", "Сохраняем…") : editing ? t("common.save", "Сохранить") : t("dialogs.pos_add_btn", "Добавить позицию")}
              </PrimaryBtn>
            </ModalActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
