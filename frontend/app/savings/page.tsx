"use client";

import { useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { cn, convertCurrency, getCurrencySymbol, getExchangeRate } from "@/lib/utils";
import { fmtMoney, fmtNum, shortMoney, plural, goalColor, withAlpha } from "@/lib/plutus-format";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  TrendingUp,
  Calendar,
  Calculator,
  ChevronDown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Goal } from "@/types";
import { GoalDialog } from "@/components/savings/goal-dialog";
import { TopUpDialog } from "@/components/savings/topup-dialog";
import { format } from "date-fns";

const NBSP = " ";

export default function SavingsPage() {
  const { t } = useTranslation();
  const { goals, addGoal, updateGoal, deleteGoal, defaultCurrency } = useStore();

  // ---- create / edit dialog (logic preserved from the previous page)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState<string | undefined>(undefined);

  // ---- top-up dialog
  const [topUpGoal, setTopUpGoal] = useState<Goal | null>(null);

  // ---- calculator
  const [sel, setSel] = useState<string>("custom");
  const [start, setStart] = useState("0");
  const [contrib, setContrib] = useState("500");
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState("5");
  const [showTable, setShowTable] = useState(false);
  const calcRef = useRef<HTMLElement | null>(null);

  const mesLabel = t("savings.mes", "мес.");
  const dur = (m: number) => {
    const y = Math.floor(m / 12);
    const r = m % 12;
    const yWord = plural(
      y,
      t("savings.year_one", "год"),
      t("savings.year_few", "года"),
      t("savings.year_many", "лет")
    );
    if (!y) return `${r} ${mesLabel}`;
    return `${y} ${yWord}${r ? ` ${r} ${mesLabel}` : ""}`;
  };

  const monthsTo = (deadline: string) =>
    Math.max(
      1,
      Math.round((new Date(deadline).getTime() - Date.now()) / 86400000 / 30.4375)
    );

  // ---- goals view-model
  const gv = useMemo(() => {
    return goals.map((g, idx) => {
      const left = g.deadline ? monthsTo(g.deadline) : null;
      const remain = Math.max(0, g.targetAmount - g.currentAmount);
      const need = left ? remain / left : null;
      const pct =
        g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
      const isShield =
        /emergen|резерв|подушк|fund|защит/i.test(g.name) || idx === 0;
      return { g, left, remain, need, pct, isShield };
    });
  }, [goals]);

  const toUsd = (v: number, cur: string) => convertCurrency(v, cur, defaultCurrency);

  const summary = useMemo(() => {
    const saved = gv.reduce((s, x) => s + toUsd(x.g.currentAmount, x.g.currency), 0);
    const target = gv.reduce((s, x) => s + toUsd(x.g.targetAmount, x.g.currency), 0);
    const perMonth = gv.reduce(
      (s, x) => s + (x.need ? toUsd(x.need, x.g.currency) : 0),
      0
    );
    const withDeadline = gv.filter((x) => x.left !== null);
    const nearest = withDeadline.sort((a, b) => a.left! - b.left!)[0] || null;
    const pctNum = target > 0 ? (saved / target) * 100 : 0;
    const hasForeign = gv.some((x) => x.g.currency !== defaultCurrency);
    return { saved, target, perMonth, nearest, pctNum, hasForeign };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gv, defaultCurrency]);

  // ---- dialog handlers
  const handleOpenDialog = (goal?: Goal, preset?: string) => {
    setError(null);
    setEditingGoal(goal ?? null);
    setPresetName(preset);
    setIsDialogOpen(true);
  };

  const handleDelete = async (goal: Goal) => {
    if (confirm(t("savings.delete_confirm", "Удалить цель?"))) {
      try {
        await deleteGoal(goal.id);
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : t("common.error", "Ошибка"));
      }
    }
  };

  // ---- calculator math (ported from the design)
  const selected = gv.find((x) => String(x.g.id) === sel) || null;
  const sym = getCurrencySymbol(selected ? selected.g.currency : defaultCurrency);

  const pickGoal = (x: (typeof gv)[number]) => {
    setSel(String(x.g.id));
    setStart(String(x.g.currentAmount));
    setContrib(String(Math.round(x.need ?? x.remain / 60)));
    setMonths(Math.min(360, x.left ?? 60));
  };
  const pickCustom = () => {
    setSel("custom");
    setStart("0");
    setContrib("500");
    setMonths(60);
  };
  const calcForGoal = (x: (typeof gv)[number]) => {
    pickGoal(x);
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const calc = useMemo(() => {
    const num = (s: string, d: number, lo: number, hi: number) => {
      const v = parseFloat(String(s).replace(",", ".").replace(/\s/g, ""));
      if (!Number.isFinite(v)) return d;
      return Math.min(hi, Math.max(lo, v));
    };
    const P0 = num(start, 0, 0, 1e9);
    const c = num(contrib, 0, 0, 1e8);
    const r = num(rate, 0, 0, 100);
    const M = Math.round(Math.min(360, Math.max(1, Number(months) || 1)));
    const i = r / 1200;
    const bal = (m: number) =>
      i === 0 ? P0 + c * m : P0 * Math.pow(1 + i, m) + (c * (Math.pow(1 + i, m) - 1)) / i;
    const paid = (m: number) => P0 + c * m;

    const final = bal(M);
    const paidIn = paid(M);
    const interest = final - paidIn;

    // status vs selected goal
    const target = selected ? selected.g.targetAmount : 0;
    let reachM: number | null = null;
    if (selected) {
      if (P0 >= target) reachM = 0;
      else {
        for (let m = 1; m <= 1200; m++) {
          if (bal(m) >= target) {
            reachM = m;
            break;
          }
        }
      }
    }
    let needInt = 0;
    if (selected && selected.left) {
      const L = selected.left;
      const g1 = Math.pow(1 + i, L);
      needInt =
        i === 0
          ? Math.max(0, (target - P0) / L)
          : Math.max(0, ((target - P0 * g1) * i) / (g1 - 1));
    }

    // chart
    const maxV = Math.max(final, selected ? target : 0, 1);
    const rawStep = maxV / 4;
    const pw = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let st = pw * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pw >= rawStep) {
        st = k * pw;
        break;
      }
    }
    const top = st * Math.ceil(maxV / st) || 1;
    const px = (m: number) => (m / M) * 100;
    const py = (v: number) => 100 - (v / top) * 100;
    const stepM = Math.max(1, Math.ceil(M / 120));
    const balPts: string[] = [];
    const paidPts: string[] = [];
    for (let m = 0; m <= M; m += stepM) {
      balPts.push(`${px(m).toFixed(2)},${py(bal(m)).toFixed(2)}`);
      paidPts.push(`${px(m).toFixed(2)},${py(paid(m)).toFixed(2)}`);
    }
    if (M % stepM !== 0) {
      balPts.push(`100,${py(final).toFixed(2)}`);
      paidPts.push(`100,${py(paidIn).toFixed(2)}`);
    }
    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= top + 1e-6; v += st) {
      yTicks.push({ top: py(v), label: shortMoney(v) });
    }
    const monthAxis = M <= 24;
    const xTicks: { left: number; label: string }[] = [];
    for (let k = 0; k <= 4; k++) {
      const m = Math.round((M * k) / 4);
      xTicks.push({
        left: px(m),
        label: monthAxis
          ? String(m)
          : String(Math.round((m / 12) * 10) / 10).replace(".", ","),
      });
    }

    // yearly table
    const rows: { label: string; paid: number; interest: number; balance: number }[] = [];
    const Y = Math.ceil(M / 12);
    for (let y = 1; y <= Y; y++) {
      const m = Math.min(y * 12, M);
      const b = bal(m);
      const pd = paid(m);
      rows.push({
        label:
          y === Y && M % 12
            ? dur(M)
            : `${y} ${plural(y, t("savings.year_one", "год"), t("savings.year_few", "года"), t("savings.year_many", "лет"))}`,
        paid: pd,
        interest: b - pd,
        balance: b,
      });
    }

    return {
      M,
      P0,
      c,
      r,
      final,
      paidIn,
      interest,
      target,
      reachM,
      needInt,
      top,
      py,
      px,
      bal: balPts.join(" "),
      paidLine: paidPts.join(" "),
      area: `${balPts.join(" ")} 100,100 0,100`,
      yTicks,
      xTicks,
      monthAxis,
      rows,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, contrib, months, rate, selected]);

  const chipCls = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors",
      active
        ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#C6F24E]"
        : "border-[#2A2E27] text-[#C9CEC3] hover:border-[#5A6054] hover:text-[#F1F3EE]"
    );

  const fieldCls =
    "flex h-[46px] items-center gap-2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-4 focus-within:border-[#C6F24E]";
  const inputCls =
    "min-w-0 flex-1 bg-transparent text-base font-semibold text-[#F1F3EE] outline-none";

  // status banner
  const status = useMemo(() => {
    if (!selected) return null;
    const curSym = getCurrencySymbol(selected.g.currency);
    const needTxt =
      selected.left && selected.g.deadline
        ? `${t("savings.status.need_prefix", "Чтобы успеть к")} ${format(new Date(selected.g.deadline), "dd.MM.yyyy")}, ${t("savings.status.need_mid", "откладывайте")} ≈ ${fmtMoney(calc.needInt, selected.g.currency)} ${t("savings.status.need_suffix", "в месяц с учётом процентов.")}`
        : "";
    if (calc.reachM === null) {
      return {
        bg: "rgba(248,113,113,0.08)",
        border: "rgba(248,113,113,0.3)",
        dot: "#F87171",
        mark: "!",
        title: t("savings.status.unreachable", "Цель недостижима при таких параметрах"),
        text: `${t("savings.status.unreachable_text", "Даже за 100 лет сумма не дойдёт до")} ${fmtMoney(calc.target, selected.g.currency)}. ${t("savings.status.increase", "Увеличьте взнос.")}`,
        hint: needTxt,
      };
    }
    if (selected.left === null) {
      return {
        bg: "rgba(110,231,160,0.08)",
        border: "rgba(110,231,160,0.3)",
        dot: "#6EE7A0",
        mark: "✓",
        title: t("savings.status.reachable", "Цель достижима"),
        text:
          calc.reachM === 0
            ? t("savings.status.done", "Цель уже достигнута.")
            : `${t("savings.status.will_take", "Цель будет собрана за")} ${dur(calc.reachM)}.`,
        hint: "",
      };
    }
    if (calc.reachM <= selected.left) {
      const diff = selected.left - calc.reachM;
      return {
        bg: "rgba(110,231,160,0.08)",
        border: "rgba(110,231,160,0.3)",
        dot: "#6EE7A0",
        mark: "✓",
        title: t("savings.status.in_time", "Успеете к сроку"),
        text:
          calc.reachM === 0
            ? t("savings.status.done", "Цель уже достигнута.")
            : `${t("savings.status.goal", "Цель")} «${selected.g.name}» ${t("savings.status.will_be", "будет собрана за")} ${dur(calc.reachM)}${diff > 0 ? `, ${t("savings.status.earlier", "это на")} ${dur(diff)} ${t("savings.status.earlier_suffix", "раньше срока.")}` : `, ${t("savings.status.exactly", "точно в срок.")}`}`,
        hint: needTxt,
      };
    }
    return {
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.3)",
      dot: "#FBBF24",
      mark: "!",
      title: t("savings.status.late", "Не успеете к сроку"),
      text: `${t("savings.status.takes", "Понадобится")} ${dur(calc.reachM)}, ${t("savings.status.later", "это на")} ${dur(calc.reachM - selected.left)} ${t("savings.status.later_suffix", "позже срока")}${selected.g.deadline ? ` (${format(new Date(selected.g.deadline), "dd.MM.yyyy")})` : ""}.`,
      hint: needTxt,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, calc, t]);

  const hasReach =
    !!selected && calc.reachM !== null && calc.reachM > 0 && calc.reachM <= calc.M;

  const templates = [
    t("savings.tpl.vacation", "Отпуск"),
    t("savings.tpl.downpayment", "Первый взнос"),
    t("savings.tpl.car", "Покупка авто"),
    t("savings.tpl.education", "Образование"),
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 md:pb-6 text-[#F1F3EE]">
        {/* HEADER */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">
              {t("savings.page_title", "Цели и накопления")}
            </h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {t(
                "savings.page_subtitle",
                "Сколько уже накоплено, когда срок и сколько откладывать каждый месяц"
              )}
            </p>
          </div>
          <button
            onClick={() => handleOpenDialog()}
            className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-[18px] text-sm font-semibold text-[#10170A]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t("savings.new_goal", "Новая цель")}
          </button>
        </header>

        {error && !isDialogOpen && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* SUMMARY */}
        <section className="flex flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
          <div className="flex flex-wrap items-end justify-between gap-x-14 gap-y-6">
            <div>
              <div className="text-[13px] font-medium text-[#8D9388]">
                {t("savings.sum_saved", "Накоплено по всем целям")}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                <span className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
                  {summary.hasForeign ? "≈ " : ""}
                  {fmtMoney(summary.saved, defaultCurrency)}
                </span>
                <span className="text-[15px] text-[#8D9388]">
                  {t("savings.of", "из")} {fmtMoney(summary.target, defaultCurrency)} ·{" "}
                  {Math.round(summary.pctNum)}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-11 gap-y-4">
              <div>
                <div className="text-[13px] font-medium text-[#8D9388]">
                  {t("savings.per_month", "Откладывать в месяц")}
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {summary.perMonth > 0
                    ? `≈ ${fmtMoney(summary.perMonth, defaultCurrency)}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#8D9388]">
                  {t("savings.next_deadline", "Ближайший срок")}
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {summary.nearest?.g.deadline ? (
                    <>
                      {format(new Date(summary.nearest.g.deadline), "dd.MM.yyyy")}{" "}
                      <span className="text-[13px] font-medium text-[#8D9388]">
                        {summary.nearest.g.name}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#8D9388]">
                  {t("savings.active_goals", "Активных целей")}
                </div>
                <div className="mt-1 text-xl font-semibold">{goals.length}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-[4px] bg-[#232721]">
              <div
                className="h-2 rounded-[4px] bg-[#C6F24E]"
                style={{ width: `${Math.min(100, summary.pctNum).toFixed(1)}%` }}
              />
            </div>
            {summary.hasForeign && (
              <p className="mt-2 text-[12.5px] text-[#8D9388]">
                {t("savings.fx_note_1", "Суммы в разных валютах приведены к доллару по курсу")}{" "}
                {fmtNum(getExchangeRate("USD", "RUB"), 2)}
                {NBSP}₽ {t("savings.fx_note_2", "за")} 1{NBSP}$.
              </p>
            )}
          </div>
        </section>

        {/* GOALS */}
        <div className="flex flex-wrap items-stretch gap-5">
          {gv.map((x, gi) => (
            <article
              key={x.g.id}
              className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] p-6"
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: withAlpha(goalColor(gi), 0.12), color: goalColor(gi) }}>
                  {x.isShield ? (
                    <Shield className="h-[22px] w-[22px]" strokeWidth={1.8} />
                  ) : (
                    <TrendingUp className="h-[22px] w-[22px]" strokeWidth={1.8} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold">{x.g.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[#8D9388]">
                    {x.g.deadline && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-[13px] w-[13px]" strokeWidth={1.8} />
                        {t("savings.until", "до")}{" "}
                        {format(new Date(x.g.deadline), "dd.MM.yyyy")}
                      </span>
                    )}
                    <span className="rounded-full bg-[#1E211C] px-2 py-0.5 text-[11.5px] font-semibold text-[#C9CEC3]">
                      {x.g.currency}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button
                    aria-label={`${t("common.edit", "Изменить")} ${x.g.name}`}
                    onClick={() => handleOpenDialog(x.g)}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F1F3EE]"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={`${t("common.delete", "Удалить")} ${x.g.name}`}
                    onClick={() => handleDelete(x.g)}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F87171]"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[30px] font-bold tracking-[-0.02em]">
                    {fmtMoney(x.g.currentAmount, x.g.currency)}
                  </span>
                  <span className="text-[13.5px] text-[#8D9388]">
                    {t("savings.of", "из")} {fmtMoney(x.g.targetAmount, x.g.currency)}
                  </span>
                </div>
                <div className="relative mt-3.5 h-2.5 rounded-[5px] bg-[#232721]">
                  <div
                    className="h-2.5 rounded-[5px]"
                    style={{ width: `${x.pct}%`, background: goalColor(gi) }}
                  />
                  <span className="absolute left-1/4 top-0 h-2.5 w-0.5 bg-[#151714]" />
                  <span className="absolute left-1/2 top-0 h-2.5 w-0.5 bg-[#151714]" />
                  <span className="absolute left-3/4 top-0 h-2.5 w-0.5 bg-[#151714]" />
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#8D9388]">
                  <span>0%</span>
                  <span className="font-bold" style={{ color: goalColor(gi) }}>{x.pct}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-7 gap-y-4 border-t border-[#232721] pt-4">
                <div className="flex-[1_1_90px]">
                  <div className="text-[12.5px] text-[#8D9388]">
                    {t("savings.remain", "Осталось собрать")}
                  </div>
                  <div className="mt-[3px] font-semibold">
                    {fmtMoney(x.remain, x.g.currency)}
                  </div>
                </div>
                <div className="flex-[1_1_90px]">
                  <div className="text-[12.5px] text-[#8D9388]">
                    {t("savings.until_deadline", "До срока")}
                  </div>
                  <div className="mt-[3px] font-semibold">
                    {x.left !== null ? dur(x.left) : "—"}
                  </div>
                </div>
                <div className="flex-[1_1_90px]">
                  <div className="text-[12.5px] text-[#8D9388]">
                    {t("savings.need_month", "Нужно в месяц")}
                  </div>
                  <div className="mt-[3px] font-semibold">
                    {x.need !== null
                      ? `≈ ${fmtMoney(x.need, x.g.currency)} / ${mesLabel}`
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex gap-2.5">
                <button
                  onClick={() => {
                    setTopUpGoal(x.g);
                  }}
                  className="h-[42px] flex-1 rounded-xl bg-[#C6F24E] text-sm font-semibold text-[#10170A]"
                >
                  {t("savings.top_up", "Пополнить")}
                </button>
                <button
                  onClick={() => calcForGoal(x)}
                  className="h-[42px] flex-1 rounded-xl border border-[#2A2E27] bg-transparent text-sm font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                >
                  {t("savings.calc_term", "Рассчитать срок")}
                </button>
              </div>
            </article>
          ))}

          {/* CREATE CARD */}
          <article className="flex min-w-0 flex-[1_1_340px] flex-col justify-center gap-[18px] rounded-[20px] border border-dashed border-[#2A2E27] p-6">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#1E211C] text-[#C9CEC3]">
                <Plus className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-xl font-semibold">
                  {t("savings.create_title", "Создать новую цель")}
                </h2>
                <p className="mt-[3px] text-[13px] text-[#8D9388]">
                  {t("savings.create_subtitle", "Начните с шаблона или задайте свою")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((name) => (
                <button
                  key={name}
                  onClick={() => handleOpenDialog(undefined, name)}
                  className="rounded-full border border-[#2A2E27] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#C9CEC3] transition-colors hover:border-[#C6F24E] hover:text-[#C6F24E]"
                >
                  {name}
                </button>
              ))}
              <button
                onClick={() => handleOpenDialog()}
                className="rounded-full border border-[#2A2E27] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#C9CEC3] transition-colors hover:border-[#C6F24E] hover:text-[#C6F24E]"
              >
                {t("savings.tpl.custom", "Своя цель")}
              </button>
            </div>
          </article>
        </div>

        {/* CALCULATOR */}
        <section
          ref={calcRef}
          className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]"
        >
          <div className="flex items-start gap-3.5 border-b border-[#232721] px-7 py-6">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
              <Calculator className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {t("savings.calc_title", "Калькулятор накоплений")}
              </h2>
              <p className="mt-1 text-[13.5px] text-[#8D9388]">
                {t(
                  "savings.calc_subtitle",
                  "Выберите цель, чтобы проверить, успеваете ли вы к сроку, или посчитайте рост своей суммы. Проценты начисляются ежемесячно."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-8 p-7">
            {/* controls */}
            <div className="flex min-w-[260px] flex-[0_1_380px] flex-col gap-[22px]">
              <div>
                <div className="mb-2.5 text-[13px] font-medium text-[#C9CEC3]">
                  {t("savings.calc_for", "Для чего считаем")}
                </div>
                <div role="group" className="flex flex-wrap gap-2">
                  <button onClick={pickCustom} className={chipCls(sel === "custom")}>
                    {t("savings.own_amount", "Своя сумма")}
                  </button>
                  {gv.map((x) => (
                    <button
                      key={x.g.id}
                      onClick={() => pickGoal(x)}
                      className={chipCls(sel === String(x.g.id))}
                    >
                      {x.g.name}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("savings.already_saved", "Уже накоплено")}
                <span className={fieldCls}>
                  <input
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">{sym}</span>
                </span>
              </label>

              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("savings.monthly_contrib", "Ежемесячный взнос")}
                <span className={fieldCls}>
                  <input
                    value={contrib}
                    onChange={(e) => setContrib(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">
                    {sym} / {mesLabel}
                  </span>
                </span>
              </label>

              <div>
                <div className="flex items-baseline justify-between text-[13px] font-medium text-[#C9CEC3]">
                  <label htmlFor="term">{t("savings.term", "Срок")}</label>
                  <span className="text-[15px] font-bold text-[#F1F3EE]">
                    {dur(calc.M)}
                  </span>
                </div>
                <input
                  id="term"
                  type="range"
                  min={1}
                  max={360}
                  step={1}
                  value={calc.M}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="mb-1.5 mt-3.5 w-full"
                  style={{ accentColor: "#C6F24E" }}
                />
                <div className="flex justify-between text-xs text-[#8D9388]">
                  <span>1 {mesLabel}</span>
                  <span>30 {t("savings.year_many", "лет")}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[12, 36, 60, 120, 240].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMonths(m)}
                      className={cn(chipCls(calc.M === m), "px-3 py-1.5 text-[12.5px]")}
                    >
                      {dur(m)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                  {t("savings.annual_rate", "Годовая ставка")}
                  <span className={fieldCls}>
                    <input
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className={inputCls}
                    />
                    <span className="font-medium text-[#8D9388]">
                      % {t("savings.per_year", "в год")}
                    </span>
                  </span>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[3, 5, 7, 10].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRate(String(r))}
                      className={cn(chipCls(calc.r === r), "px-3 py-1.5 text-[12.5px]")}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* results */}
            <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
              <div className="rounded-2xl border border-[#232721] bg-[#121411] p-7">
                <div className="text-[13.5px] text-[#8D9388]">
                  {t("savings.total_after", "Итого через")} {dur(calc.M)}
                </div>
                <div className="mt-1.5 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-[#C6F24E]">
                  {fmtNum(calc.final)}
                  {NBSP}
                  {sym}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[#C9CEC3]">
                  <span>
                    {t("savings.paid_in", "Всего внесёте")}:{" "}
                    <b className="font-semibold text-[#F1F3EE]">
                      {fmtNum(calc.paidIn)}
                      {NBSP}
                      {sym}
                    </b>
                  </span>
                  <span>
                    {t("savings.interest", "Проценты")}:{" "}
                    <b className="font-semibold text-[#6EE7A0]">
                      +{fmtNum(calc.interest)}
                      {NBSP}
                      {sym}
                    </b>
                  </span>
                </div>

                <div className="mt-[22px]">
                  <div className="flex h-2.5 overflow-hidden rounded-[5px]">
                    <span
                      className="border-r-2 border-[#121411] bg-[#8D9388]"
                      style={{ flex: `${Math.max(0, calc.P0)} 1 0%` }}
                    />
                    <span
                      className="border-r-2 border-[#121411] bg-[#7DD3FC]"
                      style={{ flex: `${Math.max(0, calc.c * calc.M)} 1 0%` }}
                    />
                    <span
                      className="bg-[#C6F24E]"
                      style={{ flex: `${Math.max(0, calc.interest)} 1 0%` }}
                    />
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2.5 text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[3px] bg-[#8D9388]" />
                      <span className="text-[#8D9388]">
                        {t("savings.already_saved", "Уже накоплено")}
                      </span>
                      <b className="font-semibold">
                        {fmtNum(calc.P0)}
                        {NBSP}
                        {sym}
                      </b>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[3px] bg-[#7DD3FC]" />
                      <span className="text-[#8D9388]">
                        {t("savings.contribs", "Взносы")}
                      </span>
                      <b className="font-semibold">
                        {fmtNum(calc.c * calc.M)}
                        {NBSP}
                        {sym}
                      </b>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[3px] bg-[#C6F24E]" />
                      <span className="text-[#8D9388]">
                        {t("savings.interest", "Проценты")}
                      </span>
                      <b className="font-semibold">
                        {fmtNum(calc.interest)}
                        {NBSP}
                        {sym}
                      </b>
                    </span>
                  </div>
                </div>
              </div>

              {status && (
                <div
                  className="flex items-start gap-3.5 rounded-2xl border p-5"
                  style={{ background: status.bg, borderColor: status.border }}
                >
                  <span
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[15px] font-bold text-[#10170A]"
                    style={{ background: status.dot }}
                  >
                    {status.mark}
                  </span>
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: status.dot }}>
                      {status.title}
                    </div>
                    <div className="mt-1 text-[13.5px] text-[#C9CEC3]">{status.text}</div>
                    {status.hint && (
                      <div className="mt-1.5 text-[13px] text-[#8D9388]">
                        {status.hint}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* chart */}
              <div>
                <div className="mb-[22px] flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <span className="text-sm font-semibold">
                    {t("savings.chart_title", "Как растёт сумма")}
                  </span>
                  <span className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] text-[#8D9388]">
                    <span className="flex items-center gap-2">
                      <span className="h-[3px] w-3.5 rounded-sm bg-[#C6F24E]" />
                      {t("savings.balance", "Баланс")}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-[3px] w-3.5 rounded-sm bg-[#8D9388]" />
                      {t("savings.only_contribs", "Только взносы")}
                    </span>
                    {selected && (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 border-t-2 border-dashed border-[#FBBF24]" />
                        {t("savings.goal_line", "Цель")}
                      </span>
                    )}
                  </span>
                </div>
                <div className="relative ml-16 h-[260px]">
                  {calc.yTicks.map((tk, i) => (
                    <div key={i}>
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-[#232721]"
                        style={{ top: `${tk.top}%` }}
                      />
                      <div
                        className="absolute -left-16 w-14 -translate-y-1/2 text-right text-xs text-[#8D9388]"
                        style={{ top: `${tk.top}%` }}
                      >
                        {tk.label}
                      </div>
                    </div>
                  ))}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-0 h-full w-full overflow-visible"
                  >
                    <polygon points={calc.area} fill="rgba(198,242,78,0.07)" stroke="none" />
                    <polyline
                      points={calc.paidLine}
                      fill="none"
                      stroke="#8D9388"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={calc.bal}
                      fill="none"
                      stroke="#C6F24E"
                      strokeWidth={3}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {selected && (
                    <>
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-[#FBBF24]"
                        style={{ top: `${calc.py(calc.target)}%` }}
                      />
                      <span
                        className="absolute right-0 -translate-y-[130%] rounded-md bg-[#2A2410] px-2 py-0.5 text-xs font-semibold text-[#FBBF24]"
                        style={{ top: `${calc.py(calc.target)}%` }}
                      >
                        {t("savings.goal_line", "Цель")} {fmtMoney(calc.target, selected.g.currency)}
                      </span>
                    </>
                  )}
                  {hasReach && (
                    <span
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6F24E] shadow-[0_0_0_4px_#151714]"
                      style={{
                        left: `${calc.px(calc.reachM!)}%`,
                        top: `${calc.py(calc.target)}%`,
                      }}
                    />
                  )}
                </div>
                <div className="relative ml-16 mt-2.5 h-[22px]">
                  {calc.xTicks.map((xt, i) => (
                    <span
                      key={i}
                      className="absolute top-0 -translate-x-1/2 text-xs text-[#8D9388]"
                      style={{ left: `${xt.left}%` }}
                    >
                      {xt.label}
                    </span>
                  ))}
                </div>
                <div className="ml-16 mt-0.5 text-center text-xs text-[#8D9388]">
                  {calc.monthAxis
                    ? t("savings.months_axis", "месяцы")
                    : t("savings.years_axis", "годы")}
                </div>
              </div>

              {/* yearly table */}
              <div>
                <button
                  onClick={() => setShowTable(!showTable)}
                  aria-expanded={showTable}
                  className="flex h-10 items-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent px-4 text-[13.5px] font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                >
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", showTable && "rotate-180")}
                    strokeWidth={2}
                  />
                  {showTable
                    ? t("savings.hide_table", "Скрыть таблицу по годам")
                    : t("savings.show_table", "Показать таблицу по годам")}
                </button>
                {showTable && (
                  <div className="mt-3.5 overflow-hidden rounded-[14px] border border-[#232721]">
                    <div className="max-h-[300px] overflow-auto">
                      <div className="min-w-[480px]">
                        <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-3 bg-[#121411] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388]">
                          <span>{t("savings.col_period", "Период")}</span>
                          <span className="text-right">{t("savings.col_paid", "Внесено")}</span>
                          <span className="text-right">{t("savings.interest", "Проценты")}</span>
                          <span className="text-right">{t("savings.col_balance", "Баланс")}</span>
                        </div>
                        {calc.rows.map((rw, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-3 border-t border-[#1E211C] px-5 py-3 text-[13.5px]"
                          >
                            <span className="text-[#C9CEC3]">{rw.label}</span>
                            <span className="text-right">
                              {fmtNum(rw.paid)}
                              {NBSP}
                              {sym}
                            </span>
                            <span className="text-right text-[#6EE7A0]">
                              +{fmtNum(rw.interest)}
                              {NBSP}
                              {sym}
                            </span>
                            <span className="text-right font-semibold">
                              {fmtNum(rw.balance)}
                              {NBSP}
                              {sym}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CREATE / EDIT DIALOG */}
        <GoalDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} goal={editingGoal} presetName={presetName} />

        {/* TOP-UP DIALOG */}
        <TopUpDialog goal={topUpGoal} onClose={() => setTopUpGoal(null)} />
      </div>
    </ProtectedRoute>
  );
}
