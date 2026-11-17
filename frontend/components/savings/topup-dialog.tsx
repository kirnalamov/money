"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { fmtMoney, fmtNum } from "@/lib/plutus-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Chip, CURRENCY_SYMBOL, DoneScreen, evalAmount, Fld, fldInputBig, GhostBtn, Hint, Lbl, ModalActions, PrimaryBtn, Seg, Suffix } from "@/components/ui/modal-kit";
import type { Goal } from "@/types";

type Mode = "add" | "take";

export function TopUpDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { accounts, updateGoal, addTransaction } = useStore();
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!goal) return;
    setMode("add"); setAmount(""); setError(null); setSaving(false); setDone(null);
    setSource(goal.linkedAccountId && accounts.some((a) => a.id === goal.linkedAccountId) ? String(goal.linkedAccountId) : "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  if (!goal) return null;

  const cur = goal.currency;
  const sym = CURRENCY_SYMBOL[cur] ?? cur;
  const value = evalAmount(amount);
  const has = Number.isFinite(value) && value > 0;
  const delta = has ? (mode === "add" ? value : -value) : 0;
  const after = Math.max(goal.currentAmount + delta, 0);
  const pct = (v: number) => (goal.targetAmount > 0 ? Math.min((v / goal.targetAmount) * 100, 100) : 0);
  const keep = pct(Math.min(goal.currentAmount, after));
  const diff = Math.abs(pct(after) - pct(goal.currentAmount));
  const sources = accounts.filter((a) => a.currency === cur && a.type !== "brokerage");
  const account = sources.find((a) => String(a.id) === source);
  const tooMuchTake = mode === "take" && has && value > goal.currentAmount;
  const notEnoughCash = mode === "add" && has && !!account && account.balance < value;
  const invalid = !has || tooMuchTake || notEnoughCash;
  const remainAfter = Math.max(goal.targetAmount - after, 0);

  const quick = mode === "add"
    ? [goal.targetAmount * 0.05, goal.targetAmount * 0.1, goal.targetAmount * 0.25, Math.max(goal.targetAmount - goal.currentAmount, 0)]
    : [goal.currentAmount * 0.25, goal.currentAmount * 0.5, goal.currentAmount];
  const roundTo = (n: number) => (n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n));

  const save = async () => {
    if (saving || invalid) return;
    setSaving(true);
    setError(null);
    try {
      await updateGoal(goal.id, { currentAmount: Math.round(after * 100) / 100 });
      if (account) {
        await addTransaction({
          amount: value,
          type: mode === "add" ? "expense" : "income",
          currency: cur,
          accountId: account.id,
          category: t("dialogs.goal_tx_category", "Накопления"),
          date: new Date().toISOString(),
          description: goal.name,
          status: "completed",
        });
      }
      setDone(`${mode === "add" ? "+" : "−"}${fmtMoney(value, cur)} · ${fmtNum(pct(after), 0)}%`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error", "Ошибка"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader className="pr-10">
          <DialogTitle>{t("savings.top_up", "Пополнить")} · {goal.name}</DialogTitle>
          <DialogDescription>{fmtMoney(goal.currentAmount, cur)} {t("savings.of", "из")} {fmtMoney(goal.targetAmount, cur)}</DialogDescription>
        </DialogHeader>

        {done ? (
          <DoneScreen
            title={mode === "add" ? t("dialogs.topup_done", "Взнос добавлен") : t("dialogs.take_done", "Деньги сняты с цели")}
            lines={[done]}
            actions={
              <>
                <GhostBtn className="min-h-11" onClick={() => { setDone(null); setAmount(""); }}>{t("dialogs.topup_more", "Ещё взнос")}</GhostBtn>
                <PrimaryBtn className="min-h-11" onClick={onClose}>{t("transactions.dialog.done")}</PrimaryBtn>
              </>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div role="group" aria-label={t("dialogs.topup_action", "Действие")} className="flex gap-1.5">
              <Seg active={mode === "add"} className="min-h-11" onClick={() => setMode("add")}>{t("savings.top_up", "Пополнить")}</Seg>
              <Seg active={mode === "take"} className="min-h-11" onClick={() => setMode("take")}>{t("dialogs.take", "Снять")}</Seg>
            </div>

            <div>
              <div role="img" aria-label={t("dialogs.topup_progress", "Прогресс цели")} className="flex h-2.5 overflow-hidden rounded-[5px] bg-[#232721]">
                <span style={{ flex: `${keep} 1 0%`, background: "#6F8A2E" }} />
                <span style={{ flex: `${diff} 1 0%`, background: mode === "add" ? "#C6F24E" : "#F87171" }} />
                <span style={{ flex: `${Math.max(100 - keep - diff, 0)} 1 0%` }} />
              </div>
              <div className="mt-2 flex justify-between gap-3 text-[12.5px] text-[#8D9388]">
                <span>{fmtNum(pct(goal.currentAmount), 0)}% {t("dialogs.topup_now", "сейчас")}</span>
                <span className="font-semibold text-[#F1F3EE]">{fmtNum(pct(after), 0)}% {t("dialogs.topup_after", "после")}</span>
              </div>
            </div>

            <div>
              <Lbl htmlFor="topup">{mode === "add" ? t("savings.top_up_amount", "Сумма пополнения") : t("dialogs.take_amount", "Сколько снять")}</Lbl>
              <Fld big suffix={<Suffix big>{sym}</Suffix>}>
                <input
                  id="topup"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  className={fldInputBig}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => { if (/^[\d\s.,+]*$/.test(e.target.value)) setAmount(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
                />
              </Fld>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {quick.map((q, i) => (
                  <Chip key={i} small className="min-h-11" onClick={() => setAmount(String(roundTo(q)))}>
                    {mode === "add" && i === 3 ? t("dialogs.topup_rest", "До цели") : mode === "take" && i === 2 ? t("dialogs.all", "Всё") : fmtMoney(roundTo(q), cur, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            <Card className="text-[13.5px] text-[#C9CEC3]">
              {has
                ? (remainAfter > 0
                  ? t("dialogs.topup_info", "После операции на цели {{after}}. До цели останется {{rest}}.", { after: fmtMoney(after, cur), rest: fmtMoney(remainAfter, cur) })
                  : t("dialogs.topup_reached", "После операции цель будет достигнута. Поздравляем!"))
                : t("dialogs.topup_hint", "Введите сумму — покажем, как изменится прогресс.")}
            </Card>

            <div>
              <Lbl htmlFor="topup-src">{mode === "add" ? t("dialogs.topup_from", "Откуда списать") : t("dialogs.take_to", "Куда вернуть")}</Lbl>
              <Fld>
                <select id="topup-src" value={source} onChange={(e) => setSource(e.target.value)} className="min-h-11 w-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-foreground outline-none [&>option]:bg-card">
                  {sources.map((a) => <option key={a.id} value={a.id}>{a.name} · {fmtMoney(a.balance, a.currency, 0)}</option>)}
                  <option value="none">{t("dialogs.topup_no_account", "Без движения по счетам: уже отложил(а)")}</option>
                </select>
              </Fld>
              {tooMuchTake && <Hint tone="red">{t("dialogs.take_too_much", "На цели только {{amount}}.", { amount: fmtMoney(goal.currentAmount, cur) })}</Hint>}
              {notEnoughCash && account && <Hint tone="red">{t("dialogs.topup_short", "На счёте не хватает {{amount}}.", { amount: fmtMoney(value - account.balance, cur) })}</Hint>}
              {!tooMuchTake && !notEnoughCash && account && has && <Hint>{t("dialogs.topup_account_note", "На счёте «{{name}}» останется {{amount}}.", { name: account.name, amount: fmtMoney(account.balance + (mode === "add" ? -value : value), cur) })}</Hint>}
            </div>

            <ModalActions>
              <GhostBtn className="min-h-11" onClick={onClose}>{t("common.cancel", "Отмена")}</GhostBtn>
              <PrimaryBtn className="min-h-11" disabled={invalid || saving} onClick={save}>
                {saving ? t("common.loading", "Сохраняем…") : has ? `${mode === "add" ? t("savings.top_up", "Пополнить") : t("dialogs.take", "Снять")} ${fmtMoney(value, cur, 0)}` : mode === "add" ? t("savings.top_up", "Пополнить") : t("dialogs.take", "Снять")}
              </PrimaryBtn>
            </ModalActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
