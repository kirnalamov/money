"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { differenceInDays, format, subDays } from "date-fns";
import { useEffect, useState } from "react";

interface NetWorthChartProps {
  dateRange: DateRange | undefined;
}

export function NetWorthChart({ dateRange }: NetWorthChartProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Simulate fetching/filtering data based on dateRange
    const generateData = () => {
      const today = new Date();
      const days = dateRange?.from && dateRange?.to 
        ? differenceInDays(dateRange.to, dateRange.from) + 1 
        : 30; // Default to 30 days if no range

      // If range is very large (e.g. > 90 days), group by month or week?
      // For simplicity in this demo, we'll generate daily points up to 30, or weekly if larger.
      
      const points = [];
      const isLargeRange = days > 60;
      const step = isLargeRange ? 7 : 1; 
      const count = Math.min(days, 30); // Limit points for demo visual
      
      let baseValue = 100000;

      // Create mock history back from end date
      const endDate = dateRange?.to || today;
      
      for (let i = count; i >= 0; i--) {
        const date = subDays(endDate, i * step);
        baseValue += (Math.random() - 0.4) * 2000; // Random walk
        points.push({
          date: format(date, isLargeRange ? 'MMM d' : 'd MMM'),
          value: Math.round(baseValue),
          fullDate: date.toISOString()
        });
      }
      
      setData(points);
    };

    generateData();
  }, [dateRange]);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow h-[350px] md:h-[400px] flex flex-col">
      <div className="p-6 pb-0 mb-4">
        <h3 className="font-semibold leading-none tracking-tight">{t("dashboard.charts.net_worth_title")}</h3>
        <p className="text-sm text-muted-foreground">
           {dateRange?.from ? 
             `${format(dateRange.from, 'MMM d, yyyy')} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : '...'}` 
             : t("dashboard.charts.net_worth_subtitle")}
        </p>
      </div>
      <div className="flex-1 w-full min-h-[200px] pb-4 px-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
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
              tickFormatter={(value) => `$${value / 1000}k`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Worth']}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
