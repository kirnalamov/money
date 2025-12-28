"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { cn, formatCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";

const data = [
  { name: "Housing", value: 1200, color: "#00C853" }, // Green
  { name: "Food", value: 450, color: "#2979FF" },    // Blue
  { name: "Transport", value: 200, color: "#FFB300" }, // Amber
  { name: "Shopping", value: 300, color: "#F44336" },  // Red
  { name: "Utilities", value: 150, color: "#AB47BC" }, // Purple
];

export function ExpensesDonut() {
  const { t } = useTranslation();
  const { defaultCurrency } = useStore();
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const total = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), []);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow h-[400px] flex flex-col">
      <div className="p-6 pb-0 mb-4">
        <h3 className="font-semibold leading-none tracking-tight">{t("dashboard.charts.expenses_title")}</h3>
      </div>
      <div className="flex-1 w-full min-h-0 flex items-center justify-center px-4 pb-4">
        <div ref={containerRef} className="relative w-full h-full max-w-[300px] flex-1" style={{ minHeight: 200, minWidth: 200 }}>
             {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                 <span className="text-3xl font-bold">{formatCurrency(total, defaultCurrency)}</span>
                 <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
                <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                >
                {data.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="transition-all duration-300 outline-none"
                        style={{
                            filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                            transform: activeIndex === index ? 'scale(1.02)' : 'scale(1)',
                            transformOrigin: 'center',
                            opacity: activeIndex !== undefined && activeIndex !== index ? 0.6 : 1
                        }}
                    />
                ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                        return (
                            <div className="rounded-lg border bg-popover p-2 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="h-2 w-2 rounded-full" 
                                    style={{ backgroundColor: payload[0].payload.color }}
                                />
                                <span className="text-sm font-medium">{payload[0].name}</span>
                            </div>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-lg font-bold">
                                    {formatCurrency(Number(payload[0].value), defaultCurrency)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ({Math.round((Number(payload[0].value) / total) * 100)}%)
                                </span>
                            </div>
                            </div>
                        )
                        }
                        return null
                    }}
                />
            </PieChart>
            </ResponsiveContainer>
        </div>
        
        {/* Custom Legend */}
        <div className="flex flex-col gap-2 ml-4 min-w-[140px] overflow-y-auto max-h-full pr-2 custom-scrollbar">
            {data.map((item, index) => {
                const percentage = Math.round((item.value / total) * 100);
                const isHovered = activeIndex === index;
                const isDimmed = activeIndex !== undefined && activeIndex !== index;

                return (
                    <div 
                        key={item.name}
                        className={cn(
                            "flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer border border-transparent",
                            isHovered ? "bg-accent border-border" : "hover:bg-accent/50",
                            isDimmed && "opacity-50"
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(undefined)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                            {percentage}%
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
}
