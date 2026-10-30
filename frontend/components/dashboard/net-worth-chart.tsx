"use client";

import Link from "next/link";

import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { differenceInDays, format, subDays } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store";

const localeMap: Record<string, Locale> = {
  ru: ru,
  en: enUS,
};
import { formatCurrencyCompact, convertCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Filter, Layers, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

type DisplayMode = 'combined' | 'separate';
type ChartType = 'area' | 'bar' | 'line';
type ChartPoint = {
  date: string;
  fullDate: string;
  total?: number;
  [key: string]: string | number | undefined;
};

interface NetWorthChartProps {
  dateRange: DateRange | undefined;
  showAnalyticsLink?: boolean;
}

export function NetWorthChart({ dateRange, showAnalyticsLink = false }: NetWorthChartProps) {
  const { t, i18n } = useTranslation();
  const { accounts, transactions, defaultCurrency } = useStore();
  const locale = localeMap[i18n.language] || enUS;
  const [data, setData] = useState<ChartPoint[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('combined');
  const [chartType, setChartType] = useState<ChartType>('area');

  // Получаем стабильный список ID счетов
  const accountIds = useMemo(() => accounts.map(acc => acc.id), [accounts]);

  const [excludedAccountIds, setExcludedAccountIds] = useState<Set<number>>(new Set());
  const selectedAccountIds = useMemo(() => new Set(accountIds.filter(id => !excludedAccountIds.has(id))), [accountIds, excludedAccountIds]);

  // Фильтруем счета по выбранным (используем useMemo для стабильности)
  const filteredAccounts = useMemo(() =>
    accounts.filter(acc => selectedAccountIds.has(acc.id)),
    [accounts, selectedAccountIds]
  );

  // Стабильный список ID отфильтрованных счетов для зависимостей
  const filteredAccountIds = useMemo(() =>
    Array.from(selectedAccountIds).sort((a, b) => a - b).join(','),
    [selectedAccountIds]
  );

  // Создаем стабильную строку с данными счетов для зависимостей
  const accountsDataKey = useMemo(() =>
    accounts.map(acc => `${acc.id}:${acc.balance}:${acc.currency}`).join('|'),
    [accounts]
  );

  // Стабильные значения дат для зависимостей
  const dateRangeFrom = dateRange?.from?.getTime() ?? null;
  const dateRangeTo = dateRange?.to?.getTime() ?? null;
  const dateRangeKey = `${dateRangeFrom}-${dateRangeTo}`;

  useEffect(() => {
    // Пересоздаем filteredAccounts внутри useEffect для избежания проблем с зависимостями
    const selectedIdsArray = filteredAccountIds.split(',').filter(Boolean).map(Number);
    const currentFilteredAccounts = accounts.filter(acc => selectedIdsArray.includes(acc.id));

    if (currentFilteredAccounts.length === 0) {
      setData([]);
      return;
    }

    const today = new Date();
    const endDate = dateRange?.to || today;
    const days = dateRange?.from && dateRange?.to
      ? differenceInDays(dateRange.to, dateRange.from) + 1
      : 30;

    const isLargeRange = days > 60;
    const step = isLargeRange ? 7 : 1;
    const count = isLargeRange ? Math.ceil(days / step) : days;

    // Start with current balances
    const accBalances = Object.fromEntries(accounts.map(a => [a.id, a.balance]));

    // Sort transactions descending (newest to oldest)
    const sortedTx = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getBalanceAtEndOfDay = (targetDate: Date) => {
      const balances = { ...accBalances };
      const targetTime = new Date(targetDate);
      targetTime.setHours(23, 59, 59, 999);

      for (const tx of sortedTx) {
        const txTime = new Date(tx.date).getTime();
        if (txTime > targetTime.getTime()) {
          // Undo this transaction
          if (tx.type === 'expense') {
            if (balances[tx.accountId] !== undefined) {
              balances[tx.accountId] += tx.amount;
            }
          } else if (tx.type === 'income') {
            if (balances[tx.accountId] !== undefined) {
              balances[tx.accountId] -= tx.amount;
            }
          } else if (tx.type === 'transfer') {
            if (balances[tx.accountId] !== undefined) {
              balances[tx.accountId] += tx.amount;
            }
            if (tx.toAccountId && balances[tx.toAccountId] !== undefined) {
              balances[tx.toAccountId] -= tx.amount;
            }
          }
        } else {
          break;
        }
      }
      return balances;
    };

    const points: ChartPoint[] = [];

    for (let i = count; i >= 0; i--) {
      const date = subDays(endDate, i * step);
      const pastBalances = getBalanceAtEndOfDay(date);

      const point: ChartPoint = {
        date: format(date, 'dd.MM', { locale }),
        fullDate: date.toISOString(),
      };

      if (displayMode === 'combined') {
        let total = 0;
        currentFilteredAccounts.forEach(acc => {
          const val = pastBalances[acc.id] || 0;
          total += convertCurrency(val, acc.currency, defaultCurrency);
        });
        point.total = Math.round(total);
      } else {
        currentFilteredAccounts.forEach(acc => {
          const val = pastBalances[acc.id] || 0;
          point[acc.id] = Math.round(convertCurrency(val, acc.currency, defaultCurrency));
        });
      }

      points.push(point);
    }

    setData(points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeKey, displayMode, filteredAccountIds, defaultCurrency, accountsDataKey, transactions, i18n.language]);

  const toggleAccount = (accountId: number) => {
    setExcludedAccountIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };
  // Dynamic colors based on trend
  const dynamicColor = useMemo(() => {
    if (data.length < 2) return 'hsl(var(--primary))';
    const start = data[0].total || 0;
    const end = data[data.length - 1].total || 0;
    const diff = end - start;

    // "Yellow border" logic: +/- 1000 threshold for neutral/stable
    // Make updates more responsive by checking absolute difference
    if (Math.abs(diff) <= 1000) return 'hsl(var(--primary))';
    if (diff > 0) return 'hsl(var(--primary))';
    return '#ef4444'; // Red (Loss)
  }, [data]);

  const accountColors = [
    'hsl(var(--primary))',
    '#83b8e8',
    '#c3a4e8',
    '#e88c9f',
    '#e4b87d',
    '#79c7b1',
  ];



  return (
    <div
      className="rounded-[1.5rem] border bg-card h-[320px] sm:h-[360px] flex flex-col"
    >
      <div className="p-6 pb-0 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-4">
          <div className="flex-1">
            <h3 className="font-semibold leading-none tracking-tight text-lg">{t("dashboard.charts.net_worth_title")}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              {dateRange?.from ?
                `${format(dateRange.from, 'dd.MM.yyyy', { locale })} - ${dateRange.to ? format(dateRange.to, 'dd.MM.yyyy', { locale }) : '...'}`
                : t("dashboard.charts.net_worth_subtitle")}
            </p>
            {showAnalyticsLink && <Link href="/analytics" className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("common.view_all")}</Link>}
          </div>
          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">{t("dashboard.charts.filter_accounts")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="px-2 py-1.5">{t("dashboard.charts.select_accounts")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-1">
                  {accounts.map((acc) => (
                    <DropdownMenuCheckboxItem
                      key={acc.id}
                      checked={selectedAccountIds.has(acc.id)}
                      onCheckedChange={() => toggleAccount(acc.id)}
                      className="pl-8 pr-2 py-1.5"
                    >
                      <span className="block max-w-[190px] truncate" title={acc.name}>{acc.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Layers className="h-4 w-4" />
                  <span className="sr-only">{displayMode === 'combined' ? t("dashboard.charts.mode_combined") : t("dashboard.charts.mode_separate")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="px-2 py-1.5">{t("dashboard.charts.display_mode")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <DropdownMenuRadioGroup value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
                    <DropdownMenuRadioItem value="combined" className="pl-8 pr-2 py-1.5">
                      {t("dashboard.charts.mode_combined")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="separate" className="pl-8 pr-2 py-1.5">
                      {t("dashboard.charts.mode_separate")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">{t("dashboard.charts.chart_style")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="px-2 py-1.5">{t("dashboard.charts.chart_style")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <DropdownMenuRadioGroup value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                    <DropdownMenuRadioItem value="area" className="pl-8 pr-2 py-1.5">
                      {t("dashboard.charts.chart_types.area")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bar" className="pl-8 pr-2 py-1.5">
                      {t("dashboard.charts.chart_types.bar")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="line" className="pl-8 pr-2 py-1.5">
                      {t("dashboard.charts.chart_types.line")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-w-0 min-h-[200px] overflow-x-auto pb-4 px-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
          {chartType === 'area' && (
            <AreaChart data={data}>
              <defs>
                {displayMode === 'combined' ? (
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dynamicColor} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={dynamicColor} stopOpacity={0} />
                  </linearGradient>
                ) : (
                  filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
                    const gradientId = `color-${acc.id}`;
                    return (
                      <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    );
                  })
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyCompact(value, defaultCurrency)}
                width={80}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (displayMode === 'combined') {
                    return [formatCurrencyCompact(value, defaultCurrency), t("dashboard.charts.total")];
                  } else {
                    const account = accounts.find(acc => acc.id.toString() === name);
                    return [formatCurrencyCompact(value, defaultCurrency), account?.name || name];
                  }
                }}
              />
              {displayMode === 'combined' ? (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={dynamicColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  baseValue="dataMin"
                  fill="url(#colorTotal)"
                  animationDuration={1000}
                />
              ) : (
                <>
                  {filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
                    const gradientId = `color-${acc.id}`;
                    return (
                      <Area
                        key={acc.id}
                        type="monotone"
                        dataKey={acc.id}
                        stroke={color}
                        fillOpacity={0.6}
                        fill={`url(#${gradientId})`}
                        animationDuration={1000}
                        strokeWidth={2}
                      />
                    );
                  })}
                  <Legend
                    formatter={(value) => {
                      const account = accounts.find(acc => acc.id.toString() === value);
                      return account?.name || value;
                    }}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </>
              )}
            </AreaChart>
          )}
          {chartType === 'bar' && (
            <BarChart data={data}>
              <defs>
                {displayMode === 'combined' ? (
                  <linearGradient id="barColorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  </linearGradient>
                ) : (
                  filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
                    const gradientId = `barColor-${acc.id}`;
                    return (
                      <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.4} />
                      </linearGradient>
                    );
                  })
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyCompact(value, defaultCurrency)}
                width={80}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (displayMode === 'combined') {
                    return [formatCurrencyCompact(value, defaultCurrency), t("dashboard.charts.total")];
                  } else {
                    const account = accounts.find(acc => acc.id.toString() === name);
                    return [formatCurrencyCompact(value, defaultCurrency), account?.name || name];
                  }
                }}
              />
              {displayMode === 'combined' ? (
                <Bar
                  dataKey="total"
                  fill="url(#barColorTotal)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                />
              ) : (
                <>
                  {filteredAccounts.map((acc) => {
                    const gradientId = `barColor-${acc.id}`;
                    return (
                      <Bar
                        key={acc.id}
                        dataKey={acc.id}
                        fill={`url(#${gradientId})`}
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      />
                    );
                  })}
                  <Legend
                    formatter={(value) => {
                      const account = accounts.find(acc => acc.id.toString() === value);
                      return account?.name || value;
                    }}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </>
              )}
            </BarChart>
          )}
          {chartType === 'line' && (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyCompact(value, defaultCurrency)}
                width={80}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (displayMode === 'combined') {
                    return [formatCurrencyCompact(value, defaultCurrency), t("dashboard.charts.total")];
                  } else {
                    const account = accounts.find(acc => acc.id.toString() === name);
                    return [formatCurrencyCompact(value, defaultCurrency), account?.name || name];
                  }
                }}
              />
              {displayMode === 'combined' ? (
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              ) : (
                <>
                  {filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
                    return (
                      <Line
                        key={acc.id}
                        type="monotone"
                        dataKey={acc.id}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ fill: color, r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                    );
                  })}
                  <Legend
                    formatter={(value) => {
                      const account = accounts.find(acc => acc.id.toString() === value);
                      return account?.name || value;
                    }}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </>
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
