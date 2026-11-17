"use client"

import { categoryEmoji, hashColor } from "@/lib/plutus-format";
import ProtectedRoute from "@/components/auth/protected-route";

import { useTheme } from "next-themes";
import { Currency } from "@/types";
import { useTranslation } from "react-i18next";
import { Check, Download, Upload, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useMemo, useRef, useState } from "react";
import { resetApplicationStorage } from "@/lib/legacy-backup";
import { cn } from "@/lib/utils";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";

type Kind = "out" | "in" | "save" | "other";
const KINDS_KEY = "plutus-category-kinds";
const SAVE_RE = /savings|investment|накоплен|инвестиц/i;
const PAIRS = [["salary", "зарплата"], ["food", "еда"], ["housing", "жильё"], ["transport", "транспорт"], ["shopping", "покупки"], ["leisure", "досуг"], ["savings", "накопления"], ["investments", "инвестиции"]];

function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className="flex-none">
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  );
}

const sectionCls = "rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6";
const fieldCls = "flex items-center rounded-xl border border-[#2A2E27] bg-[#0E0F0E] focus-within:border-[#C6F24E]";
const ghostBtn = "flex h-[42px] items-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent px-[18px] text-sm font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { categories, tags, transactions, accounts, addTransaction, addCategory, updateCategory, deleteCategory, addTag, updateTag, deleteTag, defaultCurrency, setDefaultCurrency } = useStore();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<Exclude<Kind, "other">>("out");
  const [newTagName, setNewTagName] = useState("");
  const [catError, setCatError] = useState("");
  const [tagError, setTagError] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [kinds, setKinds] = useState<Record<string, Kind>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; color: string; icon: string } | null>(null);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);
  const hasUnsavedChanges = Boolean(
    (editingCategory && categories.some((category) => category.id === editingCategory.id && (category.name !== editingCategory.name || (category.color || "#cccccc") !== editingCategory.color || (categoryEmoji(category.name, category.icon) || "") !== editingCategory.icon))) ||
    (editingTag && tags.some((tag) => tag.id === editingTag.id && (tag.name !== editingTag.name || (tag.color || "#cccccc") !== editingTag.color)))
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KINDS_KEY);
      if (raw) setKinds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const getOperationError = (error: unknown) => {
    const response = typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { detail?: unknown } } }).response
      : undefined;
    const detail = response?.data?.detail;
    if (typeof detail === "string") {
      return detail.toLowerCase().includes("already exists")
        ? t("settings.name_conflict")
        : detail;
    }
    return error instanceof Error ? error.message : t("common.error");
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("settings.unsaved_warning");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, t]);

  const rememberKind = (name: string, kind: Kind) => {
    setKinds((prev) => {
      const next = { ...prev, [name.toLowerCase()]: kind };
      try {
        localStorage.setItem(KINDS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleAddCategory = async () => {
    setCatError("");
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) {
      setCatError(t("settings.name_conflict"));
      return;
    }
    try {
      await addCategory({ name });
      rememberKind(name, newCategoryKind);
      setNewCategoryName("");
    } catch (error) {
      setCatError(getOperationError(error));
    }
  };

  const handleAddTag = async () => {
    setTagError("");
    const name = newTagName.trim().replace(/^#+/, "");
    if (name) {
      try {
        await addTag({ name });
        setNewTagName("");
      } catch (error) {
        setTagError(getOperationError(error));
      }
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    setCatError("");
    try {
      await updateCategory(id, { name: editingCategory.name.trim(), color: editingCategory.color, icon: editingCategory.icon.trim() });
      setEditingCategory(null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (error) {
      setCatError(getOperationError(error));
    }
  };

  const handleUpdateTag = async (id: number) => {
    if (!editingTag || !editingTag.name.trim()) return;
    setTagError("");
    try {
      await updateTag(id, { name: editingTag.name.trim(), color: editingTag.color });
      setEditingTag(null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (error) {
      setTagError(getOperationError(error));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t("settings.delete_category_confirm"))) return;
    setCatError("");
    try {
      await deleteCategory(id);
    } catch (error) {
      setCatError(getOperationError(error));
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm(t("settings.delete_tag_confirm"))) return;
    setTagError("");
    try {
      await deleteTag(id);
    } catch (error) {
      setTagError(getOperationError(error));
    }
  };

  const handleReset = () => {
    if (confirm(t("settings.reset_confirm"))) {
      resetApplicationStorage(localStorage);
      window.location.reload();
    }
  };

  const handleExport = () => {
    const blob = new Blob([transactionsToCsv(transactions, accounts)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setDataMessage("");
    const text = await file.text();
    const { rows, skipped } = parseTransactionsCsv(text);
    const byName = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a]));
    const ready = rows.filter((r) => byName.has(r.account.toLowerCase()));
    const unknownAccount = rows.length - ready.length;
    if (ready.length === 0) {
      setDataMessage(t("settings.import_nothing"));
      return;
    }
    if (ready.length > 500) {
      setDataMessage(t("settings.import_too_many"));
      return;
    }
    if (!confirm(`${t("settings.import_confirm")} ${ready.length}`)) return;
    setImporting(true);
    let done = 0;
    let failed = 0;
    for (const r of ready) {
      const account = byName.get(r.account.toLowerCase())!;
      try {
        await addTransaction({
          amount: r.amount,
          type: r.type,
          currency: account.currency,
          accountId: account.id,
          category: r.category,
          date: r.date,
          description: r.description || undefined,
          status: "completed",
        });
        done++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setDataMessage(`${t("settings.import_done")} ${done}. ${t("settings.import_skipped")} ${skipped + unknownAccount + failed}.`);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ---- categories grouped by kind (usage in transactions + saved choice)
  const groups = useMemo(() => {
    const used = new Map<string, { in: boolean; out: boolean }>();
    transactions.forEach((tx) => {
      const u = used.get(tx.category) || { in: false, out: false };
      if (tx.type === "income") u.in = true;
      if (tx.type === "expense") u.out = true;
      used.set(tx.category, u);
    });
    const kindOf = (name: string): Kind => {
      const saved = kinds[name.toLowerCase()];
      if (saved) return saved;
      if (SAVE_RE.test(name)) return "save";
      const u = used.get(name);
      if (u?.out) return "out";
      if (u?.in) return "in";
      return "other";
    };
    const defs: [Kind, string][] = [
      ["out", t("settings.group_out")],
      ["in", t("settings.group_in")],
      ["save", t("settings.group_save")],
      ["other", t("settings.group_other")],
    ];
    return defs
      .map(([kind, title]) => ({ kind, title, items: categories.filter((c) => kindOf(c.name) === kind) }))
      .filter((g) => g.items.length > 0);
  }, [categories, transactions, kinds, t]);

  const suggestions = useMemo(() => {
    const out: { key: string; title: string; text: string; action: string; id: number }[] = [];
    const find = (nm: string) => categories.find((c) => c.name.trim().toLowerCase() === nm) || null;
    PAIRS.forEach(([a, b]) => {
      const first = find(a);
      const second = find(b);
      if (first && second) {
        out.push({
          key: `pair-${a}`,
          title: `${t("settings.dup_title")}: «${first.name}» / «${second.name}»`,
          text: t("settings.dup_text"),
          action: `${t("settings.dup_keep")} «${second.name}»`,
          id: first.id,
        });
      }
    });
    const accountNames = new Set(accounts.map((a) => a.name.trim().toLowerCase()));
    categories.forEach((c) => {
      if (accountNames.has(c.name.trim().toLowerCase())) {
        out.push({
          key: `acc-${c.id}`,
          title: `«${c.name}» — ${t("settings.acc_name_title")}`,
          text: t("settings.acc_name_text"),
          action: t("settings.delete_category"),
          id: c.id,
        });
      }
    });
    return out;
  }, [categories, accounts, t]);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const themes = [
    { id: "dark", label: t("settings.theme_dark"), note: t("settings.theme_dark_note"), preview: "bg-[#0E0F0E]", enabled: true },
    { id: "light", label: t("settings.theme_light"), note: t("settings.theme_soon"), preview: "bg-[#F4F5F2]", enabled: false },
    { id: "system", label: t("settings.theme_system"), note: t("settings.theme_soon"), preview: "bg-[linear-gradient(90deg,#0E0F0E_50%,#F4F5F2_50%)]", enabled: false },
  ];

  const curNames: Record<Currency, string> = {
    USD: t("settings.cur_usd"),
    EUR: t("settings.cur_eur"),
    RUB: t("settings.cur_rub"),
    GBP: t("settings.cur_gbp"),
  };
  const curSymbols: Record<Currency, string> = { USD: "$", EUR: "€", RUB: "₽", GBP: "£" };

  const kindChips: [Exclude<Kind, "other">, string][] = [
    ["out", t("settings.kind_out")],
    ["in", t("settings.kind_in")],
    ["save", t("settings.kind_save")],
  ];

  const navLinks: [string, string][] = [
    ["appearance", t("settings.appearance")],
    ["region", t("settings.region_nav")],
    ["categories", t("settings.categories")],
    ["tags", t("settings.tags")],
    ["data", t("settings.data_nav")],
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 pb-20 text-[#F1F3EE] tabular-nums md:pb-6 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring [&_button]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-offset-background">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("settings.title")}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">{t("settings.description")}</p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-[#6EE7A0]/10 px-3 py-1.5 text-[12.5px] font-semibold text-[#6EE7A0]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
            {t("settings.autosave")}
          </span>
        </header>

        <div className="flex flex-wrap items-start gap-6">
          <nav aria-label={t("settings.sections")} className="sticky top-6 flex flex-[0_0_200px] flex-col gap-0.5">
            {navLinks.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={goTo(id)}
                className="rounded-[10px] px-3.5 py-2.5 font-medium text-[#A2A89C] no-underline transition-colors hover:bg-[#151714] hover:text-[#F1F3EE]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
            {/* APPEARANCE */}
            <section id="appearance" className={sectionCls}>
              <h2 className="text-xl font-semibold">{t("settings.appearance")}</h2>
              <p className="mb-5 mt-1 text-sm text-[#8D9388]">{t("settings.appearance_description")}</p>
              <div role="group" aria-label={t("settings.theme_mode")} className="flex flex-wrap gap-3.5">
                {themes.map((th) => {
                  const active = th.id === "dark" ? true : theme === th.id && th.enabled;
                  return (
                    <button
                      key={th.id}
                      disabled={!th.enabled}
                      onClick={() => th.enabled && setTheme(th.id)}
                      aria-pressed={active}
                      className={cn(
                        "box-border max-w-[240px] flex-[1_1_170px] rounded-2xl border-2 bg-[#121411] p-3 text-left text-inherit transition-colors",
                        active ? "border-[#C6F24E]" : "border-[#2A2E27] hover:border-[#5A6054]",
                        !th.enabled && "cursor-not-allowed opacity-60 hover:border-[#2A2E27]"
                      )}
                    >
                      <span className={cn("relative block h-[84px] overflow-hidden rounded-[10px]", th.preview)}>
                        <span className="absolute inset-y-0 left-0 w-[22%] bg-[#808080]/20" />
                        <span className="absolute left-[30%] top-3.5 h-2 w-[30%] rounded bg-[#808080]/50" />
                        <span className="absolute left-[30%] right-[10%] top-8 h-[30px] rounded-md bg-[#808080]/20" />
                        <span className="absolute right-[10%] top-3 h-3 w-[18px] rounded bg-[#C6F24E]" />
                      </span>
                      <span className="mt-3 flex items-center justify-between">
                        <span className="flex flex-col gap-px">
                          <span className="text-sm font-semibold">{th.label}</span>
                          <span className="text-xs text-[#8D9388]">{th.note}</span>
                        </span>
                        <span className={cn("flex h-5 w-5 flex-none items-center justify-center rounded-full border-2", active ? "border-[#C6F24E] bg-[#C6F24E]" : "border-[#2A2E27] bg-transparent")} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* REGION */}
            <section id="region" className={sectionCls}>
              <h2 className="text-xl font-semibold">{t("settings.region_nav")}</h2>
              <p className="mb-2 mt-1 text-sm text-[#8D9388]">{t("settings.regional_description")}</p>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#1E211C] py-[18px]">
                <div className="flex-[1_1_260px]">
                  <label htmlFor="lang" className="text-sm font-semibold">{t("settings.interface_language")}</label>
                  <div className="mt-0.5 text-[12.5px] text-[#8D9388]">{t("settings.language_description")}</div>
                </div>
                <span className={cn(fieldCls, "h-11 min-w-[220px] gap-2 px-3.5")}>
                  <select
                    id="lang"
                    value={i18n.language.startsWith("ru") ? "ru" : "en"}
                    onChange={(e) => { void i18n.changeLanguage(e.target.value); localStorage.setItem("i18nextLng", e.target.value); }}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-semibold text-[#F1F3EE] outline-none [&>option]:bg-[#151714] [&>option]:text-[#F1F3EE]"
                  >
                    <option value="ru">{t("settings.language_ru")}</option>
                    <option value="en">{t("settings.language_en")}</option>
                  </select>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-1 pt-[18px]">
                <div className="flex-[1_1_260px]">
                  <label htmlFor="cur" className="text-sm font-semibold">{t("settings.default_currency")}</label>
                  <div className="mt-0.5 text-[12.5px] text-[#8D9388]">{t("settings.currency_description")}</div>
                </div>
                <span className={cn(fieldCls, "h-11 min-w-[220px] gap-2 px-3.5")}>
                  <select
                    id="cur"
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-semibold text-[#F1F3EE] outline-none [&>option]:bg-[#151714] [&>option]:text-[#F1F3EE]"
                  >
                    {(["USD", "EUR", "GBP", "RUB"] as const).map((currency) => (
                      <option key={currency} value={currency}>{`${curSymbols[currency]}  ${t(`settings.currencies.${currency}`).replace(/\s*\([A-Z]{3}\)\s*$/, "")}`}</option>
                    ))}
                  </select>
                </span>
              </div>
              <div className="mt-3.5 rounded-xl border border-[#232721] bg-[#121411] px-4 py-3 text-[13px] text-[#C9CEC3]">
                {t("settings.cur_note")} {curNames[defaultCurrency]} ({curSymbols[defaultCurrency]}). {t("settings.cur_note2")}
              </div>
            </section>

            {/* CATEGORIES */}
            <section id="categories" className={sectionCls}>
              <h2 className="text-xl font-semibold">{t("settings.categories")}</h2>
              <p className="mb-5 mt-1 text-sm text-[#8D9388]">{t("settings.categories_hint")} {t("settings.total")}: {categories.length}.</p>

              <div className="flex flex-wrap gap-2.5">
                <span className={cn(fieldCls, "h-[46px] min-w-[220px] flex-[1_1_260px] px-4")}>
                  <input
                    type="text"
                    aria-label={t("settings.new_category")}
                    placeholder={t("settings.new_category")}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleAddCategory()}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#F1F3EE] outline-none placeholder:text-[#8D9388]"
                  />
                </span>
                <div role="group" aria-label={t("settings.category_kind")} className="flex h-[46px] gap-0.5 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] p-1">
                  {kindChips.map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setNewCategoryKind(k)}
                      aria-pressed={newCategoryKind === k}
                      className={cn("rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors", newCategoryKind === k ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => void handleAddCategory()} className="h-[46px] rounded-xl bg-[#C6F24E] px-[22px] text-sm font-semibold text-[#10170A]">
                  {t("common.add")}
                </button>
              </div>
              {catError && <p role="alert" className="mt-3 text-sm font-medium text-[#F87171]">{catError}</p>}

              {suggestions.length > 0 && (
                <div className="mt-5 flex flex-col gap-2.5">
                  {suggestions.map((sg) => (
                    <div key={sg.key} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[14px] border border-[#FBBF24]/30 bg-[#FBBF24]/[0.08] px-4 py-3.5">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#FBBF24] text-[13px] font-bold text-[#10170A]">!</span>
                      <span className="min-w-0 flex-[1_1_260px]">
                        <span className="block text-[13.5px] font-bold text-[#FBBF24]">{sg.title}</span>
                        <span className="mt-0.5 block text-[13px] text-[#C9CEC3]">{sg.text}</span>
                      </span>
                      <button
                        onClick={() => void handleDeleteCategory(sg.id)}
                        className="h-9 rounded-[10px] border border-[#5A4A1A] bg-transparent px-3.5 text-[13px] font-semibold text-[#F1F3EE] transition-colors hover:bg-[#1B1E1A]"
                      >
                        {sg.action}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-[22px]">
                {groups.map((gr) => (
                  <div key={gr.kind}>
                    <div className="mb-2.5 flex items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#8D9388]">{gr.title}</span>
                      <span className="text-xs text-[#8D9388]">{gr.items.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gr.items.map((cat) => {
                        const emoji = categoryEmoji(cat.name, cat.icon);
                        const color = cat.color && cat.color.toLowerCase() !== "#666666" ? cat.color : hashColor(cat.name);
                        return (
                          <span key={cat.id} className="flex h-[38px] items-center gap-2 rounded-full border border-[#232721] bg-[#1B1E1A] pl-3.5 pr-1.5">
                            <Dot color={color} />
                            <Popover onOpenChange={(open) => {
                              if (open) setEditingCategory({ id: cat.id, name: cat.name, color: cat.color || "#cccccc", icon: emoji || "" });
                              else setEditingCategory(null);
                            }}>
                              <PopoverTrigger asChild>
                                <button aria-label={t("settings.edit_category_named", { name: cat.name })} className="rounded-md text-[13.5px] font-medium text-inherit">
                                  {emoji && <span className="mr-1.5">{emoji}</span>}
                                  {cat.name}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 space-y-4 p-5 shadow-none">
                                <div className="space-y-3">
                                  <h3 className="text-base font-semibold">{t("settings.edit_category")}</h3>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="color"
                                      aria-label={t("settings.category_color")}
                                      value={editingCategory?.id === cat.id ? editingCategory.color : (cat.color || "#cccccc")}
                                      className="h-11 w-12 shrink-0 cursor-pointer p-1"
                                      onChange={(e) => setEditingCategory((prev) => prev ? { ...prev, color: e.target.value } : null)}
                                    />
                                    <Input
                                      type="text"
                                      aria-label={t("settings.category_emoji")}
                                      placeholder="🙂"
                                      maxLength={4}
                                      value={editingCategory?.id === cat.id ? editingCategory.icon : (emoji || "")}
                                      className="h-11 w-14 shrink-0 p-1 text-center text-lg"
                                      onChange={(e) => setEditingCategory((prev) => prev ? { ...prev, icon: e.target.value } : null)}
                                    />
                                    <Input
                                      type="text"
                                      aria-label={t("settings.category_name")}
                                      value={editingCategory?.id === cat.id ? editingCategory.name : cat.name}
                                      className="h-11 w-full min-w-0"
                                      onChange={(e) => setEditingCategory((prev) => prev ? { ...prev, name: e.target.value } : null)}
                                    />
                                  </div>
                                  <button onClick={() => void handleUpdateCategory(cat.id)} className="h-10 w-full rounded-xl bg-[#C6F24E] text-sm font-semibold text-[#10170A]">
                                    {t("common.save")}
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => void handleDeleteCategory(cat.id)}
                              aria-label={`${t("settings.delete_category")}: ${cat.name}`}
                              className="flex h-[26px] w-[26px] items-center justify-center rounded-full p-0 text-[#8D9388] transition-colors hover:bg-[#2A2E27] hover:text-[#F87171]"
                            >
                              <X className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {categories.length === 0 && <span className="text-xs text-[#8D9388]">{t("settings.no_categories")}</span>}
              </div>
            </section>

            {/* TAGS */}
            <section id="tags" className={sectionCls}>
              <h2 className="text-xl font-semibold">{t("settings.tags")}</h2>
              <p className="mb-5 mt-1 text-sm text-[#8D9388]">{t("settings.tags_hint")}</p>
              <div className="flex flex-wrap gap-2.5">
                <span className={cn(fieldCls, "h-[46px] min-w-[220px] flex-[1_1_260px] px-4")}>
                  <span className="mr-0.5 text-[#8D9388]">#</span>
                  <input
                    type="text"
                    aria-label={t("settings.new_tag")}
                    placeholder={t("settings.new_tag")}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleAddTag()}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#F1F3EE] outline-none placeholder:text-[#8D9388]"
                  />
                </span>
                <button onClick={() => void handleAddTag()} className="h-[46px] rounded-xl bg-[#C6F24E] px-[22px] text-sm font-semibold text-[#10170A]">
                  {t("common.add")}
                </button>
              </div>
              {tagError && <p role="alert" className="mt-3 text-sm font-medium text-[#F87171]">{tagError}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag.id} className="flex h-[38px] items-center gap-1 rounded-full border border-[#232721] bg-[#1B1E1A] pl-3.5 pr-1.5 transition-colors hover:border-[#5A6054]">
                    <Popover onOpenChange={(open) => {
                      if (open) setEditingTag({ id: tag.id, name: tag.name, color: tag.color || "#cccccc" });
                      else setEditingTag(null);
                    }}>
                      <PopoverTrigger asChild>
                        <button aria-label={t("settings.edit_tag_named", { name: tag.name })} className="rounded-md text-[13.5px] font-medium text-inherit">
                          #{tag.name}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-4 p-5 shadow-none">
                        <div className="space-y-3">
                          <h3 className="text-base font-semibold">{t("settings.edit_tag")}</h3>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              aria-label={t("settings.tag_color")}
                              value={editingTag?.id === tag.id ? editingTag.color : (tag.color || "#cccccc")}
                              className="h-11 w-12 shrink-0 cursor-pointer p-1"
                              onChange={(e) => setEditingTag((prev) => prev ? { ...prev, color: e.target.value } : null)}
                            />
                            <Input
                              type="text"
                              aria-label={t("settings.tag_name")}
                              value={editingTag?.id === tag.id ? editingTag.name : tag.name}
                              className="h-11 w-full min-w-0"
                              onChange={(e) => setEditingTag((prev) => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          </div>
                          <button onClick={() => void handleUpdateTag(tag.id)} className="h-10 w-full rounded-xl bg-[#C6F24E] text-sm font-semibold text-[#10170A]">
                            {t("common.save")}
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => void handleDeleteTag(tag.id)}
                      aria-label={`${t("settings.delete_tag")}: ${tag.name}`}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full p-0 text-[#8D9388] transition-colors hover:bg-[#2A2E27] hover:text-[#F87171]"
                    >
                      <X className="h-3 w-3" strokeWidth={2.4} />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && <span className="text-xs text-[#8D9388]">{t("settings.no_tags")}</span>}
              </div>
            </section>

            {/* DATA */}
            <section id="data" className={sectionCls}>
              <h2 className="text-xl font-semibold">{t("settings.data_nav")}</h2>
              <p className="mb-2 mt-1 text-sm text-[#8D9388]">{t("settings.data_hint")}</p>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#1E211C] py-[18px]">
                <div className="flex-[1_1_260px]">
                  <div className="text-sm font-semibold">{t("settings.export_title")}</div>
                  <div className="mt-0.5 text-[12.5px] text-[#8D9388]">{t("settings.export_hint")}</div>
                </div>
                <button onClick={handleExport} className={ghostBtn}>
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  {t("settings.export_button")}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#1E211C] py-[18px]">
                <div className="flex-[1_1_260px]">
                  <div className="text-sm font-semibold">{t("settings.import_title")}</div>
                  <div className="mt-0.5 text-[12.5px] text-[#8D9388]">{t("settings.import_hint")}</div>
                  {dataMessage && <div role="status" className="mt-2 text-[13px] text-[#C6F24E]">{dataMessage}</div>}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label={t("settings.import_button")}
                  className="hidden"
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
                <button onClick={() => fileRef.current?.click()} disabled={importing} className={cn(ghostBtn, "disabled:opacity-60")}>
                  <Upload className="h-4 w-4" strokeWidth={1.8} />
                  {importing ? t("common.loading") : t("settings.import_button")}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-[18px]">
                <div className="flex-[1_1_260px]">
                  <div className="text-sm font-semibold text-[#F87171]">{t("settings.reset_application")}</div>
                  <div className="mt-0.5 text-[12.5px] text-[#8D9388]">{t("settings.reset_description")}</div>
                </div>
                <button
                  onClick={handleReset}
                  className="h-[42px] rounded-xl border border-[#F87171]/50 bg-transparent px-[18px] text-sm font-semibold text-[#F87171] transition-colors hover:bg-[#F87171]/10"
                >
                  {t("settings.reset_data")}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
