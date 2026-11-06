"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";
import { useStore } from "@/lib/store";

interface InvestmentForecastCardProps {
  initialValue: number;
}

interface ForecastPoint {
  year: number;
  invested: number;
  nominal: number;
  real: number;
}

const DEFAULT_MONTHLY_CONTRIBUTION = "500";
const DEFAULT_RETURN_RATE = "8";
const DEFAULT_INFLATION_RATE = "4";
const DEFAULT_HORIZON = "20";

export function InvestmentForecastCard({ initialValue }: InvestmentForecastCardProps) {
  const { t, i18n } = useTranslation();
  const { defaultCurrency } = useStore();
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);
  const [returnRate, setReturnRate] = useState(DEFAULT_RETURN_RATE);
  const [inflationRate, setInflationRate] = useState(DEFAULT_INFLATION_RATE);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(([entry]) => setChartWidth(entry.contentRect.width));
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const forecast = useMemo(() => {
    const contribution = Math.max(0, Number(monthlyContribution) || 0);
    const annualReturn = Math.max(-99, Number(returnRate) || 0) / 100;
    const annualInflation = Math.max(0, Number(inflationRate) || 0) / 100;
    const years = Math.min(50, Math.max(1, Math.round(Number(horizonYears) || 1)));
    const monthlyRate = annualReturn / 12;

    const calculateNominal = (months: number) => {
      const growth = Math.pow(1 + monthlyRate, months);
      const contributions = monthlyRate === 0
        ? contribution * months
        : contribution * ((growth - 1) / monthlyRate);

      return Math.max(0, initialValue * growth + contributions);
    };

    const points: ForecastPoint[] = Array.from({ length: years + 1 }, (_, year) => {
      const months = year * 12;
      const nominal = calculateNominal(months);
      const inflationFactor = Math.pow(1 + annualInflation, year);

      return {
        year,
        invested: initialValue + contribution * months,
        nominal,
        real: nominal / inflationFactor,
      };
    });

    const finalPoint = points[points.length - 1];

    return {
      points,
      years,
      finalPoint,
      invested: finalPoint.invested,
      nominalProfit: finalPoint.nominal - finalPoint.invested,
      inflationImpact: finalPoint.nominal - finalPoint.real,
    };
  }, [horizonYears, inflationRate, initialValue, monthlyContribution, returnRate]);

  const setNumericValue = (setter: (value: string) => void, value: string) => {
    setter(value.replace(/[^0-9.-]/g, ""));
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t("portfolio.forecast.title")}
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              {t("portfolio.forecast.description")}
            </CardDescription>
          </div>
          <TrendingUp className="hidden h-5 w-5 text-muted-foreground sm:block" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="forecast-contribution">{t("portfolio.forecast.monthly_contribution")}</Label>
            <Input
              id="forecast-contribution"
              type="number"
              min="0"
              step="50"
              value={monthlyContribution}
              onChange={(event) => setNumericValue(setMonthlyContribution, event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast-return">{t("portfolio.forecast.annual_return")}</Label>
            <Input
              id="forecast-return"
              type="number"
              min="-99"
              max="100"
              step="0.5"
              value={returnRate}
              onChange={(event) => setNumericValue(setReturnRate, event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast-inflation">{t("portfolio.forecast.inflation")}</Label>
            <Input
              id="forecast-inflation"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={inflationRate}
              onChange={(event) => setNumericValue(setInflationRate, event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast-horizon">{t("portfolio.forecast.horizon")}</Label>
            <Input
              id="forecast-horizon"
              type="number"
              min="1"
              max="50"
              step="1"
              value={horizonYears}
              onChange={(event) => setNumericValue(setHorizonYears, event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.projected_value")}</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(forecast.finalPoint.nominal, defaultCurrency, i18n.language)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.real_value")}</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(forecast.finalPoint.real, defaultCurrency, i18n.language)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.invested")}</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(forecast.invested, defaultCurrency, i18n.language)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.inflation_impact")}</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(forecast.inflationImpact, defaultCurrency, i18n.language)}</p>
          </div>
        </div>

        <div
          ref={chartRef}
          className="h-[340px] w-full min-w-0"
          role="img"
          aria-label={t("portfolio.forecast.accessibility", {
            years: forecast.years,
            nominal: formatMoney(forecast.finalPoint.nominal, defaultCurrency, i18n.language),
            real: formatMoney(forecast.finalPoint.real, defaultCurrency, i18n.language),
          })}
        >
          {chartWidth > 0 && <ResponsiveContainer width={chartWidth} height={340}>
            <LineChart data={forecast.points} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} tick={{ className: "fill-muted-foreground text-xs" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tick={{ className: "fill-muted-foreground text-xs" }}
                tickFormatter={(value) => formatMoney(Number(value), defaultCurrency, i18n.language)}
              />
              <Tooltip
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground">
                    <p>{t("portfolio.forecast.year")} {label}</p>
                    {payload.map(point => (
                      <p key={String(point.dataKey)} className="tabular-nums">
                        {t(`portfolio.forecast.series.${String(point.dataKey)}`)}: {formatMoney(Number(point.value), defaultCurrency, i18n.language)}
                      </p>
                    ))}
                  </div>
                ) : null}
              />
              <Legend
                content={<div className="flex flex-wrap justify-center gap-3 text-xs text-foreground">
                  {([['invested', 'bg-chart-3'], ['nominal', 'bg-chart-1'], ['real', 'bg-chart-4']] as const).map(([key, color]) => (
                    <span key={key} className="inline-flex items-center gap-1">
                      <span className={`h-0.5 w-3 ${color}`} aria-hidden="true" />
                      {t(`portfolio.forecast.series.${key}`)}
                    </span>
                  ))}
                </div>}
              />
              <Line
                type="monotone"
                dataKey="invested"
                className="stroke-chart-3 [&_.recharts-line-curve]:stroke-chart-3"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="nominal"
                className="stroke-chart-1 [&_.recharts-line-curve]:stroke-chart-1"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="real"
                className="stroke-chart-4 [&_.recharts-line-curve]:stroke-chart-4"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>}
        </div>

        <p className="text-xs text-muted-foreground">
          {t("portfolio.forecast.note", { years: forecast.years, profit: formatMoney(forecast.nominalProfit, defaultCurrency, i18n.language) })}
        </p>
      </CardContent>
    </Card>
  );
}
