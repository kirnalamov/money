"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { convertCurrency, formatPercent } from "@/lib/utils";
import { formatAmount } from "@/components/transactions/money";
import { Position } from "@/types";
import { YIELD_BY_CLASS, logoColor } from "./estimates";

interface PositionsTableProps {
    onEdit: (position: Position) => void;
    onDelete: (position: Position) => void;
    onAddBond: () => void;
}

const GRID = "grid grid-cols-[minmax(220px,2.2fr)_70px_110px_110px_130px_150px_72px] items-center gap-4 px-7";
const CLASS_ORDER = ["stock", "bond", "etf", "crypto", "cash"] as const;

export function PositionsTable({ onEdit, onDelete, onAddBond }: PositionsTableProps) {
    const { t, i18n } = useTranslation();
    const { positions, accounts, defaultCurrency } = useStore();
    const locale = i18n.language;
    const [tab, setTab] = useState<string>("all");

    const grandTotal = useMemo(() => positions.reduce((sum, position) =>
        sum + convertCurrency(position.quantity * position.currentPrice, position.currency, defaultCurrency), 0), [positions, defaultCurrency]);

    const groups = CLASS_ORDER
        .filter(key => tab === "all" || tab === key)
        .map(key => {
            const items = positions.filter(position => (position.assetClass || "stock") === key);
            const value = items.reduce((sum, position) => sum + convertCurrency(position.quantity * position.currentPrice, position.currency, defaultCurrency), 0);
            const cost = items.reduce((sum, position) => sum + convertCurrency(position.quantity * position.avgPrice, position.currency, defaultCurrency), 0);
            return { key, items, value, pl: value - cost, cost };
        })
        .filter(group => group.items.length > 0 || group.key === "bond");

    const tag = (assetClass: string) => {
        const cfg = YIELD_BY_CLASS[assetClass];
        if (!cfg) return null;
        const percent = formatPercent(cfg.rate * 100, locale, false, cfg.rate * 100 % 1 ? 1 : 0);
        return t(cfg.kind === "cpn" ? "portfolio.income.tag_coupon" : "portfolio.income.tag_div", { percent });
    };

    const accountName = (id: number) => accounts.find(account => account.id === id)?.name || "";
    const qtyLabel = (quantity: number) => new Intl.NumberFormat(locale.startsWith("ru") ? "ru-RU" : "en-US", { maximumFractionDigits: 8 }).format(quantity);

    const tabs: [string, string][] = [
        ["all", t("portfolio.tabs.all")],
        ["stock", t("portfolio.asset_classes.stock")],
        ["bond", t("portfolio.asset_classes.bond")],
        ["etf", t("portfolio.asset_classes.etf")],
        ["crypto", t("portfolio.tabs.crypto")],
    ];

    return (
        <section aria-label={t("portfolio.positions_section")} className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714] text-[#F1F3EE]">
            <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
                <div>
                    <h2 className="text-base font-semibold">{t("portfolio.positions_section")}</h2>
                    <p className="mt-1 text-[13.5px] text-[#8D9388]">{t("portfolio.positions_count", { count: positions.length })} · {formatAmount(grandTotal, defaultCurrency, locale)}</p>
                </div>
                <div role="group" aria-label={t("portfolio.asset_class")} className="flex h-11 max-w-full gap-0.5 overflow-x-auto rounded-xl border border-[#232721] bg-[#0E0F0E] p-1">
                    {tabs.map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${tab === value ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]"}`}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                    <div className={`${GRID} border-t border-[#232721] py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388]`}>
                        <span>{t("portfolio.table.position")}</span>
                        <span className="text-right">{t("portfolio.table.qty")}</span>
                        <span className="text-right">{t("portfolio.table.avg_price")}</span>
                        <span className="text-right">{t("portfolio.table.cur_price")}</span>
                        <span className="text-right">{t("portfolio.table.value")}</span>
                        <span className="text-right">{t("portfolio.table.pnl")}</span>
                        <span />
                    </div>

                    {groups.map(group => {
                        const plUp = group.pl >= 0;
                        const plPct = group.cost > 0 ? (group.pl / group.cost) * 100 : 0;
                        return (
                            <div key={group.key}>
                                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[#1E211C] bg-[#121411] px-7 py-3">
                                    <span className="flex items-baseline gap-2.5">
                                        <span className="text-sm font-bold">{t(`portfolio.asset_classes.${group.key}`)}</span>
                                        <span className="text-[12.5px] text-[#8D9388]">{group.items.length > 0 ? t("portfolio.positions_count", { count: group.items.length }) : t("portfolio.no_class_positions")}</span>
                                    </span>
                                    {group.items.length > 0 && (
                                        <span className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] tabular-nums">
                                            <span className="font-semibold">{formatAmount(group.value, defaultCurrency, locale)}</span>
                                            <span className="text-[#8D9388]">{t("portfolio.share_of_portfolio", { percent: formatPercent(grandTotal > 0 ? (group.value / grandTotal) * 100 : 0, locale, false, 0) })}</span>
                                            <span className={`font-semibold ${plUp ? "text-[#6EE7A0]" : "text-[#F87171]"}`}>{formatAmount(group.pl, defaultCurrency, locale, true)} ({formatPercent(plPct, locale, true, 2)})</span>
                                        </span>
                                    )}
                                </div>

                                {group.key === "bond" && group.items.length === 0 && (
                                    <div className="mx-7 my-4 flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[14px] border border-dashed border-[#2A2E27] px-6 py-5">
                                        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-[#1E211C] text-[#8D9388]"><FileText aria-hidden="true" className="h-5 w-5" /></span>
                                        <span className="flex min-w-0 flex-1 basis-[260px] flex-col gap-0.5">
                                            <span className="font-semibold">{t("portfolio.bonds_empty_title")}</span>
                                            <span className="text-[13px] text-[#8D9388]">{t("portfolio.bonds_empty_desc")}</span>
                                        </span>
                                        <button type="button" onClick={onAddBond} className="h-10 rounded-xl border border-[#2A2E27] px-4 text-[13.5px] font-semibold text-[#C9CEC3] transition-colors duration-150 hover:border-[#C6F24E] hover:text-[#C6F24E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]">{t("portfolio.add_bond")}</button>
                                    </div>
                                )}

                                {group.items.map(position => {
                                    const value = position.quantity * position.currentPrice;
                                    const cost = position.quantity * position.avgPrice;
                                    const pl = value - cost;
                                    const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
                                    const valueDefault = convertCurrency(value, position.currency, defaultCurrency);
                                    const color = logoColor(position.symbol);
                                    const rowTag = tag(position.assetClass || "stock");
                                    return (
                                        <div key={`${position.symbol}-${position.accountId}`} className={`${GRID} border-t border-[#1E211C] py-3.5 transition-colors duration-150 hover:bg-[#1A1D19]`}>
                                            <div className="flex min-w-0 items-center gap-3.5">
                                                <span aria-hidden="true" className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl text-[17px] font-bold" style={{ backgroundColor: `${color}24`, color }}>{position.symbol.charAt(0).toUpperCase()}</span>
                                                <span className="flex min-w-0 flex-col items-start gap-0.5">
                                                    <span className="text-[14.5px] font-semibold">{position.symbol}</span>
                                                    <span className="max-w-full truncate text-[12.5px] text-[#8D9388]">{position.name} · {accountName(position.accountId)}</span>
                                                    {rowTag && <span className="mt-1 rounded-full bg-[#C6F24E]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#C6F24E]">{rowTag}</span>}
                                                </span>
                                            </div>
                                            <span className="text-right font-medium tabular-nums">{qtyLabel(position.quantity)}</span>
                                            <span className="text-right tabular-nums text-[#C9CEC3]">{formatAmount(position.avgPrice, position.currency, locale)}</span>
                                            <span className="text-right font-medium tabular-nums">{formatAmount(position.currentPrice, position.currency, locale)}</span>
                                            <span className="flex flex-col items-end gap-0.5">
                                                <span className="text-[14.5px] font-bold tabular-nums">{formatAmount(valueDefault, defaultCurrency, locale)}</span>
                                                {position.currency !== defaultCurrency && <span className="text-xs tabular-nums text-[#8D9388]">{formatAmount(value, position.currency, locale)}</span>}
                                            </span>
                                            <span className="flex flex-col items-end gap-0.5">
                                                <span className={`font-semibold tabular-nums ${pl >= 0 ? "text-[#6EE7A0]" : "text-[#F87171]"}`}>{formatAmount(pl, position.currency, locale, true)}</span>
                                                <span className={`text-[12.5px] font-semibold tabular-nums ${pl >= 0 ? "text-[#6EE7A0]" : "text-[#F87171]"}`}>{formatPercent(plPercent, locale, true, 2)}</span>
                                            </span>
                                            <span className="flex justify-end gap-1">
                                                <button type="button" aria-label={`${t("portfolio.edit_position")} ${position.symbol}`} onClick={() => onEdit(position)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] transition-colors duration-150 hover:bg-[#232721] hover:text-[#F1F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"><Pencil aria-hidden="true" className="h-[15px] w-[15px]" /></button>
                                                <button type="button" aria-label={`${t("portfolio.delete_position")} ${position.symbol}`} onClick={() => onDelete(position)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] transition-colors duration-150 hover:bg-[#232721] hover:text-[#F87171] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"><Trash2 aria-hidden="true" className="h-[15px] w-[15px]" /></button>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
