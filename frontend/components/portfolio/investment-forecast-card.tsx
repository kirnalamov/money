"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatAmount } from "@/components/transactions/money";

interface InvestmentForecastCardProps {
    initialValue: number;
}

function parseNum(value: string, fallback: number, min: number, max: number) {
    const parsed = parseFloat(value.replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
    return (
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">{label}
            <span className="flex h-[46px] items-center rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-4 transition-colors duration-150 focus-within:border-[#C6F24E]">
                <input type="text" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#F1F3EE] outline-none" />
                <span className="font-medium text-[#8D9388]">{suffix}</span>
            </span>
        </label>
    );
}

export function InvestmentForecastCard({ initialValue }: InvestmentForecastCardProps) {
    const { t, i18n } = useTranslation();
    const { defaultCurrency } = useStore();
    const locale = i18n.language;
    const ru = locale.startsWith("ru");
    const [contrib, setContrib] = useState("500");
    const [ret, setRet] = useState("8");
    const [infl, setInfl] = useState("4");
    const [years, setYears] = useState("20");

    const model = useMemo(() => {
        const c = parseNum(contrib, 0, 0, 1_000_000);
        const r = parseNum(ret, 0, 0, 60) / 100;
        const inf = parseNum(infl, 0, 0, 40) / 100;
        const n = Math.round(parseNum(years, 1, 1, 50));

        const nominalAt = (tYear: number) => {
            const months = tYear * 12;
            const i = r / 12;
            if (i === 0) return initialValue + c * months;
            const growth = Math.pow(1 + i, months);
            return initialValue * growth + c * (growth - 1) / i;
        };
        const investedAt = (tYear: number) => initialValue + c * 12 * tYear;
        const realAt = (tYear: number) => nominalAt(tYear) / Math.pow(1 + inf, tYear);

        const nominal = nominalAt(n);
        // «Красивая» шкала по оси Y.
        const raw = Math.max(nominal / 4, 1);
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        let step = pow * 10;
        for (const k of [1, 2, 2.5, 5, 10]) { if (k * pow >= raw) { step = k * pow; break; } }
        const ymax = step * Math.ceil(nominal / step);

        const px = (tYear: number) => (tYear / n) * 100;
        const py = (v: number) => 100 - (v / ymax) * 100;
        const pts = (fn: (tYear: number) => number) => {
            const out: string[] = [];
            for (let tYear = 0; tYear <= n; tYear++) out.push(`${px(tYear).toFixed(2)},${py(fn(tYear)).toFixed(2)}`);
            return out.join(" ");
        };
        const nominalPts = pts(nominalAt);

        const short = (v: number) => {
            if (v === 0) return "0";
            const fmt = (x: number) => {
                const s = x.toFixed(1).replace(/\.0$/, "");
                return ru ? s.replace(".", ",") : s;
            };
            if (v >= 1e6) return ru ? `${fmt(v / 1e6)} млн` : `${fmt(v / 1e6)}M`;
            return ru ? `${fmt(v / 1000)} тыс.` : `${fmt(v / 1000)}K`;
        };
        const yTicks: { top: number; label: string }[] = [];
        for (let v = 0; v <= ymax + 1e-6; v += step) yTicks.push({ top: 100 - (v / ymax) * 100, label: short(v) });
        const xTicks = Array.from({ length: 5 }, (_, k) => {
            const tYear = Math.round((n * k) / 4);
            return { left: px(tYear), label: String(tYear) };
        });

        return {
            years: n,
            nominal,
            real: realAt(n),
            invested: investedAt(n),
            yTicks,
            xTicks,
            chart: {
                nominal: nominalPts,
                real: pts(realAt),
                invested: pts(investedAt),
                area: `${nominalPts} 100,100 0,100`,
                nTop: py(nominal),
                rTop: py(realAt(n)),
                iTop: py(investedAt(n)),
            },
        };
    }, [contrib, ret, infl, years, initialValue]);

    return (
        <section aria-label={t("portfolio.forecast.title")} className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714] text-[#F1F3EE]">
            <div className="flex items-start gap-3.5 border-b border-[#232721] px-7 py-6">
                <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]"><TrendingUp className="h-[18px] w-[18px]" /></span>
                <div>
                    <h2 className="text-base font-semibold">{t("portfolio.forecast.title")}</h2>
                    <p className="mt-1 text-[13.5px] text-[#8D9388]">{t("portfolio.forecast.description")}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-start gap-8 p-7">
                <div className="flex min-w-[220px] flex-[0_1_260px] flex-col gap-[18px]">
                    <Field label={t("portfolio.forecast.monthly_contribution")} value={contrib} onChange={setContrib} suffix={defaultCurrency === "USD" ? "$" : defaultCurrency === "EUR" ? "€" : defaultCurrency === "GBP" ? "£" : "₽"} />
                    <Field label={t("portfolio.forecast.annual_return")} value={ret} onChange={setRet} suffix="%" />
                    <Field label={t("portfolio.forecast.inflation")} value={infl} onChange={setInfl} suffix="%" />
                    <Field label={t("portfolio.forecast.horizon")} value={years} onChange={setYears} suffix={t("portfolio.forecast.years_suffix")} />
                    <p className="text-[12.5px] text-[#8D9388]">{t("portfolio.forecast.start_note", { value: formatAmount(initialValue, defaultCurrency, locale) })}</p>
                </div>

                <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                            <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]"><span aria-hidden="true" className="h-[3px] w-2.5 rounded-sm bg-[#C6F24E]" />{t("portfolio.forecast.projected_value")}</div>
                            <div className="mt-1.5 text-[21px] font-bold tabular-nums">{formatAmount(model.nominal, defaultCurrency, locale)}</div>
                        </div>
                        <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                            <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]"><span aria-hidden="true" className="h-[3px] w-2.5 rounded-sm bg-[#FBBF24]" />{t("portfolio.forecast.real_value")}</div>
                            <div className="mt-1.5 text-[21px] font-bold tabular-nums">{formatAmount(model.real, defaultCurrency, locale)}</div>
                        </div>
                        <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                            <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]"><span aria-hidden="true" className="h-[3px] w-2.5 rounded-sm bg-[#8D9388]" />{t("portfolio.forecast.invested")}</div>
                            <div className="mt-1.5 text-[21px] font-bold tabular-nums">{formatAmount(model.invested, defaultCurrency, locale)}</div>
                        </div>
                        <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                            <div className="text-[12.5px] text-[#8D9388]">{t("portfolio.forecast.inflation_impact")}</div>
                            <div className="mt-1.5 text-[21px] font-bold tabular-nums text-[#F87171]">{formatAmount(-(model.nominal - model.real), defaultCurrency, locale)}</div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-3.5 text-[13px] text-[#8D9388]">{t("portfolio.forecast.chart_title", { count: model.years })}</div>
                        <div className="relative ml-[60px] h-[300px]">
                            {model.yTicks.map(tick => (
                                <div key={tick.label + tick.top} aria-hidden="true">
                                    <div className="absolute left-0 right-0 border-t border-dashed border-[#232721]" style={{ top: `${tick.top}%` }} />
                                    <div className="absolute w-[52px] -translate-y-1/2 text-right text-xs text-[#8D9388]" style={{ top: `${tick.top}%`, left: -60 }}>{tick.label}</div>
                                </div>
                            ))}
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t("portfolio.forecast.accessibility", { years: model.years, nominal: formatAmount(model.nominal, defaultCurrency, locale), real: formatAmount(model.real, defaultCurrency, locale) })} className="absolute inset-0 h-full w-full overflow-visible">
                                <polygon points={model.chart.area} fill="rgba(198,242,78,0.07)" stroke="none" />
                                <polyline points={model.chart.invested} fill="none" stroke="#8D9388" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                                <polyline points={model.chart.real} fill="none" stroke="#FBBF24" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                                <polyline points={model.chart.nominal} fill="none" stroke="#C6F24E" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                            </svg>
                            <span aria-hidden="true" className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6F24E] shadow-[0_0_0_3px_#151714]" style={{ top: `${model.chart.nTop}%` }} />
                            <span aria-hidden="true" className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FBBF24] shadow-[0_0_0_3px_#151714]" style={{ top: `${model.chart.rTop}%` }} />
                            <span aria-hidden="true" className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8D9388] shadow-[0_0_0_3px_#151714]" style={{ top: `${model.chart.iTop}%` }} />
                        </div>
                        <div className="relative ml-[60px] mt-2.5 h-7">
                            {model.xTicks.map(tick => (
                                <span key={tick.label} className="absolute top-0 -translate-x-1/2 text-xs text-[#8D9388]" style={{ left: `${tick.left}%` }}>{tick.label}</span>
                            ))}
                        </div>
                        <div className="ml-[60px] mt-0.5 text-center text-xs text-[#8D9388]">{t("portfolio.forecast.years_axis")}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
