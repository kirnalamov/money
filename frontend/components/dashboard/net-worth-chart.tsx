"use client";

import { useRouter } from "next/navigation";

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

interface NetWorthChartProps {
  dateRange: DateRange | undefined;
}

export function NetWorthChart({ dateRange }: NetWorthChartProps) {
  const { t, i18n } = useTranslation();
  const { accounts, transactions, defaultCurrency } = useStore();
  const locale = localeMap[i18n.language] || enUS;
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('combined');
  const [chartType, setChartType] = useState<ChartType>('area');

  // Получаем стабильный список ID счетов
  const accountIds = useMemo(() => accounts.map(acc => acc.id), [accounts]);

  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(() =>
    new Set(accountIds)
  );

  // Обновляем выбранные счета при изменении списка счетов
  useEffect(() => {
    setSelectedAccountIds(prev => {
      const newSet = new Set<number>();
      let hasChanges = false;

      accountIds.forEach(id => {
        if (prev.has(id)) {
          newSet.add(id);
        } else {
          hasChanges = true;
        }
      });

      // Если все счета были удалены из выбора, выбираем все
      if (newSet.size === 0 && accountIds.length > 0) {
        accountIds.forEach(id => newSet.add(id));
        hasChanges = true;
      }

      // Обновляем только если есть изменения
      return hasChanges ? newSet : prev;
    });
  }, [accountIds]);

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
  const dateRangeKey = useMemo(() => {
    const from = dateRange?.from?.getTime() ?? null;
    const to = dateRange?.to?.getTime() ?? null;
    return `${from}-${to}`;
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

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
    let accBalances = Object.fromEntries(accounts.map(a => [a.id, a.balance]));

    // Sort transactions descending (newest to oldest)
    const sortedTx = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getBalanceAtEndOfDay = (targetDate: Date) => {
      let balances = { ...accBalances };
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

    const points: any[] = [];

    for (let i = count; i >= 0; i--) {
      const date = subDays(endDate, i * step);
      const pastBalances = getBalanceAtEndOfDay(date);

      const point: any = {
        date: format(date, 'dd.MM', { locale }),
        fullDate: date.toISOString(),
      };

      if (displayMode === 'combined') {
        let total = 0;
        currentFilteredAccounts.forEach(acc => {
          let val = pastBalances[acc.id] || 0;
          total += convertCurrency(val, acc.currency, defaultCurrency);
        });
        point.total = Math.round(total);
      } else {
        currentFilteredAccounts.forEach(acc => {
          let val = pastBalances[acc.id] || 0;
          point[acc.id] = Math.round(convertCurrency(val, acc.currency, defaultCurrency));
        });
      }

      points.push(point);
    }

    setData(points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeKey, displayMode, filteredAccountIds, defaultCurrency, accountsDataKey, transactions]);

  const toggleAccount = (accountId: number) => {
    setSelectedAccountIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };
  // Calculate trend percentage to determine color
  const trendPercentage = useMemo(() => {
    if (data.length < 2) return 0;
    const start = data[0].total || 0;
    const end = data[data.length - 1].total || 0;
    if (start === 0) return 0;
    return (end - start) / Math.abs(start);
  }, [data]);

  // Dynamic colors based on trend
  const dynamicColor = useMemo(() => {
    if (data.length < 2) return 'hsl(142, 76%, 36%)';
    const start = data[0].total || 0;
    const end = data[data.length - 1].total || 0;
    const diff = end - start;

    // "Yellow border" logic: +/- 1000 threshold for neutral/stable
    // Make updates more responsive by checking absolute difference
    if (Math.abs(diff) <= 1000) return '#FFB300'; // Amber/Yellow (Stable)
    if (diff > 0) return 'hsl(142, 76%, 36%)'; // Green (Gain)
    return '#ef4444'; // Red (Loss)
  }, [data]);

  const accountColors = [
    'hsl(var(--primary))',
    '#2979FF', // Blue
    '#FFB300', // Amber
    '#F44336', // Red
    '#AB47BC', // Purple
    '#00C853', // Green
  ];



  return (
    <div
      onClick={() => router.push("/analytics")}
      className="rounded-xl border glass-card premium-gradient h-[350px] md:h-full md:min-h-[350px] flex flex-col transition-all duration-200 hover:shadow-lg cursor-pointer group"
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
          </div>
          <div className="flex gap-2">
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
                      {acc.name}
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
      <div className="flex-1 w-full min-h-[200px] pb-4 px-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
          {chartType === 'area' && (
            <AreaChart data={data}>
              <defs>
                {displayMode === 'combined' ? (
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dynamicColor} stopOpacity={0.3} />
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
                tickFormatter={(value) => {
                  const currencySymbols: Record<string, string> = {
                    'USD': '$',
                    'EUR': '€',
                    'GBP': '£',
                    'RUB': '₽',
                  };
                  const symbol = currencySymbols[defaultCurrency] || '$';
                  const isAfter = defaultCurrency === 'RUB';
                  const formattedValue = (value / 1000).toFixed(0);
                  return isAfter ? `${formattedValue}k ${symbol}` : `${symbol}${formattedValue}k`;
                }}
                width={40}
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
                tickFormatter={(value) => {
                  const currencySymbols: Record<string, string> = {
                    'USD': '$',
                    'EUR': '€',
                    'GBP': '£',
                    'RUB': '₽',
                  };
                  const symbol = currencySymbols[defaultCurrency] || '$';
                  const isAfter = defaultCurrency === 'RUB';
                  const formattedValue = (value / 1000).toFixed(0);
                  return isAfter ? `${formattedValue}k ${symbol}` : `${symbol}${formattedValue}k`;
                }}
                width={40}
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
                  {filteredAccounts.map((acc, index) => {
                    const color = accountColors[index % accountColors.length];
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
                tickFormatter={(value) => {
                  const currencySymbols: Record<string, string> = {
                    'USD': '$',
                    'EUR': '€',
                    'GBP': '£',
                    'RUB': '₽',
                  };
                  const symbol = currencySymbols[defaultCurrency] || '$';
                  const isAfter = defaultCurrency === 'RUB';
                  const formattedValue = (value / 1000).toFixed(0);
                  return isAfter ? `${formattedValue}k ${symbol}` : `${symbol}${formattedValue}k`;
                }}
                width={40}
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
