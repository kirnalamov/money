"use client";

import ProtectedRoute from "@/components/auth/protected-route";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { TransactionDetailsDialog } from "@/components/transactions/transaction-details-dialog";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Transaction, TransactionType } from "@/types";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  subMonths,
} from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { convertCurrency } from "@/lib/utils";
import {
  fmtMoney,
  signedMoney,
  MINUS,
  plural,
  donutSegments,
  hashColor,
  categoryEmoji,
  withAlpha,
} from "@/lib/plutus-format";
import {
  Download,
  Plus,
  Search,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CreditCard,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const INITIAL_ROWS = 10;

export default function TransactionsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;
  const {
    transactions,
    accounts,
    categories,
    defaultCurrency,
    deleteTransaction,
  } = useStore();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [accountId, setAccountId] = useState<string>("all");
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Keyboard shortcut: N opens the add dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const accountById = useMemo(() => {
    const m = new Map<number, (typeof accounts)[number]>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const categoryColor = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    // #666666 — серый плейсхолдер старого бэкенда: считаем цвет не заданным
    return cat?.color && cat.color.toLowerCase() !== "#666666"
      ? cat.color
      : hashColor(name);
  };

  const catEmoji = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    return categoryEmoji(name, cat?.icon);
  };

  // Month options: current + last 11 + any months present in data
  const monthOptions = useMemo(() => {
    const set = new Map<string, Date>();
    for (let i = 0; i < 12; i++) {
      const d = startOfMonth(subMonths(new Date(), i));
      set.set(format(d, "yyyy-MM"), d);
    }
    transactions.forEach((tx) => {
      const d = startOfMonth(new Date(tx.date));
      set.set(format(d, "yyyy-MM"), d);
    });
    return Array.from(set.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [transactions]);

  // Filtering
  const monthFiltered = useMemo(() => {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      if (d < from || d > to) return false;
      if (
        accountId !== "all" &&
        tx.accountId.toString() !== accountId &&
        tx.toAccountId?.toString() !== accountId
      )
        return false;
      return true;
    });
  }, [transactions, month, accountId]);

  const filtered = useMemo(() => {
    return monthFiltered.filter((tx) => {
      if (search) {
        const q = search.toLowerCase();
        const ok =
          tx.description?.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!ok) return false;
      }
      if (type !== "all" && tx.type !== type) return false;
      return true;
    });
  }, [monthFiltered, search, type]);

  const txUsd = (tx: Transaction) => {
    const acc = accountById.get(tx.accountId);
    return convertCurrency(tx.amount, acc?.currency || tx.currency, defaultCurrency);
  };

  // Summary (income / expense over month+account scope, type/search independent)
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    monthFiltered.forEach((tx) => {
      const v = txUsd(tx);
      if (tx.type === "income") income += v;
      else if (tx.type === "expense") expense += v;
    });
    return { income, expense, net: income - expense };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFiltered, defaultCurrency, accountById]);

  const spentPct =
    stats.income > 0 ? Math.min(100, Math.round((stats.expense / stats.income) * 100)) : stats.expense > 0 ? 100 : 0;

  // Grouping by day
  const groups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const byDay = new Map<string, Transaction[]>();
    sorted.forEach((tx) => {
      const key = format(new Date(tx.date), "yyyy-MM-dd");
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(tx);
    });
    return Array.from(byDay.entries()).map(([key, rows]) => {
      const total = rows.reduce((s, tx) => {
        if (tx.type === "income") return s + txUsd(tx);
        if (tx.type === "expense") return s - txUsd(tx);
        return s;
      }, 0);
      return { key, date: new Date(key), rows, total };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, defaultCurrency, accountById]);

  // Row limiting ("show more")
  const totalRows = filtered.length;
  const visibleGroups = useMemo(() => {
    if (showAll) return groups;
    let left = INITIAL_ROWS;
    const out: typeof groups = [];
    for (const g of groups) {
      if (left <= 0) break;
      out.push({ ...g, rows: g.rows.slice(0, left) });
      left -= g.rows.length;
    }
    return out;
  }, [groups, showAll]);
  const hiddenCount = totalRows - visibleGroups.reduce((s, g) => s + g.rows.length, 0);

  const selected = useMemo(
    () => filtered.find((tx) => tx.id === selectedId) || null,
    [filtered, selectedId]
  );

  // Expense-by-category donut
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((tx) => {
      if (tx.type !== "expense") return;
      m.set(tx.category, (m.get(tx.category) || 0) + txUsd(tx));
    });
    const items = Array.from(m.entries())
      .map(([name, value]) => ({ name, value, color: categoryColor(name) }))
      .sort((a, b) => b.value - a.value);
    const top = items.slice(0, 5);
    const restSum = items.slice(5).reduce((s, x) => s + x.value, 0);
    if (restSum > 0)
      top.push({ name: t("transactions.other", "Другое"), value: restSum, color: "#8D9388" });
    const total = items.reduce((s, x) => s + x.value, 0);
    return { items: top, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, categories, defaultCurrency, accountById]);

  const donut = donutSegments(byCategory.items, byCategory.total);

  // CSV export
  const exportCsv = () => {
    const header = ["date", "type", "category", "description", "account", "amount", "currency"];
    const lines = filtered.map((tx) => {
      const acc = accountById.get(tx.accountId);
      return [
        tx.date,
        tx.type,
        `"${tx.category.replace(/"/g, '""')}"`,
        `"${(tx.description || "").replace(/"/g, '""')}"`,
        `"${(acc?.name || "").replace(/"/g, '""')}"`,
        tx.amount,
        acc?.currency || tx.currency,
      ].join(",");
    });
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(month, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = (d: Date) => {
    const s = format(d, "LLLL yyyy", { locale: dateLocale });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const dayLabel = (d: Date) => format(d, "d MMMM, EEEE", { locale: dateLocale });

  const typeTabs: { key: TransactionType | "all"; label: string }[] = [
    { key: "all", label: t("transactions.tabs.all", "Все") },
    { key: "expense", label: t("transactions.types.expense") },
    { key: "income", label: t("transactions.types.income") },
    { key: "transfer", label: t("transactions.types.transfer") },
  ];

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setEditOpen(true);
  };

  const handleDelete = async (tx: Transaction) => {
    if (confirm(t("transactions.confirm_delete"))) {
      await deleteTransaction(tx.id);
      setSelectedId(null);
    }
  };

  const txTitle = (tx: Transaction) => tx.description || tx.category;

  const typeLabel = (tx: Transaction) =>
    tx.type === "income"
      ? t("transactions.types.income")
      : tx.type === "expense"
        ? t("transactions.types.expense")
        : t("transactions.types.transfer");

  const amountParts = (tx: Transaction) => {
    const acc = accountById.get(tx.accountId);
    const cur = acc?.currency || tx.currency;
    const sign = tx.type === "income" ? "+" : tx.type === "expense" ? MINUS : "";
    const amount = `${sign}${fmtMoney(tx.amount, cur)}`;
    const color =
      tx.type === "income" ? "#6EE7A0" : "#F1F3EE";
    const hasSub = cur !== defaultCurrency;
    const usd = txUsd(tx);
    const sub = hasSub
      ? `≈ ${tx.type === "expense" ? MINUS : "+"}${fmtMoney(usd, defaultCurrency)}`
      : "";
    return { amount, color, hasSub, sub };
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 md:pb-6 text-[#F1F3EE]">
        {/* HEADER */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">
              {t("transactions.title")}
            </h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {monthLabel(month)} · {t("transactions.found", "найдено")} {totalRows}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={exportCsv}
              className="flex h-[42px] items-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent px-4 text-sm font-medium text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
            >
              <Download className="h-4 w-4" strokeWidth={1.8} />
              {t("transactions.export_csv", "Экспорт CSV")}
            </button>
            <AddTransactionDialog
              open={addOpen}
              onOpenChange={setAddOpen}
              trigger={
                <button className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-2.5 text-sm font-semibold text-[#10170A]">
                  <Plus className="h-4 w-4" strokeWidth={2.2} />
                  {t("transactions.add_short", "Добавить")}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[#10170A]/15 text-[11px] font-bold">
                    N
                  </span>
                </button>
              }
            />
          </div>
        </header>

        {/* SUMMARY */}
        <section className="flex flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
          <div className="flex flex-wrap items-end justify-between gap-x-14 gap-y-6">
            <div>
              <div className="text-[13px] font-medium text-[#8D9388]">
                {t("transactions.net_result", "Чистый результат")}
              </div>
              <div className="mt-1 text-[44px] font-bold leading-[1.1] tracking-[-0.03em]">
                {signedMoney(stats.net, defaultCurrency)}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-4">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-[#6EE7A0]" strokeWidth={2.2} />
                  {t("transactions.income_label", "Доход")}
                </div>
                <div className="mt-1 text-[22px] font-semibold text-[#6EE7A0]">
                  {fmtMoney(stats.income, defaultCurrency)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]">
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#C9CEC3]" strokeWidth={2.2} />
                  {t("transactions.expense_label", "Расходы")}
                </div>
                <div className="mt-1 text-[22px] font-semibold">
                  {fmtMoney(stats.expense, defaultCurrency)}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex h-2 gap-[3px]">
              <span
                className="rounded-[4px] bg-[#F1F3EE]"
                style={{ flex: `${Math.max(spentPct, 1)} 1 0%` }}
              />
              <span
                className="rounded-[4px] bg-[#6EE7A0]"
                style={{ flex: `${Math.max(100 - spentPct, 1)} 1 0%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[12.5px] text-[#8D9388]">
              <span>
                {t("transactions.spent_share", "Потрачено")} {spentPct}%{" "}
                {t("transactions.of_income", "дохода")}
              </span>
              <span>
                {t("transactions.left_share", "Осталось")} {100 - spentPct}%
              </span>
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-11 min-w-[260px] flex-1 items-center gap-2.5 rounded-xl border border-[#232721] bg-[#151714] px-4 text-[#8D9388] focus-within:border-[#C6F24E]">
            <Search className="h-4 w-4" strokeWidth={1.8} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("transactions.search_placeholder", "Поиск операций…")}
              placeholder={t("transactions.search_placeholder", "Поиск операций…")}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#F1F3EE] outline-none placeholder:text-[#8D9388]"
            />
          </label>

          <div
            role="group"
            className="flex h-11 gap-0.5 rounded-xl border border-[#232721] bg-[#151714] p-1"
          >
            {typeTabs.map((tab) => (
              <button
                key={tab.key}
                aria-pressed={type === tab.key}
                onClick={() => {
                  setType(tab.key);
                  setSelectedId(null);
                }}
                className={cn(
                  "rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors",
                  type === tab.key
                    ? "bg-[#2A2F27] text-[#F1F3EE]"
                    : "text-[#A2A89C] hover:text-[#F1F3EE]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-11 items-center gap-2.5 rounded-xl border border-[#232721] bg-[#151714] px-4 text-sm font-medium text-[#F1F3EE] transition-colors hover:bg-[#1B1E1A]">
                <Calendar className="h-4 w-4" strokeWidth={1.8} />
                {monthLabel(month)}
                <ChevronDown className="h-3.5 w-3.5 text-[#8D9388]" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              {monthOptions.map((d) => (
                <DropdownMenuItem
                  key={d.toISOString()}
                  onClick={() => {
                    setMonth(d);
                    setSelectedId(null);
                    setShowAll(false);
                  }}
                  className={cn(isSameMonth(d, month) && "text-[#C6F24E]")}
                >
                  {monthLabel(d)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#232721] bg-[#151714] px-4 text-sm font-medium text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
                {t("transactions.filters.title", "Фильтры")}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              <div className="mb-2 text-[13px] font-medium text-[#8D9388]">
                {t("transactions.account")}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setAccountId("all")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#1B1E1A]",
                    accountId === "all" ? "bg-[#1B1E1A] font-semibold" : "text-[#A2A89C]"
                  )}
                >
                  {t("transactions.tabs.all", "Все")}
                </button>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setAccountId(acc.id.toString())}
                    className={cn(
                      "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#1B1E1A]",
                      accountId === acc.id.toString()
                        ? "bg-[#1B1E1A] font-semibold"
                        : "text-[#A2A89C]"
                    )}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* LIST + SIDE PANEL */}
        <div className="flex flex-wrap items-start gap-5">
          {/* LIST */}
          <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Column headers */}
                <div className="grid grid-cols-[36px_minmax(0,1fr)_150px_52px_150px] gap-4 border-b border-[#232721] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388]">
                  <span />
                  <span>{t("transactions.col_operation", "Операция")}</span>
                  <span>{t("transactions.account")}</span>
                  <span>{t("transactions.col_time", "Время")}</span>
                  <span className="flex items-center justify-end gap-1.5 text-right">
                    {t("transactions.amount")}
                    <ChevronDown className="h-3 w-3" strokeWidth={2.2} />
                  </span>
                </div>

                {visibleGroups.map((g) => (
                  <div key={g.key}>
                    <div className="flex items-center justify-between border-t border-[#1E211C] bg-[#121411] px-5 py-2.5">
                      <span className="text-[13px] font-semibold">{dayLabel(g.date)}</span>
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: g.total > 0 ? "#6EE7A0" : "#8D9388" }}
                      >
                        {signedMoney(g.total, defaultCurrency)}
                      </span>
                    </div>
                    {g.rows.map((tx) => {
                      const acc = accountById.get(tx.accountId);
                      const { amount, color, hasSub, sub } = amountParts(tx);
                      const isSel = selectedId === tx.id;
                      return (
                        <button
                          key={tx.id}
                          onClick={() => setSelectedId(isSel ? null : tx.id)}
                          aria-pressed={isSel}
                          className={cn(
                            "grid w-full grid-cols-[36px_minmax(0,1fr)_150px_52px_150px] items-center gap-4 border-t border-[#1E211C] px-5 py-3.5 text-left text-sm transition-colors",
                            isSel ? "bg-[#1F231D]" : "hover:bg-[#1A1D19]"
                          )}
                        >
                          {(() => {
                            const color = categoryColor(tx.category);
                            const emoji =
                              tx.type === "transfer" ? null : catEmoji(tx.category);
                            const bg =
                              tx.type === "transfer"
                                ? "#1E211C"
                                : withAlpha(color, 0.14);
                            return (
                              <span
                                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                                style={{ background: bg }}
                              >
                                {emoji ? (
                                  <span className="text-base leading-none">{emoji}</span>
                                ) : tx.type === "income" ? (
                                  <ArrowDownLeft
                                    className="h-4 w-4"
                                    strokeWidth={2}
                                    style={{ color }}
                                  />
                                ) : tx.type === "expense" ? (
                                  <ArrowUpRight
                                    className="h-4 w-4"
                                    strokeWidth={2}
                                    style={{ color }}
                                  />
                                ) : (
                                  <ArrowRightLeft
                                    className="h-4 w-4 text-[#C9CEC3]"
                                    strokeWidth={2}
                                  />
                                )}
                              </span>
                            );
                          })()}
                          <span className="flex min-w-0 flex-col gap-[3px]">
                            <span className="text-sm font-semibold">{txTitle(tx)}</span>
                            <span className="flex items-center gap-[7px] text-[12.5px] text-[#8D9388]">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: categoryColor(tx.category) }}
                              />
                              {tx.category}
                            </span>
                          </span>
                          <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#A2A89C]">
                            <CreditCard className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
                            <span className="truncate">{acc?.name || "—"}</span>
                          </span>
                          <span className="text-[13px] text-[#8D9388]">
                            {format(new Date(tx.date), "HH:mm")}
                          </span>
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="text-[14.5px] font-semibold" style={{ color }}>
                              {amount}
                            </span>
                            {hasSub && (
                              <span className="text-xs text-[#8D9388]">{sub}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}

                {totalRows === 0 && (
                  <div className="border-t border-[#1E211C] px-5 py-14 text-center text-[#8D9388]">
                    <div className="text-[15px] font-semibold text-[#C9CEC3]">
                      {t("transactions.empty_title", "Здесь пока пусто")}
                    </div>
                    <div className="mt-1.5 text-[13px]">
                      {t("transactions.empty_desc", "За этот период нет операций этого типа")}
                    </div>
                  </div>
                )}

                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full border-t border-[#1E211C] bg-transparent p-4 text-[13.5px] font-medium text-[#A2A89C] transition-colors hover:text-[#F1F3EE]"
                  >
                    {t("transactions.show_more", "Показать ещё")} {hiddenCount}{" "}
                    {plural(
                      hiddenCount,
                      t("transactions.op_one", "операцию"),
                      t("transactions.op_few", "операции"),
                      t("transactions.op_many", "операций")
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* SIDE PANEL */}
          <aside className="sticky top-6 min-w-0 max-w-[380px] flex-[1_1_320px] rounded-[20px] border border-[#232721] bg-[#151714] p-6">
            {!selected ? (
              <div>
                <h2 className="mb-5 text-xl font-semibold">
                  {t("transactions.by_category", "Расходы по категориям")}
                </h2>
                <div className="relative mx-auto mb-6 h-[168px] w-[168px]">
                  <svg width="168" height="168" viewBox="0 0 140 140" role="img">
                    {byCategory.total > 0 ? (
                      donut.map((seg) => (
                        <circle
                          key={seg.name}
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="16"
                          strokeDasharray={seg.dash}
                          strokeDashoffset={seg.offset}
                          transform="rotate(-90 70 70)"
                        />
                      ))
                    ) : (
                      <circle cx="70" cy="70" r="52" fill="none" stroke="#1E211C" strokeWidth="16" />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-[#8D9388]">
                      {t("transactions.total", "Всего")}
                    </span>
                    <span className="text-[15px] font-bold">
                      {fmtMoney(byCategory.total, defaultCurrency)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3.5">
                  {byCategory.items.map((item) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: item.color }}
                      />
                      <span className="flex-1 truncate font-medium">
                        {catEmoji(item.name) && (
                          <span className="mr-1.5">{catEmoji(item.name)}</span>
                        )}
                        {item.name}
                      </span>
                      <span className="font-semibold">
                        {fmtMoney(item.value, defaultCurrency)}
                      </span>
                      <span className="w-9 text-right text-[13px] text-[#8D9388]">
                        {byCategory.total > 0
                          ? Math.round((item.value / byCategory.total) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                  {byCategory.items.length === 0 && (
                    <div className="text-center text-[13px] text-[#8D9388]">
                      {t("transactions.empty_desc", "За этот период нет операций этого типа")}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-2.5 border-t border-[#232721] pt-5">
                  <Link
                    href="/analytics"
                    className="flex-1 rounded-[10px] border border-[#2A2E27] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#C6F24E] no-underline transition-colors hover:text-[#E2FF92]"
                  >
                    {t("common.analytics", "Аналитика")}
                  </Link>
                  <Link
                    href="/limits"
                    className="flex-1 rounded-[10px] border border-[#2A2E27] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#C6F24E] no-underline transition-colors hover:text-[#E2FF92]"
                  >
                    {t("common.limits")}
                  </Link>
                </div>
              </div>
            ) : (
              (() => {
                const acc = accountById.get(selected.accountId);
                const { amount, color, hasSub, sub } = amountParts(selected);
                return (
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-xl font-semibold">
                        {t("transactions.panel_title", "Операция")}
                      </h2>
                      <button
                        onClick={() => setSelectedId(null)}
                        aria-label={t("common.close", "Закрыть")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A2A89C] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                    <div className="text-[13px] text-[#8D9388]">{txTitle(selected)}</div>
                    <div
                      className="mt-1 text-[32px] font-bold tracking-[-0.02em]"
                      style={{ color }}
                    >
                      {amount}
                    </div>
                    {hasSub && (
                      <div className="mt-0.5 text-[13px] text-[#8D9388]">{sub}</div>
                    )}
                    <div className="mt-6 flex flex-col border-t border-[#232721]">
                      <div className="flex justify-between gap-3 border-b border-[#1E211C] py-3.5">
                        <span className="text-[#8D9388]">{t("transactions.type")}</span>
                        <span className="font-medium">{typeLabel(selected)}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#1E211C] py-3.5">
                        <span className="text-[#8D9388]">{t("transactions.category")}</span>
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: categoryColor(selected.category) }}
                          />
                          {catEmoji(selected.category) && (
                            <span>{catEmoji(selected.category)}</span>
                          )}
                          {selected.category}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#1E211C] py-3.5">
                        <span className="text-[#8D9388]">{t("transactions.account")}</span>
                        <span className="font-medium">{acc?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#1E211C] py-3.5">
                        <span className="text-[#8D9388]">{t("common.date", "Дата")}</span>
                        <span className="font-medium">
                          {format(new Date(selected.date), "d MMMM yyyy, HH:mm", {
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-2.5">
                      <button
                        onClick={() => openEdit(selected)}
                        className="h-[42px] flex-1 rounded-xl bg-[#F1F3EE] text-sm font-semibold text-[#10170A]"
                      >
                        {t("common.edit", "Изменить")}
                      </button>
                      <button
                        onClick={() => handleDelete(selected)}
                        className="h-[42px] flex-1 rounded-xl border border-[#2A2E27] bg-transparent text-sm font-semibold text-[#F87171] transition-colors hover:bg-[#1B1E1A]"
                      >
                        {t("common.delete", "Удалить")}
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </aside>
        </div>

        <TransactionDetailsDialog
          transaction={editTx}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </div>
    </ProtectedRoute>
  );
}
