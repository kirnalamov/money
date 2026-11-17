"use client";

import { useEffect, useState } from "react";
import { addMonths, format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { fmtMoney } from "@/lib/plutus-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Chip, CURRENCY_SYMBOL, CurBtn, DoneScreen, evalAmount, Fld, fldInput, fldInputBig, GhostBtn, Lbl, ModalActions, parseRuDate, PrimaryBtn, Suffix } from "@/components/ui/modal-kit";
import type { Currency, Goal } from "@/types";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "RUB"];
const SPAN_MONTHS = [3, 6, 12, 24, 36, 60];

export function GoalDialog({
  open,
  onOpenChange,
  goal,
  presetName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  presetName?: string;
}) {
  const { t } = useTranslation();
  const { accounts, addGoal, updateGoal, defaultCurrency } = useStore();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [dateText, setDateText] = useState("");
  const [months, setMonths] = useState<number | null>(null);
  const [linked, setLinked] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null); setDone(null); setSaving(false); setMonths(null);
    setName(goal?.name ?? presetName ?? "");
    setTarget(goal ? String(goal.targetAmount) : "");
    setCurrent(goal ? String(goal.currentAmount) : "");
    setCurrency(goal?.currency ?? defaultCurrency);
    setDateText(goal?.deadline ? format(new Date(goal.deadline), "dd.MM.yyyy") : "");
    setLinked(goal?.linkedAccountId ? String(goal.linkedAccountId) : "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal, presetName]);

  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const targetNum = evalAmount(target);
  const currentNum = current.trim() === "" ? 0 : evalAmount(current);
  const deadline = parseRuDate(dateText);
  const now = new Date();
  const monthsLeft = deadline && deadline > now ? Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (30.44 * 86400000))) : 0;
  const remain = Number.isFinite(targetNum) && Number.isFinite(currentNum) ? Math.max(targetNum - currentNum, 0) : 0;
  const monthly = monthsLeft > 0 ? remain / monthsLeft : 0;
  const ideas = [
    t("dialogs.goal_idea_vacation", "Отпуск"), t("dialogs.goal_idea_reserve", "Подушка безопасности"),
    t("dialogs.goal_idea_car", "Машина"), t("dialogs.goal_idea_home", "Квартира"), t("dialogs.goal_idea_laptop", "Ноутбук"),
  ];
  const linkable = accounts.filter((a) => a.currency === currency && a.type !== "brokerage");
  const invalid = !name.trim() || !Number.isFinite(targetNum) || targetNum <= 0;

  const pickSpan = (m: number) => { setMonths(m); setDateText(format(addMonths(new Date(), m), "dd.MM.yyyy")); };
  const spanLabel = (m: number) => {
    if (m < 12) return `${m} ${t("dialogs.goal_months_short", "мес.")}`;
    const y = m / 12;
    return `${y} ${y === 1 ? t("dialogs.goal_year_one", "год") : y < 5 ? t("dialogs.goal_year_few", "года") : t("dialogs.goal_year_many", "лет")}`;
  };

  const save = async () => {
    if (saving) return;
    if (!name.trim()) { setError(t("savings.validation.name", "Укажите название цели")); return; }
    if (!Number.isFinite(targetNum) || targetNum <= 0) { setError(t("savings.validation.target", "Укажите целевую сумму больше нуля")); return; }
    if (!Number.isFinite(currentNum) || currentNum < 0) { setError(t("savings.validation.current", "Накопленная сумма не может быть отрицательной")); return; }
    if (dateText.trim() && !deadline) { setError(t("transactions.dialog.bad_date")); return; }
    const data = {
      name: name.trim(),
      targetAmount: targetNum,
      currentAmount: currentNum,
      deadline: deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).toISOString() : undefined,
      currency,
      linkedAccountId: linked !== "none" ? Number(linked) : undefined,
    };
    setSaving(true);
    setError(null);
    try {
      if (goal) { await updateGoal(goal.id, data); onOpenChange(false); }
      else { await addGoal(data as Goal); setDone(data.name); }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error", "Ошибка"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader className="pr-10">
          <DialogTitle>{goal ? t("savings.dialog.edit_title", "Изменить цель") : t("dialogs.goal_new", "Создать новую цель")}</DialogTitle>
          <DialogDescription>{t("dialogs.goal_desc", "Назовите цель и срок, мы посчитаем, сколько откладывать")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <DoneScreen
            title={t("dialogs.goal_done", "Цель создана")}
            lines={[done]}
            actions={
              <>
                <GhostBtn className="min-h-11" onClick={() => { setDone(null); setName(""); setTarget(""); setCurrent(""); setDateText(""); setMonths(null); }}>{t("dialogs.goal_more", "Создать ещё")}</GhostBtn>
                <PrimaryBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("transactions.dialog.done")}</PrimaryBtn>
              </>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div>
              <Lbl htmlFor="goal-name">{t("dialogs.goal_name", "Название цели")}</Lbl>
              <Fld><input id="goal-name" className={fldInput} autoComplete="off" placeholder={t("dialogs.goal_name_ph", "напр. Новая машина")} value={name} onChange={(e) => setName(e.target.value)} /></Fld>
              {!goal && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {ideas.map((idea) => <Chip key={idea} className="min-h-11" onClick={() => setName(idea)}>{idea}</Chip>)}
                </div>
              )}
            </div>

            <div>
              <Lbl htmlFor="goal-target">{t("savings.dialog.target_label", "Целевая сумма")}</Lbl>
              <Fld big suffix={<Suffix big>{sym}</Suffix>}>
                <input id="goal-target" inputMode="decimal" autoComplete="off" className={fldInputBig} placeholder="0" value={target} onChange={(e) => { if (/^[\d\s.,+]*$/.test(e.target.value)) setTarget(e.target.value); }} />
              </Fld>
              <div role="group" aria-label={t("dialogs.goal_currency", "Валюта цели")} className="mt-2.5 flex flex-wrap gap-1.5">
                {CURRENCIES.map((cur) => (
                  <CurBtn key={cur} active={currency === cur} title={cur} aria-label={cur} onClick={() => { setCurrency(cur); setLinked("none"); }}>{CURRENCY_SYMBOL[cur]}</CurBtn>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <Lbl htmlFor="goal-current">{t("savings.dialog.current_label", "Уже накоплено")}</Lbl>
                <Fld suffix={<Suffix>{sym}</Suffix>}>
                  <input id="goal-current" inputMode="decimal" autoComplete="off" className={fldInput} placeholder="0" value={current} onChange={(e) => { if (/^[\d\s.,+]*$/.test(e.target.value)) setCurrent(e.target.value); }} />
                </Fld>
              </div>
              <div className="min-w-0 flex-1">
                <Lbl htmlFor="goal-date">{t("dialogs.goal_date", "Дата цели")}</Lbl>
                <Fld>
                  <input id="goal-date" className={fldInput} autoComplete="off" placeholder={format(addMonths(new Date(), 12), "dd.MM.yyyy")} value={dateText} onChange={(e) => { setDateText(e.target.value); setMonths(null); }} />
                </Fld>
              </div>
            </div>
            <div className="-mt-1.5 flex flex-wrap gap-2">
              {SPAN_MONTHS.map((m) => (
                <Chip key={m} small active={months === m} className="min-h-11" onClick={() => pickSpan(m)}>{spanLabel(m)}</Chip>
              ))}
            </div>

            <Card className="flex flex-col gap-1.5" style={monthly > 0 ? { borderColor: "rgba(198,242,78,0.35)" } : undefined}>
              <div className="text-[12.5px] text-[#8D9388]">{t("dialogs.goal_to_save", "Чтобы успеть, откладывайте")}</div>
              <div className="text-2xl font-bold tabular-nums" style={monthly > 0 ? { color: "#C6F24E" } : undefined}>
                {monthly > 0 ? `${fmtMoney(monthly, currency)} ${t("dialogs.goal_per_month", "в месяц")}` : "—"}
              </div>
              <div className="text-[12.5px] text-[#A2A89C]">
                {monthly > 0
                  ? t("dialogs.goal_note", "Осталось накопить {{remain}} за {{n}} мес.", { remain: fmtMoney(remain, currency), n: monthsLeft })
                  : t("dialogs.goal_note_empty", "Укажите сумму и дату цели — посчитаем ежемесячный взнос.")}
              </div>
            </Card>

            <div>
              <Lbl htmlFor="goal-link" hint={t("dialogs.optional", "необязательно")}>{t("dialogs.goal_link", "Откуда пополнять")}</Lbl>
              <Fld>
                <select id="goal-link" value={linked} onChange={(e) => setLinked(e.target.value)} className="min-h-11 w-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-foreground outline-none [&>option]:bg-card">
                  <option value="none">{t("dialogs.goal_link_none", "Не привязывать счёт")}</option>
                  {linkable.map((a) => <option key={a.id} value={a.id}>{a.name} · {CURRENCY_SYMBOL[a.currency]}</option>)}
                </select>
              </Fld>
            </div>

            <ModalActions>
              <GhostBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("common.cancel", "Отмена")}</GhostBtn>
              <PrimaryBtn className="min-h-11" disabled={invalid || saving} onClick={save}>
                {saving ? t("common.loading", "Сохраняем…") : t("dialogs.goal_save", "Сохранить цель")}
              </PrimaryBtn>
            </ModalActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
