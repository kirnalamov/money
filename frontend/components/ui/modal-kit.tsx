"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

/* Строительные блоки окон ввода по макету «Окна ввода» (Dialogs). */

export function Lbl({ children, hint, htmlFor, className }: { children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-2 flex items-center justify-between gap-2 text-[13px] font-semibold text-[#C9CEC3]", className)}>
      <span>{children}</span>
      {hint ? <small className="text-xs font-medium text-[#8D9388]">{hint}</small> : null}
    </label>
  );
}

/** Поле с единым фоном/фокусом. Содержимое — input/select + необязательные префикс и суффикс. */
export function Fld({
  big,
  prefix,
  suffix,
  className,
  children,
}: {
  big?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] focus-within:border-[#C6F24E] focus-within:ring-[3px] focus-within:ring-[#C6F24E]/15",
        big ? "h-[60px] px-4" : "h-[46px] px-3.5",
        className
      )}
    >
      {prefix}
      {children}
      {suffix}
    </div>
  );
}

export const fldInput = "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#F1F3EE] outline-none placeholder:text-[#6F766A]";
export const fldInputBig = "min-w-0 flex-1 border-0 bg-transparent p-0 text-[26px] font-bold text-[#F1F3EE] outline-none placeholder:text-[#4A5043]";

export function Suffix({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return <span className={cn("shrink-0 font-bold text-[#8D9388]", big ? "text-[22px]" : "text-sm font-semibold")}>{children}</span>;
}

export function Chip({
  active,
  dashed,
  small,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; dashed?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "inline-flex items-center gap-[7px] rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]",
        small ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-[13px]",
        active
          ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#F1F3EE]"
          : "border-[#2A2E27] bg-[#1B1E1A] text-[#C9CEC3] hover:border-[#4A5043]",
        dashed && "border-dashed text-[#8D9388]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Seg({
  active,
  tone,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      style={active && tone ? { borderColor: tone, color: tone, background: `${tone}1A` } : undefined}
      className={cn(
        "h-[42px] flex-1 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]",
        active ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#F1F3EE]" : "border-[#2A2E27] bg-[#1B1E1A] text-[#A2A89C] hover:border-[#4A5043]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function CurBtn({ active, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "h-[38px] min-w-12 rounded-[10px] border px-2.5 text-[17px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]",
        active ? "border-[#C6F24E] bg-[#C6F24E]/10 text-[#C6F24E]" : "border-[#2A2E27] bg-[#1B1E1A] text-[#C9CEC3] hover:border-[#4A5043]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Pick({ active, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[#F1F3EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]",
        active ? "border-[#C6F24E] bg-[#C6F24E]/[0.06]" : "border-[#232721] bg-[#121411] hover:border-[#4A5043] hover:bg-[#171916]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={cn("rounded-[14px] border border-[#2A2E27] bg-[#121411] px-4 py-3.5", className)}>{children}</div>;
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ background: color }} />;
}

export function Mono({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold text-[#10170A]" style={{ background: color }}>
      {children}
    </span>
  );
}

export function SwitchRow({
  title,
  sub,
  checked,
  onChange,
  id,
  boxed = true,
}: {
  title: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  boxed?: boolean;
}) {
  const body = (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3">
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[13.5px] font-semibold text-[#F1F3EE]">{title}</span>
        {sub ? <span className="text-[12.5px] text-[#8D9388]">{sub}</span> : null}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
  return boxed ? <Card className="px-4 py-3">{body}</Card> : body;
}

export function Hint({ children, tone, className, id }: { children: React.ReactNode; tone?: "red" | "muted"; className?: string; id?: string }) {
  return <div id={id} className={cn("mt-2 text-[12.5px]", tone === "red" ? "text-[#F87171]" : "text-[#8D9388]", className)}>{children}</div>;
}

export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#F87171]/30 bg-[#F87171]/[0.08] px-3.5 py-3 text-[13px] text-[#FCA5A5]">
      {children}
    </div>
  );
}

export function PrimaryBtn({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "h-[46px] rounded-xl bg-[#C6F24E] px-[22px] text-sm font-bold text-[#10170A] transition-[filter,opacity] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151714] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export const GhostBtn = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function GhostBtn({ className, children, ...props }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      {...props}
      className={cn(
        "h-[46px] rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-5 text-sm font-semibold text-[#F1F3EE] transition-colors hover:bg-[#1B1E1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]",
        className
      )}
    >
      {children}
    </button>
  );
});

export function LinkBtn({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={cn("text-[12.5px] font-semibold text-[#C6F24E] hover:text-[#E2FF92] focus-visible:outline-none focus-visible:underline", className)}>
      {children}
    </button>
  );
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-0.5 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">{children}</div>;
}

export function DoneScreen({
  title,
  lines,
  actions,
}: {
  title: string;
  lines?: string[];
  actions: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 pb-1 pt-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E] text-[#10170A]">
        <Check className="h-7 w-7" strokeWidth={2.6} aria-hidden="true" />
      </span>
      <div className="text-lg font-bold">{title}</div>
      {lines && lines.length > 0 && (
        <div className="flex flex-col gap-1 text-[13.5px] text-[#A2A89C]">{lines.map((l, i) => <span key={i}>{l}</span>)}</div>
      )}
      <div className="mt-2 flex gap-2.5">{actions}</div>
    </div>
  );
}

export const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", RUB: "₽" };

/** Вычисляет выражение вида «1200+350−50». Возвращает NaN, если выражение некорректно. */
export function evalAmount(raw: string): number {
  const s = raw.replace(/\s+/g, "").replace(/,/g, ".").replace(/[−–—]/g, "-");
  if (!s || !/^[0-9.+\-]+$/.test(s)) return NaN;
  const parts = s.match(/[+-]?[0-9]*\.?[0-9]+|[+-]/g);
  if (!parts || parts.join("") !== s) return NaN;
  let total = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) return NaN;
    total += n;
  }
  return Math.round(total * 1e8) / 1e8;
}

export const TONE = { expense: "#F87171", income: "#6EE7A0", transfer: "#F1F3EE", trade: "#C6F24E" } as const;

/** dd.MM.yyyy → Date (локальная полночь) либо null. */
export function parseRuDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getFullYear() !== Number(m[3]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
  return d;
}
