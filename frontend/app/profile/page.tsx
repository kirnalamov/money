"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { differenceInCalendarMonths, format, startOfMonth, subMonths } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Award, LogOut, Pencil } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { cn, convertCurrency } from "@/lib/utils";
import { fmtMoney, hashColor, plural, signedMoney } from "@/lib/plutus-format";

const RU_PREP = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const fieldCls = "flex items-center rounded-xl border border-[#2A2E27] bg-[#0E0F0E] focus-within:border-[#C6F24E]";

const initialsOf = (nm: string) => {
  const parts = nm.trim().split(/\s+/).filter((p) => p.length > 0);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
};

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith("ru");
  const dateLocale = isRu ? ru : enUS;
  const { user, updateProfile, logout, isLoading } = useAuth();
  const { transactions, accounts, goals, categories, defaultCurrency, reset } = useStore();

  const [editing, setEditing] = useState(false);
  const [dName, setDName] = useState("");
  const [dGoal, setDGoal] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const name = user?.full_name || user?.username || t("profile.card.placeholder_name");
  const goalText = user?.financial_goal || t("profile.card.placeholder_bio");

  const startEdit = () => {
    setError(null);
    setDName(name);
    setDGoal(user?.financial_goal || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!dName.trim()) {
      setError(t("profile.card.name_required"));
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError(t("profile.passwords_do_not_match"));
      return;
    }
    if (newPassword && !currentPassword) {
      setError(t("profile.current_password_required"));
      return;
    }
    try {
      await updateProfile({
        full_name: dName.trim(),
        financial_goal: dGoal.trim(),
        ...(newPassword ? { current_password: currentPassword, password: newPassword } : {}),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleLogout = () => {
    reset();
    logout();
  };

  const now = useMemo(() => new Date(), []);
  const monthName = (d: Date) => {
    const s = format(d, "LLLL", { locale: dateLocale });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const stats = useMemo(() => {
    const cur = startOfMonth(now);
    const prev = startOfMonth(subMonths(now, 1));
    const conv = (v: number, c: string) => convertCurrency(v, c, defaultCurrency);
    let income = 0;
    let expense = 0;
    let prevExpense = 0;
    const byCat = new Map<string, number>();
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      if (Number.isNaN(d.getTime())) return;
      const v = conv(tx.amount, tx.currency);
      if (d >= cur) {
        if (tx.type === "income") income += v;
        else if (tx.type === "expense") {
          expense += v;
          byCat.set(tx.category, (byCat.get(tx.category) || 0) + v);
        }
      } else if (d >= prev && tx.type === "expense") {
        prevExpense += v;
      }
    });
    const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0] || null;

    const savingsAccounts = accounts.filter((a) => a.type === "savings");
    const savingsTotal = savingsAccounts.reduce((s, a) => s + conv(a.balance, a.currency), 0);
    const topSavings = [...savingsAccounts].sort((a, b) => conv(b.balance, b.currency) - conv(a.balance, a.currency))[0] || null;

    const goalRows = goals.map((g) => {
      const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
      return { g, pct: Math.min(100, Math.round(pct)), remain: Math.max(0, g.targetAmount - g.currentAmount), done: g.currentAmount >= g.targetAmount };
    });
    const doneCount = goalRows.filter((x) => x.done).length;
    const closest = goalRows.filter((x) => !x.done).sort((a, b) => b.pct - a.pct)[0] || null;

    return { income, expense, net: income - expense, prevExpense, top, savingsTotal, topSavings, goalRows, doneCount, closest };
  }, [transactions, accounts, goals, defaultCurrency, now]);

  const catColor = (n: string) => {
    const c = categories.find((x) => x.name === n);
    return c?.color && c.color.toLowerCase() !== "#666666" ? c.color : hashColor(n);
  };

  // ---- expense trend alert
  const trend = (() => {
    const diff = stats.expense - stats.prevExpense;
    const pct = stats.prevExpense > 0 ? (diff / stats.prevExpense) * 100 : null;
    const prevMonth = subMonths(now, 1);
    const prevLabel = isRu ? RU_PREP[prevMonth.getMonth()] : monthName(prevMonth);
    const curLabel = isRu ? RU_PREP[now.getMonth()] : monthName(now);
    const topShare = stats.top && stats.expense > 0 ? (stats.top[1] / stats.expense) * 100 : 0;
    if (pct !== null && pct > 30) {
      return {
        tone: "warn" as const,
        title: t("profile.trend_up_title", "Расходы сильно выросли"),
        text: `${isRu ? "В" : "In"} ${prevLabel} ${t("profile.you_spent", "вы потратили")} ${fmtMoney(stats.prevExpense, defaultCurrency)}, ${isRu ? "в" : "in"} ${curLabel} ${t("profile.already", "уже")} ${fmtMoney(stats.expense, defaultCurrency)}: ${t("profile.that_is", "это на")} ${fmtMoney(diff, defaultCurrency)} ${t("profile.more", "больше")} (+${Math.round(pct).toLocaleString(i18n.language)}%).${stats.top ? ` ${t("profile.main_part", "Основная часть пришлась на")} ${stats.top[0]}.` : ""}`,
        topShare,
      };
    }
    if (pct !== null && pct < -10) {
      return {
        tone: "ok" as const,
        title: t("profile.trend_down_title", "Расходы снизились"),
        text: `${t("profile.spent_less", "В этом месяце вы потратили на")} ${Math.abs(Math.round(pct))}% ${t("profile.less_than", "меньше, чем в прошлом")}. ${t("profile.great_job", "Отличная работа!")}`,
        topShare,
      };
    }
    return {
      tone: "neutral" as const,
      title: t("profile.trend_stable_title", "Расходы под контролем"),
      text: stats.prevExpense > 0 ? t("profile.stable_text", "Расходы почти не изменились по сравнению с прошлым месяцем.") : t("profile.tracking", "Вы отслеживаете свои расходы."),
      topShare,
    };
  })();
  const toneCls = {
    warn: { box: "border-[#FBBF24]/30 bg-[#FBBF24]/[0.08]", dot: "bg-[#FBBF24]", title: "text-[#FBBF24]", btn: "bg-[#FBBF24] text-[#10170A]", ghost: "border-[#5A4A1A]" },
    ok: { box: "border-[#6EE7A0]/30 bg-[#6EE7A0]/[0.08]", dot: "bg-[#6EE7A0]", title: "text-[#6EE7A0]", btn: "bg-[#6EE7A0] text-[#10170A]", ghost: "border-[#1F4A33]" },
    neutral: { box: "border-[#232721] bg-[#121411]", dot: "bg-[#8D9388]", title: "text-[#C9CEC3]", btn: "bg-[#2A2F27] text-[#F1F3EE]", ghost: "border-[#2A2E27]" },
  }[trend.tone];

  // ---- badges
  const safeThreshold = convertCurrency(1000, "USD", defaultCurrency);
  const badges = [
    { title: t("profile.badge_first_op", "Первая операция"), note: t("profile.badge_first_op_note", "Вы начали вести учёт"), done: transactions.length > 0, mark: "✓" },
    { title: t("profile.badge_first_goal", "Первая цель"), note: `${t("profile.badge_first_goal_note", "Создано целей")}: ${goals.length}`, done: goals.length > 0, mark: "✓" },
    { title: t("profile.badge_cushion", "Подушка безопасности"), note: `${t("profile.badge_cushion_note", "Накоплено больше")} ${fmtMoney(safeThreshold, defaultCurrency, 0)}`, done: stats.savingsTotal > safeThreshold, mark: "✓" },
    {
      title: t("profile.badge_goal_done", "Цель выполнена"),
      note: stats.doneCount > 0 ? `${t("profile.badge_goal_done_note", "Выполнено целей")}: ${stats.doneCount}` : stats.closest ? `${t("profile.left_until_first", "Осталось")} ${fmtMoney(stats.closest.remain, stats.closest.g.currency)} ${t("profile.until_first", "до первой")}` : t("profile.goals_hint", "Поставьте цель и начните движение."),
      done: stats.doneCount > 0,
      mark: "4",
    },
  ];
  const earned = badges.filter((b) => b.done).length;

  const monthsWithUs = user?.created_at ? Math.max(0, differenceInCalendarMonths(now, new Date(user.created_at))) : null;
  const sinceText = user?.created_at
    ? `${t("profile.member_since", "С нами с")} ${format(new Date(user.created_at), "MMMM yyyy", { locale: dateLocale })} · ${monthsWithUs} ${plural(monthsWithUs ?? 0, t("profile.month_one", "мес."), t("profile.month_few", "мес."), t("profile.month_many", "мес."))}`
    : t("profile.card.unknown_date");

  const monthTitle = monthName(now);

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
        <header>
          <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("profile.page.title")}</h1>
          <p className="mt-1 text-sm text-[#8D9388]">{t("profile.page_subtitle", "Ваш финансовый центр: итоги месяца, прогресс и достижения")}</p>
        </header>

        <div className="flex flex-wrap items-start gap-5">
          {/* PERSONAL */}
          <section aria-label={t("profile.card.personal_details")} className="box-border flex min-w-0 max-w-[400px] flex-[1_1_320px] flex-col gap-6 rounded-[20px] border border-[#232721] bg-[#151714] p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("profile.card.personal_details")}</h2>
              {!editing && (
                <button
                  onClick={startEdit}
                  className="flex h-9 items-center gap-2 rounded-[10px] border border-[#2A2E27] bg-transparent px-3.5 text-[13px] font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {t("common.edit")}
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#C6F24E]/[0.14] text-[32px] font-bold tracking-[0.02em] text-[#C6F24E]">
                {initialsOf(editing ? dName : name)}
              </span>
              {!editing && <div className="mt-2.5 text-xl font-bold">{name}</div>}
              <div className="text-[13px] text-[#8D9388]">{user?.email}</div>
              <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-[#1E211C] px-3 py-1 text-[12.5px] text-[#C9CEC3]">{sinceText}</div>
            </div>

            {error && <p role="alert" className="text-sm font-medium text-[#F87171]">{error}</p>}

            {editing && (
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("profile.name_label", "Имя")}
                <span className={cn(fieldCls, "h-[46px] px-4")}>
                  <input value={dName} onChange={(e) => setDName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#F1F3EE] outline-none" />
                </span>
              </label>
            )}

            <div>
              <div className="mb-2.5 text-[13px] font-semibold text-[#C9CEC3]">{t("profile.card.financial_goal")}</div>
              {!editing ? (
                <div className="rounded-xl border border-[#232721] bg-[#121411] px-4 py-3.5 italic">«{goalText}»</div>
              ) : (
                <>
                  <span className={cn(fieldCls, "block px-4 py-3")}>
                    <textarea
                      rows={3}
                      aria-label={t("profile.card.financial_goal")}
                      value={dGoal}
                      onChange={(e) => setDGoal(e.target.value)}
                      className="box-border w-full resize-y bg-transparent text-sm text-[#F1F3EE] outline-none"
                    />
                  </span>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[#232721] pt-4">
                    <p className="text-[13px] font-semibold text-[#C9CEC3]">{t("profile.change_password")}</p>
                    {([
                      ["current-password", t("profile.current_password"), currentPassword, setCurrentPassword, "current-password"],
                      ["new-password", t("profile.new_password"), newPassword, setNewPassword, "new-password"],
                      ["confirm-password", t("profile.confirm_password"), confirmPassword, setConfirmPassword, "new-password"],
                    ] as const).map(([id, label, value, setter, auto]) => (
                      <label key={id} htmlFor={id} className="flex flex-col gap-1.5 text-[12.5px] font-medium text-[#8D9388]">
                        {label}
                        <span className={cn(fieldCls, "h-11 px-4")}>
                          <input id={id} type="password" autoComplete={auto} value={value} onChange={(e) => setter(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[#F1F3EE] outline-none" />
                        </span>
                      </label>
                    ))}
                    <p className="text-xs text-[#8D9388]">{t("profile.password_hint")}</p>
                  </div>

                  <div className="mt-3.5 flex gap-2.5">
                    <button onClick={() => void handleSave()} className="h-[42px] flex-1 rounded-xl bg-[#C6F24E] text-sm font-bold text-[#10170A]">{t("common.save")}</button>
                    <button onClick={() => { setEditing(false); setError(null); }} className="h-[42px] flex-1 rounded-xl border border-[#2A2E27] bg-transparent text-sm font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]">{t("common.cancel")}</button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="mt-1 flex h-[42px] items-center justify-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent text-sm font-semibold text-[#A2A89C] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171] disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              {t("profile.logout", "Выйти из аккаунта")}
            </button>
          </section>

          {/* RIGHT */}
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
            <section aria-label={`${t("profile.totals_of", "Итоги")} ${monthTitle}`} className="flex flex-col gap-[22px] rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
                  <Award className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h2 className="text-xl font-semibold">{t("profile.totals_of", "Итоги")} {format(now, "MMMM", { locale: dateLocale })}</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="min-w-[160px] flex-[1_1_160px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="text-[12.5px] text-[#8D9388]">{t("profile.income", "Доходы")}</div>
                  <div className="mt-1.5 text-[22px] font-bold text-[#6EE7A0]">{fmtMoney(stats.income, defaultCurrency)}</div>
                </div>
                <div className="min-w-[160px] flex-[1_1_160px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="text-[12.5px] text-[#8D9388]">{t("profile.expense", "Расходы")}</div>
                  <div className="mt-1.5 text-[22px] font-bold">{fmtMoney(stats.expense, defaultCurrency)}</div>
                </div>
                <div className="min-w-[160px] flex-[1_1_160px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="text-[12.5px] text-[#8D9388]">{t("profile.net", "Чистый результат")}</div>
                  <div className="mt-1.5 text-[22px] font-bold">{signedMoney(stats.net, defaultCurrency)}</div>
                </div>
              </div>

              <div className={cn("flex items-start gap-3.5 rounded-2xl border px-5 py-[18px]", toneCls.box)}>
                <span className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[15px] font-bold text-[#10170A]", toneCls.dot)}>
                  {trend.tone === "ok" ? "✓" : trend.tone === "warn" ? "!" : "i"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[15px] font-bold", toneCls.title)}>{trend.title}</div>
                  <div className="mt-1 text-[13.5px] text-[#C9CEC3]">{trend.text}</div>
                  {stats.top && (
                    <div className="mt-3.5">
                      <div className="mb-1.5 flex justify-between text-[12.5px] text-[#8D9388]">
                        <span>{stats.top[0]}</span>
                        <span className="font-semibold text-[#F1F3EE]">
                          {fmtMoney(stats.top[1], defaultCurrency)} · {Math.round(trend.topShare)}% {t("profile.of_expenses", "расходов")}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-[3px] bg-[#232721]">
                        <svg className="block h-1.5 w-full" aria-hidden="true">
                          <rect width={`${trend.topShare.toFixed(1)}%`} height="6" rx="3" fill={catColor(stats.top[0])} />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link href="/limits" className={cn("flex h-[38px] items-center rounded-[10px] px-4 text-[13.5px] font-bold no-underline", toneCls.btn)}>
                      {t("profile.check_limits", "Проверить лимиты")}
                    </Link>
                    <Link href="/transactions" className={cn("flex h-[38px] items-center rounded-[10px] border px-4 text-[13.5px] font-semibold text-[#F1F3EE] no-underline transition-colors hover:bg-[#1B1E1A]", toneCls.ghost)}>
                      {t("profile.view_ops", "Смотреть операции")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-5">
              <section aria-label={t("profile.stats.total_savings")} className="box-border min-w-0 flex-[1_1_260px] rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
                <div className="text-[13px] font-medium text-[#8D9388]">{t("profile.stats.total_savings")}</div>
                <div className="mt-1.5 text-[34px] font-bold tracking-[-0.02em]">{fmtMoney(stats.savingsTotal, defaultCurrency)}</div>
                <div className="mt-1.5 text-[13px] text-[#C9CEC3]">
                  {stats.savingsTotal > 0 ? t("profile.cushion_grows", "Финансовая подушка растёт") : t("profile.cushion_start", "Откройте накопительный счёт, чтобы начать копить")}
                </div>
                {stats.topSavings && (
                  <div className="mt-2.5 text-[12.5px] text-[#8D9388]">{t("profile.lies_on", "Лежит на счёте")} {stats.topSavings.name}</div>
                )}
                <Link href="/accounts" className="mt-3.5 inline-block text-[13px] font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92]">
                  {t("profile.to_accounts", "К счетам")} →
                </Link>
              </section>

              <section aria-label={t("profile.stats.goals_hit")} className="box-border min-w-0 flex-[1_1_260px] rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
                <div className="text-[13px] font-medium text-[#8D9388]">{t("profile.stats.goals_hit")}</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[34px] font-bold tracking-[-0.02em]">{stats.doneCount}</span>
                  <span className="text-[15px] text-[#8D9388]">{t("profile.out_of", "из")} {goals.length}</span>
                </div>
                {stats.closest ? (
                  <>
                    <div className="mt-3 text-[13px] text-[#C9CEC3]">
                      {t("profile.closest", "Ближе всего")} {stats.closest.g.name}: {stats.closest.pct}%, {t("profile.left_lower", "осталось")} {fmtMoney(stats.closest.remain, stats.closest.g.currency)}
                    </div>
                    <div className="mt-2.5 h-1.5 rounded-[3px] bg-[#232721]">
                      <svg className="block h-1.5 w-full" aria-hidden="true">
                        <rect width={`${stats.closest.pct}%`} height="6" rx="3" fill="#C6F24E" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-[13px] text-[#C9CEC3]">
                    {goals.length > 0 ? t("profile.stats.goals_done") : t("profile.stats.goals_hint")}
                  </div>
                )}
                <Link href="/savings" className="mt-3.5 inline-block text-[13px] font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92]">
                  {t("profile.to_goals", "К целям")} →
                </Link>
              </section>
            </div>

            <section aria-label={t("profile.achievements", "Достижения")} className="rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                <h2 className="text-xl font-semibold">{t("profile.achievements", "Достижения")}</h2>
                <span className="text-[13px] text-[#8D9388]">{earned} {t("profile.out_of", "из")} {badges.length} {t("profile.earned", "получено")}</span>
              </div>
              <div className="mt-[18px] flex flex-wrap gap-3">
                {badges.map((b) => (
                  <div key={b.title} className={cn("box-border flex min-w-[200px] flex-[1_1_200px] items-start gap-3.5 rounded-[14px] border bg-[#121411] p-4", b.done ? "border-[#C6F24E]/35" : "border-[#232721]")}>
                    <span className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-xl text-base font-bold", b.done ? "bg-[#C6F24E]/[0.14] text-[#C6F24E]" : "bg-[#1E211C] text-[#8D9388]")}>
                      {b.mark}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("text-sm font-semibold", b.done ? "text-[#F1F3EE]" : "text-[#A2A89C]")}>{b.title}</span>
                      <span className="text-[12.5px] text-[#8D9388]">{b.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
