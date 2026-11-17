"use client";

import { useState, useMemo } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import {
  fmtMoney,
  fmtNum,
  signedMoney,
  signedPct,
  shortMoney,
  plural,
  donutSegments,
  MINUS,
} from "@/lib/plutus-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Position, Currency } from "@/types";
import { cn } from "@/lib/utils";
import { addMonths, format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { SecurityLogo } from "@/components/portfolio/security-logo";
import { PositionDialog } from "@/components/portfolio/position-dialog";
import { PayoutForecastCard } from "@/components/portfolio/payout-forecast-card";
import { ReceivedPayoutsCard } from "@/components/portfolio/received-payouts-card";
import {
  usePayouts,
  useLivePrices,
  useTaxSettings,
} from "@/components/portfolio/use-payouts";
import { buildForecast } from "@/lib/payouts";
import { RefreshCw } from "lucide-react";

type AssetClass = NonNullable<Position["assetClass"]>;

const CLASS_ORDER: AssetClass[] = ["stock", "bond", "etf", "crypto", "cash"];

const CLASS_COLORS: Record<string, string> = {
  cash: "#38BDF8",
  etf: "#C6F24E",
  crypto: "#C4B5FD",
  stock: "#F9A8D4",
  bond: "#7DD3FC",
};

const LOGO_PALETTE = [
  "#4ADE80",
  "#7DD3FC",
  "#C4B5FD",
  "#F87171",
  "#FBBF24",
  "#F9A8D4",
  "#5EEAD4",
  "#A3E635",
];

// Rough annual payout-yield assumptions per asset class (estimate, not a promise)
const YIELD: Record<string, number> = { stock: 0.04, etf: 0.015, bond: 0.1 };

function logoColor(symbol: string): string {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return LOGO_PALETTE[h % LOGO_PALETTE.length];
}

export default function PortfolioPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;
  const {
    positions: storePositions,
    accounts,
    defaultCurrency,
    addPosition,
    updatePosition,
    deletePosition,
  } = useStore();

  const {
    livePositions: positions,
    updatedAt,
    status: liveStatus,
    refresh: refreshPrices,
  } = useLivePrices(storePositions);
  const { data: payData, loading: payLoading } = usePayouts(positions);
  const [tax, setTax] = useTaxSettings();
  const [fcHover, setFcHover] = useState<number | null>(null);

  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ptab, setPtab] = useState<"all" | AssetClass>("all");

  // Forecast calculator state
  const [contrib, setContrib] = useState("500");
  const [ret, setRet] = useState("8");
  const [infl, setInfl] = useState("4");
  const [years, setYears] = useState("20");

  const brokerageAccounts = accounts.filter((acc) => acc.type === "brokerage");

  const handleOpenDialog = (position?: Position) => {
    setEditingPosition(
      position
        ? storePositions.find((x) => x.symbol === position.symbol && x.accountId === position.accountId) || position
        : null
    );
    setIsDialogOpen(true);
  };

  const handleDelete = (symbol: string, accountId: string | number) => {
    if (confirm(t("portfolio.delete_position") + "?")) {
      deletePosition(symbol, Number(accountId));
    }
  };

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name || "—";

  // ---------- Metrics ----------
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    positions.forEach((p) => {
      totalValue += convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency);
      totalCost += convertCurrency(p.quantity * p.avgPrice, p.currency, defaultCurrency);
    });
    const totalPnL = totalValue - totalCost;
    const pct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnL, pct };
  }, [positions, defaultCurrency]);

  const investedShare =
    metrics.totalValue > 0 ? Math.max(0, Math.min(100, (metrics.totalCost / metrics.totalValue) * 100)) : 100;

  // ---------- Allocation (with cash from accounts) ----------
  const allocation = useMemo(() => {
    const cash = accounts.reduce(
      (s, a) => s + convertCurrency(a.balance, a.currency, defaultCurrency),
      0
    );
    const byClass = new Map<string, number>();
    positions.forEach((p) => {
      const cls = p.assetClass || "stock";
      const v = convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency);
      if (cls === "cash") byClass.set("cash", (byClass.get("cash") || 0) + v);
      else byClass.set(cls, (byClass.get(cls) || 0) + v);
    });
    const items: { key: string; name: string; value: number; color: string }[] = [];
    const cashTotal = cash + (byClass.get("cash") || 0);
    if (cashTotal > 0)
      items.push({
        key: "cash",
        name: t("portfolio.cash", "Наличные"),
        value: cashTotal,
        color: CLASS_COLORS.cash,
      });
    (["etf", "crypto", "stock", "bond"] as const).forEach((cls) => {
      const v = byClass.get(cls) || 0;
      if (v > 0)
        items.push({
          key: cls,
          name: t(`portfolio.groups.${cls}`),
          value: v,
          color: CLASS_COLORS[cls],
        });
    });
    items.sort((a, b) => b.value - a.value);
    const total = items.reduce((s, x) => s + x.value, 0);
    return { items, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, positions, defaultCurrency, i18n.language]);

  const allocDonut = donutSegments(allocation.items, allocation.total);

  // ---------- Positions grouped by class ----------
  const groups = useMemo(() => {
    return CLASS_ORDER.filter((cls) => ptab === "all" || ptab === cls).map((cls) => {
      const items = positions.filter((p) => (p.assetClass || "stock") === cls);
      const value = items.reduce(
        (s, p) => s + convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency),
        0
      );
      const cost = items.reduce(
        (s, p) => s + convertCurrency(p.quantity * p.avgPrice, p.currency, defaultCurrency),
        0
      );
      const pl = value - cost;
      return { cls, items, value, pl, plPct: cost > 0 ? (pl / cost) * 100 : 0 };
    }).filter((g) => g.items.length > 0 || g.cls === "bond");
  }, [positions, ptab, defaultCurrency]);

  // ---------- Dividend / coupon forecast (real payout history) ----------
  const payoutForecast = useMemo(() => {
    const fc = buildForecast(positions, payData, tax, defaultCurrency, payLoading);
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = addMonths(fc.monthStart, i);
      const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
      return {
        label: format(d, "LLL", { locale: dateLocale }).replace(".", ""),
        full: cap(format(d, "LLL yyyy", { locale: dateLocale }).replace(".", "")),
      };
    });
    return { ...fc, months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, payData, tax, defaultCurrency, payLoading, i18n.language]);

  // ---------- Growth forecast ----------
  const forecast = useMemo(() => {
    const START = metrics.totalValue;
    const num = (s: string, d: number, lo: number, hi: number) => {
      const v = parseFloat(String(s).replace(",", ".").replace(/\s/g, ""));
      if (!Number.isFinite(v)) return d;
      return Math.min(hi, Math.max(lo, v));
    };
    const c = num(contrib, 0, 0, 1000000);
    const r = num(ret, 0, 0, 60) / 100;
    const inf = num(infl, 0, 0, 40) / 100;
    const n = Math.round(num(years, 1, 1, 50));

    const nominalAt = (tm: number) => {
      const m = tm * 12;
      const i = r / 12;
      if (i === 0) return START + c * m;
      const g = Math.pow(1 + i, m);
      return START * g + (c * (g - 1)) / i;
    };
    const investedAt = (tm: number) => START + c * 12 * tm;
    const realAt = (tm: number) => nominalAt(tm) / Math.pow(1 + inf, tm);

    const nom = nominalAt(n);
    const real = realAt(n);
    const inv = investedAt(n);

    const raw = Math.max(nom / 4, 1);
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    let step = pow * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pow >= raw) {
        step = k * pow;
        break;
      }
    }
    const ymax = step * Math.ceil(nom / step) || 1;

    const px = (tm: number) => (tm / n) * 100;
    const py = (v: number) => 100 - (v / ymax) * 100;
    const pts = (fn: (tm: number) => number) => {
      const out: string[] = [];
      for (let tm = 0; tm <= n; tm++) out.push(`${px(tm).toFixed(2)},${py(fn(tm)).toFixed(2)}`);
      return out.join(" ");
    };
    const nomPts = pts(nominalAt);

    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= ymax + 1e-6; v += step) {
      yTicks.push({ top: 100 - (v / ymax) * 100, label: shortMoney(v, i18n.language) });
    }
    const xTicks: { left: number; label: string }[] = [];
    for (let k = 0; k <= 4; k++) {
      const tm = Math.round((n * k) / 4);
      xTicks.push({ left: px(tm), label: String(tm) });
    }

    return {
      n,
      nom,
      real,
      inv,
      py,
      at: (tm: number) => ({
        nom: nominalAt(tm),
        real: realAt(tm),
        inv: investedAt(tm),
      }),
      yTicks,
      xTicks,
      chart: {
        nominal: nomPts,
        real: pts(realAt),
        invested: pts(investedAt),
        area: `${nomPts} 100,100 0,100`,
        nTop: py(nom),
        rTop: py(real),
        iTop: py(inv),
      },
    };
  }, [metrics.totalValue, contrib, ret, infl, years, i18n.language]);

  const yearsLabel = `${forecast.n} ${plural(
    forecast.n,
    t("portfolio.year_one", "год"),
    t("portfolio.year_few", "года"),
    t("portfolio.year_many", "лет")
  )}`;

  const posCountLabel = (k: number) =>
    k === 0
      ? t("portfolio.no_pos", "нет позиций")
      : `${k} ${plural(
          k,
          t("portfolio.pos_one", "позиция"),
          t("portfolio.pos_few", "позиции"),
          t("portfolio.pos_many", "позиций")
        )}`;

  const tabs: { key: "all" | AssetClass; label: string }[] = [
    { key: "all", label: t("portfolio.tabs.all", "Все") },
    { key: "stock", label: t("portfolio.groups.stock", "Акции") },
    { key: "bond", label: t("portfolio.groups.bond", "Облигации") },
    { key: "etf", label: t("portfolio.groups.etf", "ETF") },
    { key: "crypto", label: t("portfolio.tabs.crypto", "Крипто") },
  ];

  const fieldCls =
    "flex h-[46px] items-center rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-4 focus-within:border-[#C6F24E]";
  const inputCls =
    "min-w-0 flex-1 bg-transparent text-base font-semibold text-[#F1F3EE] outline-none border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0";

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 md:pb-6 text-[#F1F3EE]">
        {/* HEADER */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">
              {t("portfolio.page_title", "Аналитика портфеля")}
            </h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {t("portfolio.page_subtitle", "Состав, результат и прогноз роста")}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[#8D9388]">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  liveStatus === "ok"
                    ? "bg-[#6EE7A0]"
                    : liveStatus === "error"
                      ? "bg-[#F87171]"
                      : "bg-[#FBBF24]"
                )}
              />
              {liveStatus === "ok" && updatedAt
                ? `${t("portfolio.live_prices", "Живые цены")} · ${format(updatedAt, "HH:mm:ss")}`
                : liveStatus === "error"
                  ? t("portfolio.live_error", "Не удалось обновить цены — показаны сохранённые")
                  : t("portfolio.live_loading", "Загружаем актуальные цены…")}
              <button
                onClick={refreshPrices}
                aria-label={t("portfolio.refresh", "Обновить цены")}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F1F3EE]"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", liveStatus === "loading" && "animate-spin")}
                  strokeWidth={1.8}
                />
              </button>
            </div>
          </div>
          <button
            onClick={() => handleOpenDialog()}
            disabled={brokerageAccounts.length === 0}
            className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-[18px] text-sm font-semibold text-[#10170A] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t("portfolio.add_position")}
          </button>
          <PositionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} editing={editingPosition} />
        </header>

        {/* TOP ROW */}
        <div className="flex flex-wrap items-stretch gap-5">
          {/* Portfolio value */}
          <section className="flex min-w-0 flex-[1_1_440px] flex-col gap-6 rounded-[20px] border border-[#232721] bg-[#151714] p-7">
            <div>
              <div className="text-[13px] font-medium text-[#8D9388]">
                {t("portfolio.value_title", "Стоимость портфеля")}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="text-[48px] font-bold leading-[1.1] tracking-[-0.03em]">
                  {fmtMoney(metrics.totalValue, defaultCurrency)}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                    metrics.totalPnL >= 0
                      ? "bg-[#6EE7A0]/10 text-[#6EE7A0]"
                      : "bg-[#F87171]/10 text-[#F87171]"
                  )}
                >
                  <ArrowUpRight
                    className={cn("h-3.5 w-3.5", metrics.totalPnL < 0 && "rotate-90")}
                    strokeWidth={2.4}
                  />
                  {signedPct(metrics.pct)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex h-2 gap-[3px]">
                <span
                  className="rounded-[4px] bg-[#F1F3EE]"
                  style={{ flex: `${Math.max(investedShare, 1)} 1 0%` }}
                />
                <span
                  className="rounded-[4px] bg-[#6EE7A0]"
                  style={{ flex: `${Math.max(100 - investedShare, 1)} 1 0%` }}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-x-14 gap-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]">
                    <span className="h-2 w-2 rounded-full bg-[#F1F3EE]" />
                    {t("portfolio.invested", "Вложенный капитал")}
                  </div>
                  <div className="mt-1 text-[22px] font-semibold">
                    {fmtMoney(metrics.totalCost, defaultCurrency)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]">
                    <span className="h-2 w-2 rounded-full bg-[#6EE7A0]" />
                    {t("portfolio.total_pnl_label", "Общий PnL")}
                  </div>
                  <div
                    className="mt-1 text-[22px] font-semibold"
                    style={{ color: metrics.totalPnL >= 0 ? "#6EE7A0" : "#F87171" }}
                  >
                    {signedMoney(metrics.totalPnL, defaultCurrency)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Allocation */}
          <section className="min-w-0 flex-[1_1_440px] rounded-[20px] border border-[#232721] bg-[#151714] p-7">
            <h2 className="mb-5 text-xl font-semibold">
              {t("portfolio.allocation_title")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-9 gap-y-6">
              <div className="relative h-[168px] w-[168px] flex-none">
                <svg width="168" height="168" viewBox="0 0 140 140" role="img">
                  {allocation.total > 0 ? (
                    allocDonut.map((seg) => (
                      <circle
                        key={seg.key}
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={seg.dash}
                        strokeDashoffset={seg.offset}
                        transform="rotate(-90 70 70)"
                      />
                    ))
                  ) : (
                    <circle cx="70" cy="70" r="52" fill="none" stroke="#1E211C" strokeWidth="16" />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-[#8D9388]">
                    {t("portfolio.with_cash", "С наличными")}
                  </span>
                  <span className="text-[15px] font-bold">
                    {fmtMoney(allocation.total, defaultCurrency)}
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-4">
                {allocation.items.map((item) => {
                  const pct = allocation.total > 0 ? Math.round((item.value / allocation.total) * 100) : 0;
                  return (
                    <div key={item.key}>
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: item.color }} />
                        <span className="flex-1 font-medium">{item.name}</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1 rounded-sm bg-[#232721]">
                        <div
                          className="h-1 rounded-sm"
                          style={{ width: `${pct}%`, background: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {allocation.items.length === 0 && (
                  <div className="text-[13px] text-[#8D9388]">
                    {t("portfolio.no_positions")}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* POSITIONS */}
        <section className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
          <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
            <div>
              <h2 className="text-xl font-semibold">
                {t("portfolio.positions_title", "Позиции")}
              </h2>
              <p className="mt-1 text-[13.5px] text-[#8D9388]">
                {posCountLabel(positions.length)} · {fmtMoney(metrics.totalValue, defaultCurrency)}
              </p>
            </div>
            <div
              role="group"
              className="flex h-11 gap-0.5 rounded-xl border border-[#232721] bg-[#0E0F0E] p-1"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  aria-pressed={ptab === tab.key}
                  onClick={() => setPtab(tab.key)}
                  className={cn(
                    "rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors",
                    ptab === tab.key
                      ? "bg-[#2A2F27] text-[#F1F3EE]"
                      : "text-[#A2A89C] hover:text-[#F1F3EE]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[minmax(220px,2.2fr)_70px_110px_110px_130px_150px_72px] gap-4 border-t border-[#232721] px-7 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388]">
                <span>{t("portfolio.col_position", "Позиция")}</span>
                <span className="text-right">{t("portfolio.col_qty", "Кол-во")}</span>
                <span className="text-right">{t("portfolio.col_avg", "Ср. цена")}</span>
                <span className="text-right">{t("portfolio.col_price", "Тек. цена")}</span>
                <span className="text-right">{t("portfolio.col_value", "Стоимость")}</span>
                <span className="text-right">{t("portfolio.col_pnl", "Прибыль / убыток")}</span>
                <span />
              </div>

              {groups.map((g) => (
                <div key={g.cls}>
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[#1E211C] bg-[#121411] px-7 py-3">
                    <span className="flex items-baseline gap-2.5">
                      <span className="text-base font-bold">{t(`portfolio.groups.${g.cls}`)}</span>
                      <span className="text-[12.5px] text-[#8D9388]">
                        {posCountLabel(g.items.length)}
                      </span>
                    </span>
                    {g.items.length > 0 && (
                      <span className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
                        <span className="font-semibold">{fmtMoney(g.value, defaultCurrency)}</span>
                        <span className="text-[#8D9388]">
                          {metrics.totalValue > 0
                            ? Math.round((g.value / metrics.totalValue) * 100)
                            : 0}
                          % {t("portfolio.of_portfolio", "портфеля")}
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: g.pl >= 0 ? "#6EE7A0" : "#F87171" }}
                        >
                          {signedMoney(g.pl, defaultCurrency)} ({signedPct(g.plPct)})
                        </span>
                      </span>
                    )}
                  </div>

                  {g.items.length === 0 && g.cls === "bond" && (
                    <div className="mx-7 my-4 flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[14px] border border-dashed border-[#2A2E27] px-6 py-5">
                      <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-[#1E211C] text-[#8D9388]">
                        <FileText className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <span className="flex flex-[1_1_260px] flex-col gap-0.5">
                        <span className="font-semibold">
                          {t("portfolio.no_bonds_title", "Облигаций пока нет")}
                        </span>
                        <span className="text-[13px] text-[#8D9388]">
                          {t(
                            "portfolio.no_bonds_desc",
                            "Когда вы добавите облигацию, её купоны появятся в прогнозе выплат ниже."
                          )}
                        </span>
                      </span>
                      <button
                        onClick={() => handleOpenDialog()}
                        disabled={brokerageAccounts.length === 0}
                        className="h-10 rounded-xl border border-[#2A2E27] bg-transparent px-4 text-[13.5px] font-semibold text-[#C9CEC3] transition-colors hover:border-[#C6F24E] hover:text-[#C6F24E] disabled:opacity-50"
                      >
                        {t("portfolio.add_bond", "Добавить облигацию")}
                      </button>
                    </div>
                  )}

                  {g.items.map((p) => {
                    const valueNative = p.quantity * p.currentPrice;
                    const costNative = p.quantity * p.avgPrice;
                    const plNative = valueNative - costNative;
                    const plPct = costNative > 0 ? (plNative / costNative) * 100 : 0;
                    const valueUsd = convertCurrency(valueNative, p.currency, defaultCurrency);
                    const hasSub = p.currency !== defaultCurrency;
                    const lc = logoColor(p.symbol);
                    const hist = payData[p.symbol.toUpperCase()];
                    const yearAgo = new Date();
                    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    const ttm = hist
                      ? hist
                          .filter((x) => !x.isFuture && new Date(x.date) >= yearAgo)
                          .reduce((acc, x) => acc + x.value, 0)
                      : 0;
                    const realYield = p.currentPrice > 0 && ttm > 0 ? ttm / p.currentPrice : 0;
                    const yieldPct = realYield || YIELD[(p.assetClass || "stock") as string];
                    const tag =
                      yieldPct && (p.assetClass === "bond"
                        ? `${t("portfolio.coupon", "Купон")} ≈ ${(yieldPct * 100).toFixed(0)}% ${t("portfolio.per_year", "в год")}`
                        : `${t("portfolio.div", "Див.")} ≈ ${(yieldPct * 100).toFixed(yieldPct * 100 % 1 ? 1 : 0).replace(".", ",")}% ${t("portfolio.per_year", "в год")}`);
                    return (
                      <div
                        key={`${p.symbol}-${p.accountId}`}
                        className="grid grid-cols-[minmax(220px,2.2fr)_70px_110px_110px_130px_150px_72px] items-center gap-4 border-t border-[#1E211C] px-7 py-3.5 transition-colors hover:bg-[#1A1D19]"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <SecurityLogo
                            key={p.symbol}
                            symbol={p.symbol}
                            hint={
                              p.assetClass === "crypto"
                                ? "crypto"
                                : p.currency === "RUB"
                                  ? "moex"
                                  : "global"
                            }
                            size={42}
                            radius={12}
                            color={lc}
                          />
                          <span className="flex min-w-0 flex-col items-start gap-0.5">
                            <span className="text-[14.5px] font-semibold">{p.symbol}</span>
                            <span className="max-w-full truncate text-[12.5px] text-[#8D9388]">
                              {p.name} · {accountName(p.accountId)}
                            </span>
                            {tag && (
                              <span className="mt-1 rounded-full bg-[#C6F24E]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#C6F24E]">
                                {tag}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-right font-medium">
                          {fmtNum(p.quantity, p.quantity % 1 ? 2 : 0)}
                        </span>
                        <span className="text-right text-[#C9CEC3]">
                          {fmtMoney(p.avgPrice, p.currency)}
                        </span>
                        <span className="text-right font-medium">
                          {fmtMoney(p.currentPrice, p.currency)}
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="text-[14.5px] font-bold">
                            {fmtMoney(valueUsd, defaultCurrency)}
                          </span>
                          {hasSub && (
                            <span className="text-xs text-[#8D9388]">
                              {fmtMoney(valueNative, p.currency)}
                            </span>
                          )}
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span
                            className="font-semibold"
                            style={{ color: plNative >= 0 ? "#6EE7A0" : "#F87171" }}
                          >
                            {signedMoney(plNative, p.currency)}
                          </span>
                          <span
                            className="text-[12.5px] font-semibold"
                            style={{ color: plNative >= 0 ? "#6EE7A0" : "#F87171" }}
                          >
                            {signedPct(plPct)}
                          </span>
                        </span>
                        <span className="flex justify-end gap-1">
                          <button
                            aria-label={`${t("common.edit", "Изменить")} ${p.symbol}`}
                            onClick={() => handleOpenDialog(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F1F3EE]"
                          >
                            <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} />
                          </button>
                          <button
                            aria-label={`${t("common.delete", "Удалить")} ${p.symbol}`}
                            onClick={() => handleDelete(p.symbol, p.accountId)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F87171]"
                          >
                            <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INCOME FORECAST */}
        <PayoutForecastCard
          months={payoutForecast.months}
          byMonth={payoutForecast.byMonth}
          events={payoutForecast.events}
          totalValue={metrics.totalValue}
          currency={defaultCurrency}
          taxPct={tax.taxPct}
          loading={payLoading}
        />

        {/* RECEIVED PAYOUTS */}
        <ReceivedPayoutsCard
          positions={positions}
          data={payData}
          loading={payLoading}
          currency={defaultCurrency}
          tax={tax}
          onTaxChange={setTax}
          totalValue={metrics.totalValue}
          totalCost={metrics.totalCost}
        />

        {/* GROWTH FORECAST */}
        <section className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
          <div className="flex items-start gap-3.5 border-b border-[#232721] px-7 py-6">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
              <TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {t("portfolio.forecast_title", "Прогноз инвестиций")}
              </h2>
              <p className="mt-1 text-[13.5px] text-[#8D9388]">
                {t(
                  "portfolio.forecast_desc",
                  "Оценка роста текущего портфеля при регулярных пополнениях. Это расчёт, а не гарантия доходности."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-8 p-7">
            {/* Inputs */}
            <div className="flex min-w-[220px] flex-[0_1_260px] flex-col gap-[18px]">
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("portfolio.monthly_contrib", "Ежемесячный взнос")}
                <span className={fieldCls}>
                  <input
                    value={contrib}
                    onChange={(e) => setContrib(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">$</span>
                </span>
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("portfolio.expected_return", "Ожидаемая доходность в год")}
                <span className={fieldCls}>
                  <input
                    value={ret}
                    onChange={(e) => setRet(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">%</span>
                </span>
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("portfolio.inflation", "Инфляция в год")}
                <span className={fieldCls}>
                  <input
                    value={infl}
                    onChange={(e) => setInfl(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">%</span>
                </span>
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#C9CEC3]">
                {t("portfolio.horizon", "Срок")}
                <span className={fieldCls}>
                  <input
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className={inputCls}
                  />
                  <span className="font-medium text-[#8D9388]">
                    {t("portfolio.year_many", "лет")}
                  </span>
                </span>
              </label>
              <p className="text-[12.5px] text-[#8D9388]">
                {t("portfolio.forecast_note_1", "Расчёт начинается с текущей стоимости портфеля")}{" "}
                {fmtMoney(metrics.totalValue, defaultCurrency)}{" "}
                {t("portfolio.forecast_note_2", "и месячной капитализации.")}
              </p>
            </div>

            {/* Outputs */}
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
              <div className="flex flex-wrap gap-3">
                <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]">
                    <span className="h-[3px] w-2.5 rounded-sm bg-[#C6F24E]" />
                    {t("portfolio.nominal", "Номинальная стоимость")}
                  </div>
                  <div className="mt-1.5 text-[21px] font-bold">
                    {fmtMoney(forecast.nom, defaultCurrency)}
                  </div>
                </div>
                <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]">
                    <span className="h-[3px] w-2.5 rounded-sm bg-[#FBBF24]" />
                    {t("portfolio.real", "С учётом инфляции")}
                  </div>
                  <div className="mt-1.5 text-[21px] font-bold">
                    {fmtMoney(forecast.real, defaultCurrency)}
                  </div>
                </div>
                <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]">
                    <span className="h-[3px] w-2.5 rounded-sm bg-[#8D9388]" />
                    {t("portfolio.total_invested", "Всего вложено")}
                  </div>
                  <div className="mt-1.5 text-[21px] font-bold">
                    {fmtMoney(forecast.inv, defaultCurrency)}
                  </div>
                </div>
                <div className="flex-[1_1_150px] rounded-[14px] border border-[#232721] bg-[#121411] p-4">
                  <div className="text-[12.5px] text-[#8D9388]">
                    {t("portfolio.inflation_impact", "Влияние инфляции")}
                  </div>
                  <div className="mt-1.5 text-[21px] font-bold text-[#F87171]">
                    {MINUS}
                    {fmtMoney(forecast.nom - forecast.real, defaultCurrency)}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3.5 text-[13px] text-[#8D9388]">
                  {t("portfolio.growth_over", "Рост портфеля за")} {yearsLabel}
                </div>
                <div
                  className="relative ml-[60px] h-[300px]"
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const f = (e.clientX - r.left) / r.width;
                    setFcHover(Math.round(Math.min(1, Math.max(0, f)) * forecast.n));
                  }}
                  onMouseLeave={() => setFcHover(null)}
                >
                  {forecast.yTicks.map((tk, i) => (
                    <div key={i}>
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-[#232721]"
                        style={{ top: `${tk.top}%` }}
                      />
                      <div
                        className="absolute -left-[60px] w-[52px] -translate-y-1/2 text-right text-xs text-[#8D9388]"
                        style={{ top: `${tk.top}%` }}
                      >
                        {tk.label}
                      </div>
                    </div>
                  ))}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-0 h-full w-full overflow-visible"
                  >
                    <polygon points={forecast.chart.area} fill="rgba(198,242,78,0.07)" stroke="none" />
                    <polyline
                      points={forecast.chart.invested}
                      fill="none"
                      stroke="#8D9388"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={forecast.chart.real}
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={forecast.chart.nominal}
                      fill="none"
                      stroke="#C6F24E"
                      strokeWidth={3}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {fcHover !== null &&
                    (() => {
                      const v = forecast.at(fcHover);
                      const x = (fcHover / forecast.n) * 100;
                      const yearWord = plural(
                        fcHover,
                        t("portfolio.year_one", "год"),
                        t("portfolio.year_few", "года"),
                        t("portfolio.year_many", "лет")
                      );
                      return (
                        <>
                          <div
                            className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#F1F3EE]/25"
                            style={{ left: `${x}%` }}
                          />
                          {[
                            { val: v.nom, c: "#C6F24E" },
                            { val: v.real, c: "#FBBF24" },
                            { val: v.inv, c: "#8D9388" },
                          ].map((d) => (
                            <span
                              key={d.c}
                              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_#151714]"
                              style={{ left: `${x}%`, top: `${forecast.py(d.val)}%`, background: d.c }}
                            />
                          ))}
                          <div
                            className="pointer-events-none absolute top-1 z-10 w-64 -translate-x-1/2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                            style={{ left: `${Math.min(80, Math.max(20, x))}%` }}
                          >
                            <div className="text-[13px] font-semibold">
                              {fcHover === 0
                                ? t("portfolio.now", "Сейчас")
                                : `${t("portfolio.through", "Через")} ${fcHover} ${yearWord}`}
                            </div>
                            <div className="mt-2 flex flex-col gap-1.5 text-[13px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-[#8D9388]">
                                  <span className="h-[3px] w-2.5 rounded-sm bg-[#C6F24E]" />
                                  {t("portfolio.nominal", "Номинальная стоимость")}
                                </span>
                                <b className="font-semibold">{fmtMoney(v.nom, defaultCurrency)}</b>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-[#8D9388]">
                                  <span className="h-[3px] w-2.5 rounded-sm bg-[#FBBF24]" />
                                  {t("portfolio.real", "С учётом инфляции")}
                                </span>
                                <b className="font-semibold">{fmtMoney(v.real, defaultCurrency)}</b>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-[#8D9388]">
                                  <span className="h-[3px] w-2.5 rounded-sm bg-[#8D9388]" />
                                  {t("portfolio.total_invested", "Всего вложено")}
                                </span>
                                <b className="font-semibold">{fmtMoney(v.inv, defaultCurrency)}</b>
                              </div>
                            </div>
                            <div className="mt-2.5 flex flex-col gap-1 border-t border-[#232721] pt-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-[#8D9388]">
                                  {t("portfolio.growth_income", "Доход от роста")}
                                </span>
                                <span className="font-semibold text-[#6EE7A0]">
                                  +{fmtMoney(Math.max(0, v.nom - v.inv), defaultCurrency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#8D9388]">
                                  {t("portfolio.inflation_impact", "Влияние инфляции")}
                                </span>
                                <span className="font-semibold text-[#F87171]">
                                  {MINUS}
                                  {fmtMoney(Math.max(0, v.nom - v.real), defaultCurrency)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  <span
                    className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6F24E] shadow-[0_0_0_3px_#151714]"
                    style={{ top: `${forecast.chart.nTop}%` }}
                  />
                  <span
                    className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FBBF24] shadow-[0_0_0_3px_#151714]"
                    style={{ top: `${forecast.chart.rTop}%` }}
                  />
                  <span
                    className="absolute left-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8D9388] shadow-[0_0_0_3px_#151714]"
                    style={{ top: `${forecast.chart.iTop}%` }}
                  />
                </div>
                <div className="relative ml-[60px] mt-2.5 h-7">
                  {forecast.xTicks.map((xt, i) => (
                    <span
                      key={i}
                      className="absolute top-0 -translate-x-1/2 text-xs text-[#8D9388]"
                      style={{ left: `${xt.left}%` }}
                    >
                      {xt.label}
                    </span>
                  ))}
                </div>
                <div className="ml-[60px] mt-0.5 text-center text-xs text-[#8D9388]">
                  {t("portfolio.years_axis", "годы")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
