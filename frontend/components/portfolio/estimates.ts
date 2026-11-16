import { Position } from "@/types";

// Цвета классов активов из макета «Портфель».
export const CLASS_COLORS: Record<string, string> = {
    cash: "#38BDF8",
    etf: "#C6F24E",
    crypto: "#C4B5FD",
    stock: "#F9A8D4",
    bond: "#7DD3FC",
};

const LOGO_COLORS = ["#4ADE80", "#7DD3FC", "#C4B5FD", "#F87171", "#FBBF24", "#F9A8D4", "#38BDF8", "#C6F24E"];

// Стабильный цвет плитки-логотипа по тикеру.
export function logoColor(symbol: string) {
    let h = 0;
    for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return LOGO_COLORS[h % LOGO_COLORS.length];
}

// Целые проценты, в сумме дающие 100: остаток раздаётся по наибольшей дробной части.
export function sharePercents(values: number[]) {
    const total = values.reduce((a, b) => a + b, 0);
    if (total <= 0) return values.map(() => 0);
    const raw = values.map(v => (v / total) * 100);
    const floors = raw.map(Math.floor);
    let rest = 100 - floors.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - floors[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
        if (rest > 0) { floors[i] += 1; rest -= 1; }
    });
    return floors;
}

// shortcut: доходности выплат захардкожены по классу актива (этап «только дизайн»);
// months — индексы месяцев выплат относительно следующего месяца (0..11).
export const YIELD_BY_CLASS: Record<string, { rate: number; months: number[]; kind: "div" | "cpn" }> = {
    stock: { rate: 0.04, months: [7], kind: "div" },
    etf: { rate: 0.013, months: [0, 3, 6, 9], kind: "div" },
    bond: { rate: 0.08, months: [2, 8], kind: "cpn" },
};

export interface PaymentEvent {
    position: Position;
    monthIndex: number;
    kind: "div" | "cpn";
    amount: number; // в валюте по умолчанию
}

// Оценка выплат по позициям: value — стоимость позиции в валюте по умолчанию.
export function estimatePayments(positions: { position: Position; value: number }[]): PaymentEvent[] {
    const events: PaymentEvent[] = [];
    for (const { position, value } of positions) {
        const cfg = YIELD_BY_CLASS[position.assetClass || "stock"];
        if (!cfg) continue;
        const perPayment = (value * cfg.rate) / cfg.months.length;
        if (perPayment <= 0) continue;
        for (const monthIndex of cfg.months) {
            events.push({ position, monthIndex, kind: cfg.kind, amount: perPayment });
        }
    }
    return events;
}
