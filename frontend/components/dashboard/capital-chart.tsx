"use client";

import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { Currency } from "@/types";
import type { CapitalPoint } from "@/lib/capital";
import { fmtMoney, fmtNum, MINUS } from "@/lib/plutus-format";

interface Props {
  points: CapitalPoint[];
  currency: Currency;
  height: number;
  /** градиентная линия и свечение, как на «Обзоре» */
  glow?: boolean;
  gridInset?: number;
}

const kLabel = (v: number, thousands: string) =>
  Math.abs(v) >= 1000 ? `${fmtNum(v / 1000, 1)} ${thousands}` : fmtNum(v, 0);

export function CapitalChart({ points, currency, height, glow = false, gridInset = 52 }: Props) {
  const { t } = useTranslation();
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const thousands = t("common.thousands_short", "тыс.");

  const view = useMemo(() => {
    const pts = points.length === 1 ? [points[0], points[0]] : points;
    const n = pts.length;
    const values = pts.map((p) => p.value);
    const hi0 = Math.max(...values, 1);
    const lo0 = Math.min(...values);
    const pad = (hi0 - lo0) * 0.08 || Math.max(Math.abs(hi0) * 0.05, 1000);
    const hi = hi0 + pad;
    const lo = lo0 - pad;
    const yp = (v: number) => ((hi - v) / (hi - lo)) * 100;
    const xp = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * 100);
    const line = pts.map((p, i) => `${xp(i).toFixed(2)},${yp(p.value).toFixed(2)}`).join(" ");
    const grid = [0, 1, 2, 3, 4].map((k) => ({
      top: k * 25,
      label: kLabel(hi - ((hi - lo) * k) / 4, thousands),
    }));
    const step = n > 8 ? Math.max(1, Math.round(n / 6)) : 1;
    const xl: { left: number; label: string }[] = [];
    for (let i = 0; i < n; i += step) xl.push({ left: xp(i), label: format(pts[i].date, "dd.MM") });
    if ((n - 1) % step > 1 || (step === 1 && xl.length < n)) {
      xl.push({ left: 100, label: format(pts[n - 1].date, "dd.MM") });
    }
    return { pts, n, line, grid, xl, xp, yp };
  }, [points, thousands]);

  if (!view.n) return null;
  const active = hover !== null;
  const hv = Math.min(hover ?? view.n - 1, view.n - 1);
  const cur = view.pts[hv];
  const prev = hv > 0 ? view.pts[hv - 1].value : view.pts[0].value;
  const delta = cur.value - prev;
  const hx = view.xp(hv);
  const hy = view.yp(cur.value);
  const tipSide = hx > 60 ? { right: `calc(${(100 - hx).toFixed(1)}% + 14px)` } : { left: `calc(${hx.toFixed(1)}% + 14px)` };

  return (
    <div className="relative mb-7 mt-5" style={{ height, marginLeft: gridInset }} onMouseLeave={() => setHover(null)}>
      {view.grid.map((g, i) => (
        <div key={i} className="absolute left-0 right-0 border-t border-dashed border-[#20231E]" style={{ top: `${g.top}%` }}>
          <span
            className="absolute -top-[9px] text-right text-[11.5px] text-[#8D9388]"
            style={{ left: -gridInset, width: gridInset - 8 }}
          >
            {g.label}
          </span>
        </div>
      ))}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {glow && (
          <defs>
            <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6EE7A0" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#6EE7A0" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6EE7A0" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`stroke${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="55%" stopColor="#6EE7A0" />
              <stop offset="100%" stopColor="#C6F24E" />
            </linearGradient>
          </defs>
        )}
        <polygon
          points={`0,100 ${view.line} 100,100`}
          fill={glow ? `url(#fill${uid})` : "rgba(110,231,160,0.14)"}
        />
        <polyline
          points={view.line}
          fill="none"
          stroke={glow ? `url(#stroke${uid})` : "#6EE7A0"}
          strokeWidth={glow ? 3 : 2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={glow ? { filter: "drop-shadow(0 0 6px rgba(110,231,160,0.45))" } : undefined}
        />
      </svg>
      {active && (
        <>
          <div className="pointer-events-none absolute bottom-0 top-0 border-l border-dashed border-[#3F7A5C]" style={{ left: `${hx}%` }} />
          <div
            className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-[#151714] bg-[#6EE7A0]"
            style={{ left: `${hx}%`, top: `${hy}%`, margin: "-6px 0 0 -6px" }}
          />
          <div
            className="pointer-events-none absolute top-2 min-w-[150px] rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            style={tipSide}
          >
            <div className="text-[12.5px] text-[#8D9388]">{format(cur.date, "dd.MM.yyyy")}</div>
            <div className="mt-0.5 text-base font-bold">{fmtMoney(cur.value, currency)}</div>
            <div
              className="mt-0.5 text-[12.5px] font-semibold"
              style={{ color: delta < 0 ? "#F87171" : delta > 0 ? "#6EE7A0" : "#8D9388" }}
            >
              {delta < 0 ? MINUS : "+"}
              {fmtNum(Math.abs(delta))} {t("overview.per_day", "за день")}
            </div>
          </div>
        </>
      )}
      <div className="absolute inset-0 flex">
        {view.pts.map((p, i) => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => setHover(i)}
            aria-label={`${format(p.date, "dd.MM")}: ${fmtMoney(p.value, currency)}`}
            className="h-full flex-1 cursor-crosshair border-0 bg-transparent p-0 hover:bg-[#C6F24E]/[0.06]"
          />
        ))}
      </div>
      <div className="absolute -bottom-[22px] left-0 right-0 h-4">
        {view.xl.map((x, i) => (
          <span key={i} className="absolute -translate-x-1/2 text-[11.5px] text-[#8D9388]" style={{ left: `${x.left}%` }}>
            {x.label}
          </span>
        ))}
      </div>
    </div>
  );
}
