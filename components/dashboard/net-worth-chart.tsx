"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { differenceInDays, format, subDays } from "date-fns";
import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatCurrencyCompact, convertCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Filter, Layers } from "lucide-react";
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

interface NetWorthChartProps {
  dateRange: DateRange | undefined;
}

export function NetWorthChart({ dateRange }: NetWorthChartProps) {
  const { t } = useTranslation();
  const { accounts, defaultCurrency } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('combined');
  
  // Получаем стабильный список ID счетов
  const accountIds = useMemo(() => accounts.map(acc => acc.id), [accounts]);
  
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(() => 
    new Set(accountIds)
  );

  // Обновляем выбранные счета при изменении списка счетов
  useEffect(() => {
    setSelectedAccountIds(prev => {
      const newSet = new Set<string>();
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
    Array.from(selectedAccountIds).sort().join(','),
    [selectedAccountIds]
  );

  // Создаем стабильную строку с данными счетов для зависимостей
  const accountsDataKey = useMemo(() => 
    accounts.map(acc => `${acc.id}:${acc.balance}:${acc.currency}`).join('|'),
    [accounts]
  );

  useEffect(() => {
    // Пересоздаем filteredAccounts внутри useEffect для избежания проблем с зависимостями
    const selectedIdsArray = filteredAccountIds.split(',').filter(Boolean);
    const currentFilteredAccounts = accounts.filter(acc => selectedIdsArray.includes(acc.id));
    
    if (currentFilteredAccounts.length === 0) {
      setData([]);
      return;
    }

    const today = new Date();
    const days = dateRange?.from && dateRange?.to 
      ? differenceInDays(dateRange.to, dateRange.from) + 1 
      : 30;

    const isLargeRange = days > 60;
    const step = isLargeRange ? 7 : 1; 
    const count = Math.min(days, 30);
    const endDate = dateRange?.to || today;

    if (displayMode === 'combined') {
      // Режим "Все вместе" - показываем общую сумму
      const points: any[] = [];
      const totalBaseValue = currentFilteredAccounts.reduce((sum, acc) => {
        const converted = convertCurrency(acc.balance, acc.currency, defaultCurrency);
        return sum + converted;
      }, 0);
      
      let currentTotal = totalBaseValue;

      for (let i = count; i >= 0; i--) {
        const date = subDays(endDate, i * step);
        // Небольшие случайные колебания для визуализации
        currentTotal += (Math.random() - 0.4) * (currentTotal * 0.02);
        
        const point: any = {
          date: format(date, isLargeRange ? 'MMM d' : 'd MMM'),
          fullDate: date.toISOString(),
          total: Math.round(currentTotal),
        };
        
        points.push(point);
      }
      
      setData(points);
    } else {
      // Режим "По отдельности" - показываем каждый счет отдельной линией
      const points: any[] = [];
      
      // Генерируем данные для каждого счета
      const accountData: Record<string, number[]> = {};
      currentFilteredAccounts.forEach(acc => {
        const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
        accountData[acc.id] = [];
        let currentValue = convertedBalance;
        
        for (let i = count; i >= 0; i--) {
          currentValue += (Math.random() - 0.4) * (currentValue * 0.02);
          accountData[acc.id].push(Math.round(currentValue));
        }
      });

      // Создаем точки данных
      for (let i = count; i >= 0; i--) {
        const date = subDays(endDate, i * step);
        const point: any = {
          date: format(date, isLargeRange ? 'MMM d' : 'd MMM'),
          fullDate: date.toISOString(),
        };
        
        currentFilteredAccounts.forEach(acc => {
          point[acc.id] = accountData[acc.id][count - i];
        });
        
        points.push(point);
      }
      
      setData(points);
    }
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), displayMode, filteredAccountIds, defaultCurrency, accountsDataKey]);

  const toggleAccount = (accountId: string) => {
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

  const accountColors = [
    'hsl(var(--primary))',
    '#2979FF', // Blue
    '#FFB300', // Amber
    '#F44336', // Red
    '#AB47BC', // Purple
    '#00C853', // Green
  ];

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow h-[350px] md:h-[400px] flex flex-col">
      <div className="p-6 pb-0 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold leading-none tracking-tight">{t("dashboard.charts.net_worth_title")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {dateRange?.from ? 
                `${format(dateRange.from, 'MMM d, yyyy')} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : '...'}` 
                : t("dashboard.charts.net_worth_subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-4 w-4 mr-2" />
                  {t("dashboard.charts.filter_accounts")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("dashboard.charts.select_accounts")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accounts.map((acc) => (
                  <DropdownMenuCheckboxItem
                    key={acc.id}
                    checked={selectedAccountIds.has(acc.id)}
                    onCheckedChange={() => toggleAccount(acc.id)}
                  >
                    {acc.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Layers className="h-4 w-4 mr-2" />
                  {displayMode === 'combined' ? t("dashboard.charts.mode_combined") : t("dashboard.charts.mode_separate")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("dashboard.charts.display_mode")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
                  <DropdownMenuRadioItem value="combined">
                    {t("dashboard.charts.mode_combined")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="separate">
                    {t("dashboard.charts.mode_separate")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[200px] pb-4 px-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <AreaChart data={data}>
            <defs>
              {displayMode === 'combined' ? (
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                  const account = accounts.find(acc => acc.id === name);
                  return [formatCurrencyCompact(value, defaultCurrency), account?.name || name];
                }
              }}
            />
            {displayMode === 'combined' ? (
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
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
                    const account = accounts.find(acc => acc.id === value);
                    return account?.name || value;
                  }}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
