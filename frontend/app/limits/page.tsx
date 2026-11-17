"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/protected-route";
import { usePref } from "@/lib/prefs";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Plus, Pencil, Trash2, Gauge } from "lucide-react";
import { LimitRule } from "@/types";
import { useStore } from "@/lib/store";
import { cn, convertCurrency, getCurrencySymbol } from "@/lib/utils";
import {
  categoryEmoji,
  fmtMoney,
  fmtNum,
  hashColor,
  MINUS,
  shortMoney,
} from "@/lib/plutus-format";
import {
  LimitStatusKey,
  limitChipValues,
  limitDetail,
  limitTransactions,
  periodWindow,
} from "@/lib/limit-detail";
import { AddLimitDialog } from "@/components/limits/add-limit-dialog";

const MINT = "#6EE7A0";
const AMBER = "#FBBF24";
const RED = "#F87171";

const STATUS_STYLE: Record<
  LimitStatusKey,
  { color: string; bg: string; border: string; mark: string }
> = {
  over: { color: RED, bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", mark: "!" },
  warn: { color: AMBER, bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", mark: "!" },
  ok: { color: MINT, bg: "rgba(110,231,160,0.12)", border: "#232721", mark: "✓" },
};

const TOGGLES_KEY = "plutus-limit-toggles" as const;
const STRIPES = "repeating-linear-gradient(135deg,#F87171 0,#F87171 4px,#B94A4A 4px,#B94A4A 8px)";
const STRIPES_BIG = "repeating-linear-gradient(135deg,#F87171 0,#F87171 6px,#B94A4A 6px,#B94A4A 12px)";

function CatIcon({ emoji, size, box, color, bg }: { emoji: string | null; size: number; box: number; color: string; bg: string }) {
  return (
    <span
      className="flex flex-none items-center justify-center"
      style={{ width: box, height: box, borderRadius: Math.round(box * 0.27), background: bg, color }}
    >
      {emoji ? (
        <span style={{ fontSize: Math.round(size * 1.05), lineHeight: 1 }}>{emoji}</span>
      ) : (
        <Gauge style={{ width: size, height: size }} strokeWidth={1.8} />
      )}
    </span>
  );
}

export default function LimitsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;
  const { limits, transactions, accounts, categories, defaultCurrency, deleteLimit, updateLimit } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggles, updateToggles] = usePref<Record<string, boolean>>(TOGGLES_KEY, {});
  const editRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setToggle = (key: string, on: boolean) => updateToggles((prev) => ({ ...prev, [key]: on }));

  const now = useMemo(() => new Date(), []);
  const monthWin = periodWindow("monthly", now);

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name || "—";
  const catColor = (name: string) => {
    const c = categories.find((x) => x.name === name);
    return c?.color && c.color.toLowerCase() !== "#666666" ? c.color : hashColor(name);
  };
  const catEmoji = (name: string) =>
    categoryEmoji(name, categories.find((x) => x.name === name)?.icon);

  // ---- saved selection fallback
  const baseList = useMemo(
    () =>
      limits.map((l) => {
        const win = periodWindow(l.period, now);
        const items = limitTransactions(l, transactions, win, now);
        const spent = items.reduce((s, x) => s + x.amount, 0);
        return { l, win, items, pct: l.amount > 0 ? (spent / l.amount) * 100 : 0 };
      }),
    [limits, transactions, now]
  );
  const curBase =
    baseList.find((x) => x.l.id === selectedId) ||
    [...baseList].sort((a, b) => b.pct - a.pct)[0] ||
    null;
  const curId = curBase?.l.id ?? null;
  const curAmount = curBase?.l.amount ?? 0;

  useEffect(() => {
    if (curId !== null) setDraft(String(curAmount));
  }, [curId, curAmount]);

  const draftAmount = (() => {
    const v = parseFloat(draft.replace(",", ".").replace(/\s/g, ""));
    return Number.isFinite(v) && v > 0 ? v : curAmount;
  })();
  const dirty = curBase !== null && Math.abs(draftAmount - curAmount) > 1e-9;

  // ---- per-limit view (selected one previews the draft amount)
  const data = useMemo(
    () =>
      baseList.map((b) => {
        const amount = b.l.id === curId ? draftAmount : b.l.amount;
        return { ...b, amount, d: limitDetail(amount, b.items, b.win) };
      }),
    [baseList, curId, draftAmount]
  );
  const sorted = useMemo(() => [...data].sort((a, b) => b.d.pct - a.d.pct), [data]);
  const cur = data.find((x) => x.l.id === curId) || null;

  // ---- summary
  const toDef = (v: number, cur: string) => convertCurrency(v, cur, defaultCurrency);
  const summary = useMemo(() => {
    const spent = data.reduce((s, x) => s + toDef(x.d.spent, x.l.currency), 0);
    const limit = data.reduce((s, x) => s + toDef(x.amount, x.l.currency), 0);
    const counts: Record<LimitStatusKey, number> = { over: 0, warn: 0, ok: 0 };
    data.forEach((x) => {
      counts[x.d.status] += 1;
    });

    // расходы месяца по категориям (в валюте по умолчанию)
    const monthStart = monthWin.start;
    const byCat = new Map<string, number>();
    let monthTotal = 0;
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const d = new Date(tx.date);
      if (Number.isNaN(d.getTime()) || d < monthStart || d > now) return;
      const v = convertCurrency(tx.amount, tx.currency, defaultCurrency);
      byCat.set(tx.category, (byCat.get(tx.category) || 0) + v);
      monthTotal += v;
    });
    const limited = new Set(data.map((x) => x.l.category));
    let limitedSpend = 0;
    byCat.forEach((v, k) => {
      if (limited.has(k)) limitedSpend += v;
    });
    const free = Array.from(byCat.entries())
      .filter(([k]) => !limited.has(k))
      .map(([name, v]) => ({ name, spent: v, share: monthTotal > 0 ? (v / monthTotal) * 100 : 0 }))
      .sort((a, b) => b.spent - a.spent);
    return {
      spent,
      limit,
      counts,
      cover: monthTotal > 0 ? Math.round((limitedSpend / monthTotal) * 100) : 0,
      free,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, transactions, defaultCurrency]);

  const openDialog = (category?: string) => {
    setPreset(category);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("limits.delete_confirm"))) {
      try {
        await deleteLimit(id);
        setSelectedId(null);
      } catch {
        alert(t("common.error"));
      }
    }
  };

  const handleSave = async () => {
    if (!cur) return;
    setSaving(true);
    try {
      await updateLimit(cur.l.id, { amount: draftAmount });
    } catch {
      alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const focusEdit = () => {
    editRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => inputRef.current?.focus(), 350);
  };

  const monthGen = format(now, "MMMM", { locale: dateLocale });
  const monthTitle = (() => {
    const s = format(now, "LLLL yyyy", { locale: dateLocale });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const dayWord = t("limits.day_short", "дн.");

  const statusLabel = (k: LimitStatusKey) =>
    k === "over"
      ? t("limits.st.over", "Превышен")
      : k === "warn"
        ? t("limits.st.warn", "Близко к лимиту")
        : t("limits.st.ok", "В норме");

  const periodLabel = (p: LimitRule["period"]) =>
    p === "daily"
      ? t("limits.period_daily", "Дневной")
      : p === "weekly"
        ? t("limits.period_weekly", "Недельный")
        : t("limits.period_monthly", "Месячный");

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("limits.page_title", "Лимиты расходов")}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {monthTitle} · {t("limits.page_subtitle", "все лимиты в одном месте: где всё хорошо, где пора притормозить")}
            </p>
          </div>
          <button
            onClick={() => openDialog()}
            className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-[18px] text-sm font-semibold text-[#10170A]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t("limits.add_limit")}
          </button>
        </header>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[#2A2E27] px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-[#C9CEC3]">{t("limits.no_limits")}</p>
            <p className="text-[13px] text-[#8D9388]">{t("limits.add_hint")}</p>
            <button
              onClick={() => openDialog()}
              className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-[#C6F24E] px-4 text-sm font-semibold text-[#10170A]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              {t("limits.add_limit")}
            </button>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <section className="flex flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
              <div className="flex flex-wrap items-end justify-between gap-x-14 gap-y-6">
                <div>
                  <div className="text-[13px] font-medium text-[#8D9388]">
                    {t("limits.sum_spent", "Потрачено в категориях с лимитом")}
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                    <span className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
                      {fmtMoney(summary.spent, defaultCurrency)}
                    </span>
                    <span className="text-[15px] text-[#8D9388]">
                      {t("limits.of", "из")} {fmtMoney(summary.limit, defaultCurrency)} ·{" "}
                      {summary.limit > 0 ? Math.round((summary.spent / summary.limit) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["over", "warn", "ok"] as LimitStatusKey[])
                      .filter((k) => summary.counts[k] > 0)
                      .map((k) => (
                        <span
                          key={k}
                          className="flex items-center gap-2 rounded-full px-3 py-[5px] text-[13px] font-bold"
                          style={{ background: STATUS_STYLE[k].bg, color: STATUS_STYLE[k].color }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_STYLE[k].color }} />
                          {summary.counts[k]}{" "}
                          {k === "over"
                            ? t("limits.pill_over", "превышен")
                            : k === "warn"
                              ? t("limits.pill_warn", "близко к лимиту")
                              : t("limits.pill_ok", "в норме")}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-11 gap-y-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#8D9388]">{t("limits.until_month_end", "До конца месяца")}</div>
                    <div className="mt-1 text-xl font-semibold">{monthWin.left} {dayWord}</div>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#8D9388]">{t("limits.covered", "Лимитами покрыто")}</div>
                    <div className="mt-1 text-xl font-semibold">
                      {summary.cover}%{" "}
                      <span className="text-[13px] font-medium text-[#8D9388]">{t("limits.of_expenses", "расходов")}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#8D9388]">{t("limits.no_limit_cats", "Категорий без лимита")}</div>
                    <div className="mt-1 text-xl font-semibold">{summary.free.length}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-[12.5px] text-[#8D9388]">
                  <span>{t("limits.month_passed", "Месяц прошёл")}</span>
                  <span>
                    {format(now, "d MMMM", { locale: dateLocale })} · {t("limits.day_of", "день")} {monthWin.day}{" "}
                    {t("limits.of", "из")} {monthWin.days}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-[4px] bg-[#232721]">
                  <div
                    className="h-2 rounded-[4px] bg-[#8D9388]"
                    style={{ width: `${((monthWin.day / monthWin.days) * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-start gap-5">
              {/* LEFT */}
              <aside className="flex min-w-0 max-w-[430px] flex-[1_1_340px] flex-col gap-5">
                <section aria-label={t("limits.my_limits", "Мои лимиты")} className="rounded-[20px] border border-[#232721] bg-[#151714] p-5">
                  <div className="flex items-baseline justify-between px-1 pb-3.5 pt-1">
                    <h2 className="text-xl font-semibold">{t("limits.my_limits", "Мои лимиты")}</h2>
                    <span className="text-[12.5px] text-[#8D9388]">{t("limits.hottest_first", "сначала самые горячие")}</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {sorted.map((x) => {
                      const st = STATUS_STYLE[x.d.status];
                      const active = x.l.id === curId;
                      const note =
                        x.d.status === "over"
                          ? `${t("limits.exceeded_by", "Превышено на")} ${fmtMoney(x.d.spent - x.amount, x.l.currency)}`
                          : `${t("limits.left_word", "Осталось")} ${fmtMoney(x.amount - x.d.spent, x.l.currency)} ${t("limits.for_days", "на")} ${x.win.left} ${dayWord}`;
                      return (
                        <button
                          key={x.l.id}
                          onClick={() => setSelectedId(x.l.id)}
                          aria-pressed={active}
                          className={cn(
                            "block w-full rounded-2xl border p-4 text-left text-sm text-inherit transition-colors",
                            active
                              ? "border-[#C6F24E] bg-[#1A1D19]"
                              : "border-[#232721] bg-[#121411] hover:border-[#5A6054]"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <CatIcon emoji={catEmoji(x.l.category)} size={18} box={38} color={st.color} bg={st.bg} />
                            <span className="flex min-w-0 flex-1 flex-col gap-px">
                              <span className="truncate text-[15px] font-semibold">{x.l.category}</span>
                              <span className="text-[12.5px] text-[#8D9388]">{periodLabel(x.l.period)}</span>
                            </span>
                            <span
                              className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-bold"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {statusLabel(x.d.status)}
                            </span>
                          </span>
                          <span className="mt-3.5 flex items-baseline justify-between gap-2">
                            <span className="text-lg font-bold">{fmtMoney(x.d.spent, x.l.currency)}</span>
                            <span className="text-[12.5px] text-[#8D9388]">
                              {t("limits.of", "из")} {fmtMoney(x.amount, x.l.currency)} · {Math.round(x.d.pct)}%
                            </span>
                          </span>
                          <span className="relative mt-2.5 block">
                            <span className="flex h-2 overflow-hidden rounded-[4px] bg-[#232721]">
                              <span style={{ width: `${x.d.bar.within}%`, background: st.color }} />
                              <span style={{ width: `${x.d.bar.over}%`, background: STRIPES }} />
                            </span>
                            <span
                              className="absolute -top-[3px] h-3.5 w-0.5 -translate-x-1/2 bg-[#F1F3EE]"
                              style={{ left: `${x.d.bar.limitLeft}%` }}
                            />
                          </span>
                          <span className="mt-2.5 block text-[12.5px] text-[#8D9388]">{note}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => openDialog()}
                    className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#2A2E27] bg-transparent text-[13.5px] font-semibold text-[#A2A89C] transition-colors hover:border-[#C6F24E] hover:text-[#C6F24E]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {t("limits.add_for_category", "Добавить лимит на категорию")}
                  </button>
                </section>

                {summary.free.length > 0 && (
                  <section aria-label={t("limits.free_title", "Категории без лимита")} className="rounded-[20px] border border-[#232721] bg-[#151714] px-6 py-5">
                    <h2 className="mb-1 text-xl font-semibold">{t("limits.free_title", "Категории без лимита")}</h2>
                    <p className="mb-1 text-[13px] text-[#8D9388]">{t("limits.free_hint", "Расходы тут никто не контролирует.")}</p>
                    <div className="flex flex-col">
                      {summary.free.map((fc) => (
                        <div key={fc.name} className="flex items-center gap-3 pb-1 pt-3.5">
                          <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: catColor(fc.name) }} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold">{fc.name}</span>
                            <span className="text-[12.5px] text-[#8D9388]">
                              {fmtMoney(fc.spent, defaultCurrency)} · {Math.round(fc.share)}% {t("limits.of_expenses", "расходов")}
                            </span>
                          </span>
                          <button
                            onClick={() => openDialog(fc.name)}
                            aria-label={`${t("limits.set_limit", "Задать лимит")}: ${fc.name}`}
                            className="h-[34px] rounded-[10px] border border-[#2A2E27] bg-transparent px-3 text-[12.5px] font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                          >
                            {t("limits.set_limit", "Задать лимит")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </aside>

              {/* RIGHT */}
              {cur && (
                <DetailPanel
                  key={cur.l.id}
                  cur={cur}
                  now={now}
                  dateLocale={dateLocale}
                  monthGen={monthGen}
                  statusLabel={statusLabel}
                  periodLabel={periodLabel}
                  accountName={accountName}
                  emoji={catEmoji(cur.l.category)}
                  onEdit={focusEdit}
                  onDelete={() => void handleDelete(cur.l.id)}
                  draft={draft}
                  setDraft={setDraft}
                  dirty={dirty}
                  saving={saving}
                  onSave={() => void handleSave()}
                  onReset={() => setDraft(String(curAmount))}
                  toggles={toggles}
                  setToggle={setToggle}
                  editRef={editRef}
                  inputRef={inputRef}
                />
              )}
            </div>
          </>
        )}

        <AddLimitDialog
          key={`${dialogOpen}-${preset ?? "new"}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingLimit={null}
          presetCategory={preset}
        />
      </div>
    </ProtectedRoute>
  );
}

type DataItem = {
  l: LimitRule;
  win: ReturnType<typeof periodWindow>;
  items: ReturnType<typeof limitTransactions>;
  amount: number;
  d: ReturnType<typeof limitDetail>;
};

interface DetailProps {
  cur: DataItem;
  now: Date;
  dateLocale: Locale;
  monthGen: string;
  statusLabel: (k: LimitStatusKey) => string;
  periodLabel: (p: LimitRule["period"]) => string;
  accountName: (id: number) => string;
  emoji: string | null;
  onEdit: () => void;
  onDelete: () => void;
  draft: string;
  setDraft: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  toggles: Record<string, boolean>;
  setToggle: (key: string, on: boolean) => void;
  editRef: React.MutableRefObject<HTMLElement | null>;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}

function DetailPanel(p: DetailProps) {
  const { t, i18n } = useTranslation();
  const { cur, now, dateLocale, monthGen } = p;
  const { l, win, items, amount, d } = cur;
  const st = STATUS_STYLE[d.status];
  const sym = getCurrencySymbol(l.currency);
  const money = (v: number) => fmtMoney(v, l.currency);
  const dayWord = t("limits.day_short", "дн.");
  const hasChart = win.days > 1;

  const headline =
    d.status === "over"
      ? `${t("limits.exceeded_by", "Превышено на")} ${money(d.spent - amount)}`
      : `${t("limits.left_word", "Осталось")} ${money(amount - d.spent)}`;

  let adviceTitle: string;
  let adviceText: string;
  if (d.status === "over") {
    adviceTitle = d.crossDay
      ? `${t("limits.advice_over_title", "Лимит исчерпан ещё")} ${format(new Date(win.start.getTime() + (d.crossDay - 1) * 86400000), "d MMMM", { locale: dateLocale })}`
      : t("limits.advice_over_title2", "Лимит исчерпан");
    adviceText = `${t("limits.advice_over_1", "До конца периода")} ${win.left} ${dayWord} ${t("limits.advice_over_2", "Если темп сохранится, набежит")} ${money(d.proj)} (${Math.round(d.projPct)}% ${t("limits.of_limit", "лимита")}). ${t("limits.advice_over_3", "Сократите траты или поднимите лимит ниже.")}`;
  } else if (d.projPct > 100) {
    adviceTitle = t("limits.advice_fast_title", "Темп выше нормы");
    adviceText = `${t("limits.advice_fast_1", "Пока вы в лимите, но при текущем темпе к концу периода выйдет")} ${money(d.proj)} (${Math.round(d.projPct)}% ${t("limits.of_limit", "лимита")}). ${t("limits.advice_fast_2", "Старайтесь тратить не больше")} ${money(d.allowed)} ${t("limits.per_day", "в день")}.`;
  } else {
    adviceTitle = t("limits.advice_ok_title", "Всё идёт по плану");
    adviceText = `${t("limits.advice_ok_1", "При текущем темпе к концу периода выйдет")} ${money(d.proj)}, ${t("limits.advice_ok_2", "это")} ${Math.round(d.projPct)}% ${t("limits.of_limit", "лимита")}. ${t("limits.advice_ok_3", "Можно тратить до")} ${money(d.allowed)} ${t("limits.per_day", "в день")}.`;
  }

  // ---- chart
  const chart = useMemo(() => {
    if (!hasChart) return null;
    const maxV = Math.max(d.proj, amount, d.spent, 1);
    const raw = maxV / 4;
    const pw = Math.pow(10, Math.floor(Math.log10(raw)));
    let step = pw * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pw >= raw) {
        step = k * pw;
        break;
      }
    }
    const top = step * Math.ceil(maxV / step);
    const px = (day: number) => ((day - 1) / (win.days - 1)) * 100;
    const py = (v: number) => 100 - (v / top) * 100;
    const pt = (day: number, v: number) => `${px(day).toFixed(2)},${py(v).toFixed(2)}`;

    const fact = [pt(1, 0)];
    let cum = 0;
    items.forEach((x) => {
      fact.push(pt(x.day, cum));
      cum += x.amount;
      fact.push(pt(x.day, cum));
    });
    fact.push(pt(win.day, cum));

    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= top + 1e-6; v += step) yTicks.push({ top: py(v), label: shortMoney(v, i18n.language) });

    const tickDays =
      win.period === "weekly"
        ? [1, 2, 3, 4, 5, 6, 7]
        : Array.from(new Set([1, 5, 10, 15, 20, 25, win.days])).filter((x) => x <= win.days);
    const xTicks = tickDays.map((day) => ({
      left: px(day),
      label:
        win.period === "weekly"
          ? format(new Date(win.start.getTime() + (day - 1) * 86400000), "EEEEEE", { locale: dateLocale })
          : String(day),
    }));
    return {
      fact: fact.join(" "),
      proj: `${pt(win.day, d.spent)} ${pt(win.days, d.proj)}`,
      plan: `${pt(1, 0)} ${pt(win.days, amount)}`,
      limitTop: py(amount),
      todayLeft: px(win.day),
      nowTop: py(d.spent),
      crossLeft: d.crossDay ? px(d.crossDay) : null,
      yTicks,
      xTicks,
    };
  }, [hasChart, d, amount, items, win, i18n.language, dateLocale]);

  const recent = [...items].reverse().slice(0, 8);
  const chipValues = limitChipValues(l.amount);
  const toggleDefs = [
    { key: "n80", title: t("limits.tg_80", "Предупреждать при 80%"), note: t("limits.tg_80_note", "Уведомим, когда останется 20% лимита") },
    { key: "nOver", title: t("limits.tg_over", "Сообщать о превышении"), note: t("limits.tg_over_note", "Сразу, как только трата выйдет за лимит") },
    { key: "nRepeat", title: t("limits.tg_repeat", "Повторять каждый период"), note: t("limits.tg_repeat_note", "Лимит продлится сам со следующего периода") },
  ];

  return (
    <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
      <article className="overflow-hidden rounded-[20px] border bg-[#151714]" style={{ borderColor: st.border }}>
        <div className="flex items-start gap-3.5 px-7 py-6">
          <CatIcon emoji={p.emoji} size={22} box={46} color={st.color} bg={st.bg} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h2 className="text-[19px] font-semibold">{l.category}</h2>
              <span className="rounded-full bg-[#1E211C] px-[9px] py-0.5 text-[11.5px] font-semibold text-[#C9CEC3]">{p.periodLabel(l.period)}</span>
              <span className="rounded-full bg-[#1E211C] px-[9px] py-0.5 text-[11.5px] font-semibold text-[#C9CEC3]">{l.currency}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" style={{ background: st.bg, color: st.color }}>
                {p.statusLabel(d.status)}
              </span>
            </div>
            <div className="mt-1 text-[13px] font-semibold" style={{ color: st.color }}>{headline}</div>
          </div>
          <div className="flex gap-0.5">
            <button
              aria-label={`${t("common.edit")}: ${l.category}`}
              onClick={p.onEdit}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F1F3EE]"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              aria-label={`${t("common.delete")}: ${l.category}`}
              onClick={p.onDelete}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F87171]"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="px-7 pb-7">
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
            <span className="text-[44px] font-bold leading-[1.1] tracking-[-0.03em]">{money(d.spent)}</span>
            <span className="text-base text-[#8D9388]">{t("limits.of", "из")} {money(amount)}</span>
            <span className="text-base font-bold" style={{ color: st.color }}>
              {Math.round(d.pct)}% {t("limits.spent_word", "потрачено")}
            </span>
          </div>

          <div className="relative mt-11">
            <div
              className="absolute bottom-full -translate-x-1/2 whitespace-nowrap pb-1.5 text-xs font-semibold"
              style={{ left: `${d.bar.limitLeft}%` }}
            >
              {t("limits.limit_word", "Лимит")} {money(amount)}
            </div>
            <div
              className="absolute -top-1 z-[2] h-6 w-0.5 -translate-x-1/2 bg-[#F1F3EE]"
              style={{ left: `${d.bar.limitLeft}%` }}
            />
            <div className="flex h-4 overflow-hidden rounded-lg bg-[#232721]">
              <div style={{ width: `${d.bar.within}%`, background: st.color }} />
              <div style={{ width: `${d.bar.over}%`, background: STRIPES_BIG }} />
            </div>
            {hasChart && (
              <div
                className="absolute top-4 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${d.bar.paceLeft}%` }}
              >
                <span className="h-2 w-0.5 bg-[#8D9388]" />
                <span className="mt-1 whitespace-nowrap text-xs text-[#8D9388]">
                  {t("limits.plan_today", "План на сегодня")} {money(d.pace)}
                </span>
              </div>
            )}
          </div>
          <div className="h-[30px]" />

          <div className="mt-2 flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
              <div className="text-[12.5px] text-[#8D9388]">
                {d.over ? t("limits.overrun_label", "Превышение") : t("limits.remainder", "Остаток лимита")}
              </div>
              <div className="mt-1.5 text-xl font-bold" style={{ color: st.color }}>
                {money(Math.abs(amount - d.spent))}
              </div>
            </div>
            <div className="min-w-[150px] flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
              <div className="text-[12.5px] text-[#8D9388]">{t("limits.you_spend", "Тратите в день")}</div>
              <div className="mt-1.5 text-xl font-bold">{money(d.avg)}</div>
              <div className="mt-0.5 text-xs text-[#8D9388]">
                {t("limits.norm", "норма")} {money(d.norm)} ·{" "}
                {d.ratio >= 1
                  ? `×${d.ratio.toFixed(1).replace(".", ",")} ${t("limits.of_norm", "от нормы")}`
                  : t("limits.within_norm", "в пределах нормы")}
              </div>
            </div>
            <div className="min-w-[150px] flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
              <div className="text-[12.5px] text-[#8D9388]">{t("limits.to_period_end", "К концу периода")}</div>
              <div className="mt-1.5 text-xl font-bold">{money(d.proj)}</div>
              <div className="mt-0.5 text-xs text-[#8D9388]">
                {Math.round(d.projPct)}% {t("limits.of_limit_pace", "лимита при таком темпе")}
              </div>
            </div>
            <div className="min-w-[150px] flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
              <div className="text-[12.5px] text-[#8D9388]">
                {d.over ? t("limits.can_spend_day", "Можно тратить в день") : t("limits.allowed_day", "Допустимо в день")}
              </div>
              <div className="mt-1.5 text-xl font-bold">{money(d.over ? 0 : d.allowed)}</div>
              <div className="mt-0.5 text-xs text-[#8D9388]">
                {d.over
                  ? t("limits.exhausted", "лимит уже исчерпан")
                  : `${t("limits.until_end", "до конца периода,")} ${win.left} ${dayWord}`}
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-start gap-3.5 rounded-2xl border px-5 py-[18px]"
            style={{ background: st.bg, borderColor: st.border }}
          >
            <span
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[15px] font-bold text-[#10170A]"
              style={{ background: st.color }}
            >
              {st.mark}
            </span>
            <div>
              <div className="text-[15px] font-bold" style={{ color: st.color }}>{adviceTitle}</div>
              <div className="mt-1 text-[13.5px] text-[#C9CEC3]">{adviceText}</div>
            </div>
          </div>

          {chart && (
            <div className="mt-7">
              <div className="mb-[26px] flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <span className="text-sm font-semibold">{t("limits.by_days", "Траты по дням")}</span>
                <span className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] text-[#8D9388]">
                  <span className="flex items-center gap-2"><span className="h-[3px] w-3.5 rounded-sm" style={{ background: st.color }} />{t("limits.spent_word2", "Потрачено")}</span>
                  <span className="flex items-center gap-2"><span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: st.color }} />{t("limits.forecast", "Прогноз")}</span>
                  <span className="flex items-center gap-2"><span className="h-[3px] w-3.5 rounded-sm bg-[#5A6054]" />{t("limits.even_plan", "Равномерный план")}</span>
                  <span className="flex items-center gap-2"><span className="w-3.5 border-t-2 border-dashed border-[#F1F3EE]" />{t("limits.limit_word", "Лимит")}</span>
                </span>
              </div>
              <div className="relative ml-14 h-[260px]">
                {chart.yTicks.map((tk, i) => (
                  <div key={i}>
                    <div className="absolute left-0 right-0 border-t border-dashed border-[#232721]" style={{ top: `${tk.top}%` }} />
                    <div className="absolute -left-14 w-12 -translate-y-1/2 text-right text-xs text-[#8D9388]" style={{ top: `${tk.top}%` }}>{tk.label}</div>
                  </div>
                ))}
                <div className="absolute bottom-0 top-0 border-l border-[#3A3F36]" style={{ left: `${chart.todayLeft}%` }} />
                <span className="absolute -top-[22px] -translate-x-1/2 text-xs font-semibold text-[#C9CEC3]" style={{ left: `${chart.todayLeft}%` }}>
                  {t("limits.today", "Сегодня")}
                </span>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t("limits.chart_aria", "График накопленных трат по дням: факт, прогноз, план и лимит")} className="absolute left-0 top-0 h-full w-full overflow-visible">
                  <polyline points={chart.plan} fill="none" stroke="#5A6054" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  <polyline points={chart.proj} fill="none" stroke={st.color} strokeWidth={2.5} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
                  <polyline points={chart.fact} fill="none" stroke={st.color} strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute left-0 right-0 border-t-2 border-dashed border-[#F1F3EE]" style={{ top: `${chart.limitTop}%` }} />
                <span className="absolute right-0 -translate-y-[130%] rounded-md bg-[#242823] px-2 py-0.5 text-xs font-semibold text-[#F1F3EE]" style={{ top: `${chart.limitTop}%` }}>
                  {t("limits.limit_word", "Лимит")} {money(amount)}
                </span>
                {chart.crossLeft !== null && d.crossDay && (
                  <>
                    <span className="absolute h-3 w-3 rounded-full bg-[#F87171] shadow-[0_0_0_4px_#151714]" style={{ left: `${chart.crossLeft}%`, top: `${chart.limitTop}%`, margin: "-6px 0 0 -6px" }} />
                    <span className="absolute whitespace-nowrap rounded-md bg-[#F87171]/[0.14] px-[9px] py-[3px] text-xs font-semibold text-[#F87171]" style={{ left: `${chart.crossLeft}%`, top: `${chart.limitTop}%`, transform: "translate(12px,10px)" }}>
                      {t("limits.crossed", "Лимит пройден")} {format(new Date(win.start.getTime() + (d.crossDay - 1) * 86400000), "d MMMM", { locale: dateLocale })}
                    </span>
                  </>
                )}
                <span className="absolute h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_#151714]" style={{ left: `${chart.todayLeft}%`, top: `${chart.nowTop}%`, background: st.color, margin: "-5px 0 0 -5px" }} />
              </div>
              <div className="relative ml-14 mt-2.5 h-[22px]">
                {chart.xTicks.map((xt, i) => (
                  <span key={i} className="absolute top-0 -translate-x-1/2 text-xs text-[#8D9388]" style={{ left: `${xt.left}%` }}>{xt.label}</span>
                ))}
              </div>
              <div className="ml-14 mt-0.5 text-center text-xs text-[#8D9388]">
                {win.period === "weekly" ? t("limits.week_days", "дни недели") : `${t("limits.month_days", "дни")} ${monthGen}`}
              </div>
            </div>
          )}

          <div className="mt-7">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("limits.composition", "Из чего сложилась сумма")}</h3>
              <Link href="/transactions" className="text-[13px] font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92]">
                {t("limits.all_ops", "Все операции")} →
              </Link>
            </div>
            <div className="flex flex-col">
              {recent.map((rx) => (
                <div key={rx.tx.id} className="grid grid-cols-[90px_minmax(0,1fr)_150px_120px] items-center gap-4 rounded-lg border-b border-[#1E211C] px-2 py-3 transition-colors hover:bg-[#1A1D19]">
                  <span className="text-[13px] text-[#8D9388]">{format(new Date(rx.tx.date), "d MMM", { locale: dateLocale })}</span>
                  <span className="min-w-0 truncate text-sm font-semibold">{rx.tx.description || rx.tx.category}</span>
                  <span className="truncate text-[13px] text-[#A2A89C]">{p.accountName(rx.tx.accountId)}</span>
                  <span className="text-right font-semibold">{MINUS}{money(rx.amount)}</span>
                </div>
              ))}
              {recent.length === 0 && (
                <div className="py-3 text-[13px] text-[#8D9388]">{t("limits.no_period_ops", "В этом периоде расходов по категории пока нет")}</div>
              )}
            </div>
          </div>
        </div>
      </article>

      <section ref={p.editRef as React.RefObject<HTMLElement>} aria-label={t("limits.edit_section", "Настройка лимита")} className="rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
        <h2 className="mb-1 text-xl font-semibold">{t("limits.edit_limit")}: {l.category}</h2>
        <p className="mb-[18px] text-[13px] text-[#8D9388]">{t("limits.edit_hint", "Подвигайте сумму и сразу увидите, как изменится картина.")}</p>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <div className="min-w-[240px] flex-[1_1_280px]">
            <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
              {t("limits.limit_for_period", "Лимит на период")} · {p.periodLabel(l.period).toLowerCase()}
              <span className="flex h-[46px] items-center gap-2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-4 focus-within:border-[#C6F24E]">
                <input
                  ref={p.inputRef}
                  value={p.draft}
                  onChange={(e) => p.setDraft(e.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#F1F3EE] outline-none"
                />
                <span className="font-medium text-[#8D9388]">{sym}</span>
              </span>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {chipValues.map((v, i) => {
                const active = Math.round(amount) === v;
                return (
                  <button
                    key={v}
                    onClick={() => p.setDraft(String(v))}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition-colors",
                      active
                        ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#C6F24E]"
                        : "border-[#2A2E27] text-[#C9CEC3] hover:border-[#5A6054] hover:text-[#F1F3EE]"
                    )}
                  >
                    {fmtNum(v, 0)} {sym}{i === 0 ? ` · ${t("limits.now", "сейчас")}` : ""}
                  </button>
                );
              })}
            </div>
            {p.dirty && (
              <div className="mt-4 flex gap-2.5">
                <button
                  onClick={p.onSave}
                  disabled={p.saving}
                  className="h-[42px] rounded-xl bg-[#C6F24E] px-5 text-sm font-semibold text-[#10170A] disabled:opacity-60"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={p.onReset}
                  className="h-[42px] rounded-xl border border-[#2A2E27] bg-transparent px-5 text-sm font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A]"
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>
          <div className="flex min-w-[260px] flex-[1_1_300px] flex-col border-t border-[#232721]">
            {toggleDefs.map((tg) => {
              const k = `${l.id}_${tg.key}`;
              const on = p.toggles[k] !== false;
              return (
                <div key={tg.key} className="flex items-center gap-3.5 border-b border-[#1E211C] py-3.5">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{tg.title}</span>
                    <span className="text-[12.5px] text-[#8D9388]">{tg.note}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={on}
                    aria-label={tg.title}
                    onClick={() => p.setToggle(k, !on)}
                    className="relative h-6 w-[42px] flex-none rounded-xl border-0 p-0 transition-colors"
                    style={{ background: on ? "#C6F24E" : "#2A2E27" }}
                  >
                    <span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-[#F1F3EE] transition-[left]" style={{ left: on ? 21 : 3 }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
