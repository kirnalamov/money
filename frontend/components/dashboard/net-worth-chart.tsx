"use client";

import Link from "next/link";

import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { differenceInDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useStore } from "@/lib/store";

const localeMap: Record<string, Locale> = {
  ru: ru,
  en: enUS,
};
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { accountExistsAtEndOfDay, chartDomain } from "@/lib/chart-domain";
import { Button } from "@/components/ui/button";
import { BarChart3, Filter, Layers, Settings } from "lucide-react";
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
  dailyChange?: number;
  dailyPercent?: number;
  event?: string;
  [key: string]: string | number | undefined;
};

function formatCompactCurrency(value: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "RUB" ? "₽" : "$";
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000) return `${sign}${symbol}${(absolute / 1_000_000).toFixed(absolute >= 10_000_000 ? 0 : 1)}m`;
  if (absolute >= 1_000) return `${sign}${symbol}${(absolute / 1_000).toFixed(absolute >= 10_000 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(absolute)}`;
}

function formatSignedCurrency(value: number, currency: string) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatCurrency(Math.abs(value), currency)}`;
}

function FinancialTooltip({
  active,
  payload,
  currency,
  displayMode,
  accounts,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; payload?: ChartPoint }>;
  currency: string;
  displayMode: DisplayMode;
  accounts: Array<{ id: number; name: string }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="min-w-[150px] rounded-xl border border-[#303830] bg-[#191D1A] p-3 text-xs shadow-xl">
      <p className="text-[#A0A7A2]">{point.fullDate ? format(new Date(point.fullDate), "dd.MM.yyyy") : point.date}</p>
      {displayMode === "combined" ? (
        <>
          <p className="mt-1 font-semibold tabular-nums text-[#F5F7F4]">{formatCurrency(point.total || 0, currency)}</p>
          {typeof point.dailyChange === "number" && <p className={point.dailyChange >= 0 ? "mt-1 text-[#C0F05C]" : "mt-1 text-[#F27683]"}>{formatSignedCurrency(point.dailyChange, currency)}{typeof point.dailyPercent === "number" ? ` (${point.dailyPercent >= 0 ? "+" : ""}${point.dailyPercent.toFixed(2)}%)` : ""}</p>}
          {point.event && <p className="mt-1 max-w-[190px] truncate text-[#89928B]">{point.event}</p>}
        </>
      ) : payload.map((entry) => {
        const account = accounts.find((item) => item.id.toString() === entry.name);
        return <p key={entry.name} className="mt-1 font-semibold tabular-nums text-[#F5F7F4]">{account?.name || entry.name}: {formatCurrency(Number(entry.value || 0), currency)}</p>;
      })}
    </div>
  );
}

interface NetWorthChartProps {
  dateRange: DateRange | undefined;
  showAnalyticsLink?: boolean;
  periodControls?: ReactNode;
}

export function NetWorthChart({ dateRange, showAnalyticsLink = false, periodControls }: NetWorthChartProps) {
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
    const earliestDate = [...transactions.map(tx => new Date(tx.date).getTime()), ...accounts.map(acc => acc.created_at ? new Date(acc.created_at).getTime() : NaN)].filter(Number.isFinite);
    const days = dateRange?.from && dateRange?.to
      ? Math.max(0, differenceInDays(dateRange.to, dateRange.from))
      : earliestDate.length ? Math.max(0, differenceInDays(endDate, new Date(Math.min(...earliestDate)))) : 30;

    const step = 1;
    const count = days;

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
      const date = subDays(endDate, Math.min(i * step, days));
      const pastBalances = getBalanceAtEndOfDay(date);

      const point: ChartPoint = {
        date: format(date, 'dd.MM', { locale }),
        fullDate: date.toISOString(),
      };

      if (displayMode === 'combined') {
        let total = 0;
        currentFilteredAccounts.forEach(acc => {
          const val = accountExistsAtEndOfDay(acc.created_at, date) ? (pastBalances[acc.id] || 0) : 0;
          total += convertCurrency(val, acc.currency, defaultCurrency);
        });
        point.total = total;
      } else {
        currentFilteredAccounts.forEach(acc => {
          const val = accountExistsAtEndOfDay(acc.created_at, date) ? (pastBalances[acc.id] || 0) : 0;
          point[acc.id] = convertCurrency(val, acc.currency, defaultCurrency);
        });
      }

      points.push(point);
    }

    points.forEach((point, index) => {
      if (displayMode !== 'combined' || index === 0) return;
      const previous = points[index - 1].total || 0;
      point.dailyChange = (point.total || 0) - previous;
      point.dailyPercent = previous ? (point.dailyChange / previous) * 100 : 0;
      const pointDate = new Date(point.fullDate);
      point.event = transactions
        .filter((transaction) => {
          const timestamp = new Date(transaction.date).getTime();
          return timestamp >= startOfDay(pointDate).getTime() && timestamp <= endOfDay(pointDate).getTime();
        })
        .map((transaction) => transaction.description || transaction.category)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
    });

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

  const domain = useMemo(() => chartDomain(data.flatMap(point =>
    displayMode === 'combined' ? [point.total] : filteredAccounts.map(account => point[account.id])
  ).filter((value): value is number => typeof value === 'number')), [data, displayMode, filteredAccounts]);
  const xTicks = useMemo(() => {
    if (data.length <= 5) return data.map((point) => point.date);
    const tickCount = data.length > 180 ? 5 : data.length > 60 ? 6 : 7;
    return Array.from({ length: tickCount }, (_, index) => data[Math.round((index * (data.length - 1)) / (tickCount - 1))]?.date).filter(Boolean);
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
      className="flex h-[303px] flex-col overflow-hidden rounded-[20px] border border-[#262B28] bg-[#111311]"
    >
      <div className="px-6 pb-1 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-[#C0F05C]" aria-hidden="true" />
            <div className="min-w-0">
            <h3 className="text-[17px] font-semibold leading-none tracking-tight text-[#F5F7F4]">{t("dashboard.charts.net_worth_title")}</h3>
            <p className="mt-1 text-xs text-[#89928B]">
              {dateRange?.from ?
                `${format(dateRange.from, 'dd.MM.yyyy', { locale })} - ${dateRange.to ? format(dateRange.to, 'dd.MM.yyyy', { locale }) : '...'}`
                : t("dashboard.charts.net_worth_subtitle")}
            </p>
            <p className="mt-0.5 text-[11px] text-[#89928B]">{t(chartType === 'bar' ? 'dashboard.charts.zero_scale' : 'dashboard.charts.dynamic_scale')}</p>
            {showAnalyticsLink && <Link href="/analytics" className="sr-only">{t("common.view_all")}</Link>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          {periodControls}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#A0A7A2] hover:bg-white/[0.04] hover:text-[#F5F7F4]">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#A0A7A2] hover:bg-white/[0.04] hover:text-[#F5F7F4]">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#A0A7A2] hover:bg-white/[0.04] hover:text-[#F5F7F4]">
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
      </div>
      <div className="min-h-0 w-full min-w-0 flex-1 px-3 pb-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
          {chartType === 'area' && (
            <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {displayMode === 'combined' ? (
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C0F05C" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#C0F05C" stopOpacity={0.01} />
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
              <CartesianGrid stroke="#30362F" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                stroke="#89928B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#89928B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={domain}
                allowDataOverflow
                tickCount={4}
                tickFormatter={(value) => formatCompactCurrency(value, defaultCurrency)}
                width={48}
              />
              <Tooltip
                content={<FinancialTooltip currency={defaultCurrency} displayMode={displayMode} accounts={accounts} />}
                cursor={{ stroke: '#C0F05C', strokeDasharray: '4 4', strokeOpacity: 0.5 }}
              />
              {displayMode === 'combined' ? (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#C0F05C"
                  strokeWidth={2.5}
                  activeDot={{ r: 5, fill: '#C0F05C', stroke: '#111311', strokeWidth: 2 }}
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
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.65} vertical={false} />
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
                tickFormatter={(value) => formatCurrency(value, defaultCurrency)}
                width={100}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (displayMode === 'combined') {
                    return [formatCurrency(value, defaultCurrency), t("dashboard.charts.total")];
                  } else {
                    const account = accounts.find(acc => acc.id.toString() === name);
                    return [formatCurrency(value, defaultCurrency), account?.name || name];
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
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.65} vertical={false} />
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
                domain={domain}
                allowDataOverflow
                tickCount={4}
                tickFormatter={(value) => formatCurrency(value, defaultCurrency)}
                width={100}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (displayMode === 'combined') {
                    return [formatCurrency(value, defaultCurrency), t("dashboard.charts.total")];
                  } else {
                    const account = accounts.find(acc => acc.id.toString() === name);
                    return [formatCurrency(value, defaultCurrency), account?.name || name];
                  }
                }}
              />
              {displayMode === 'combined' ? (
                <Line
                  type="linear"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  animationDuration={1000}
                />
              ) : (
                <>
                  {filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
                    return (
                      <Line
                        key={acc.id}
                        type="linear"
                        dataKey={acc.id}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
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
