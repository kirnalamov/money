"use client";

import { useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
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
  const { t } = useTranslation();
  const { defaultCurrency } = useStore();
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);
  const [returnRate, setReturnRate] = useState(DEFAULT_RETURN_RATE);
  const [inflationRate, setInflationRate] = useState(DEFAULT_INFLATION_RATE);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON);

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
            <p className="mt-1 text-xl font-semibold">{formatCurrency(forecast.finalPoint.nominal, defaultCurrency)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.real_value")}</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(forecast.finalPoint.real, defaultCurrency)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.invested")}</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(forecast.invested, defaultCurrency)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("portfolio.forecast.inflation_impact")}</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(forecast.inflationImpact, defaultCurrency)}</p>
          </div>
        </div>

        <div className="h-[340px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast.points} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value) => formatCurrency(Number(value), defaultCurrency)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => [
                  formatCurrency(Number(value), defaultCurrency),
                  t(`portfolio.forecast.series.${String(name)}`),
                ]}
                labelFormatter={(label) => `${t("portfolio.forecast.year")} ${label}`}
              />
              <Legend
                formatter={(value) => t(`portfolio.forecast.series.${value}`)}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="nominal"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="real"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("portfolio.forecast.note", { years: forecast.years, profit: formatCurrency(forecast.nominalProfit, defaultCurrency) })}
        </p>
      </CardContent>
    </Card>
  );
}
