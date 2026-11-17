import { Currency } from "@/types";
import { getCurrencySymbol } from "@/lib/utils";

const NBSP = " ";
export const MINUS = "−";

/** 1234.5 -> "1 234,50" (narrow no-break-space groups, comma decimals) */
export function fmtNum(n: number, decimals = 2): string {
  const parts = Math.abs(n).toFixed(decimals).split(".");
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return decimals > 0 ? `${int},${parts[1]}` : int;
}

/** "1 234,50 $" — symbol after the number, as in the Plutus design */
export function fmtMoney(n: number, currency?: Currency | string, decimals = 2): string {
  return `${fmtNum(n, decimals)}${NBSP}${getCurrencySymbol(currency)}`;
}

/** "+1 234,50 $" / "−1 234,50 $" */
export function signedMoney(n: number, currency?: Currency | string, decimals = 2): string {
  return `${n < 0 ? MINUS : "+"}${fmtMoney(n, currency, decimals)}`;
}

/** "+14,12%" / "−3,20%" */
export function signedPct(n: number, decimals = 2): string {
  return `${n < 0 ? MINUS : "+"}${Math.abs(n).toFixed(decimals).replace(".", ",")}%`;
}

/** Short axis label: "300 тыс." / "1,5 млн" */
export function shortMoney(v: number, lang: string = "ru"): string {
  if (v === 0) return "0";
  const mln = lang.startsWith("ru") ? "млн" : "M";
  const ths = lang.startsWith("ru") ? "тыс." : "K";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " " + mln;
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1).replace(".", ",").replace(",0", "") + " " + ths;
  return fmtNum(v, 0);
}

/** Russian plural helper */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

/** Donut segment geometry for the design's SVG rings (r=52, stroke 16) */
export function donutSegments<T extends { value: number }>(
  items: T[],
  total: number
): (T & { dash: string; offset: number })[] {
  const C = 2 * Math.PI * 52; // ≈ 326.7
  const GAP = 3;
  let acc = 0;
  return items.map((it) => {
    const len = total > 0 ? (it.value / total) * C : 0;
    const seg = {
      ...it,
      dash: `${Math.max(len - GAP, 0).toFixed(2)} ${(C - Math.max(len - GAP, 0)).toFixed(2)}`,
      offset: -acc,
    };
    acc += len;
    return seg;
  });
}

export const CATEGORY_PALETTE = [
  "#A3E635",
  "#38BDF8",
  "#C4B5FD",
  "#FBBF24",
  "#F9A8D4",
  "#5EEAD4",
  "#F87171",
  "#7DD3FC",
  "#6EE7A0",
  "#FDBA74",
];

export function hashColor(key: string, palette: string[] = CATEGORY_PALETTE): string {
  let h = 0;
  key = key || "";
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/** Подбор эмодзи категории: сначала поле icon, затем по ключевым словам названия */
const EMOJI_RULES: [RegExp, string][] = [
  [/зарплат|salary|оклад|wage/i, "💰"],
  [/подработ|фриланс|side|freelance/i, "💼"],
  [/инвест|дивиден|invest|dividend/i, "📈"],
  [/продукт|еда|grocer|food|супермаркет/i, "🛒"],
  [/кафе|ресторан|бар|coffee|cafe|restaurant/i, "☕"],
  [/такси|каршеринг|транспорт|метро|бензин|taxi|transport|fuel|gas/i, "🚕"],
  [/жиль|аренда|квартир|ипотек|дом|rent|housing|home|mortgage/i, "🏠"],
  [/коммунал|свет|вода|элект|utilit/i, "💡"],
  [/покупк|одежд|шоппинг|shopping|cloth/i, "🛍️"],
  [/электроник|техник|гаджет|electronic|tech/i, "📱"],
  [/здоров|аптек|врач|медицин|health|pharm|doctor/i, "💊"],
  [/спорт|фитнес|зал|sport|fitness|gym/i, "🏋️"],
  [/развлеч|кино|игр|entertain|movie|game/i, "🎮"],
  [/путешеств|отпуск|билет|travel|vacation|flight/i, "✈️"],
  [/образован|курс|учеб|educat|course|school/i, "📚"],
  [/связь|интернет|телефон|mobile|internet|phone/i, "📶"],
  [/подарк|gift/i, "🎁"],
  [/питомц|живот|pet/i, "🐾"],
  [/красот|салон|beauty/i, "💅"],
  [/налог|штраф|tax|fine/i, "🧾"],
  [/перевод|transfer/i, "🔁"],
];

export function categoryEmoji(name: string, icon?: string | null): string | null {
  if (icon) {
    const trimmed = icon.trim();
    // поле icon может хранить эмодзи — используем его как есть
    if (trimmed && /\p{Extended_Pictographic}/u.test(trimmed)) return trimmed;
  }
  for (const [re, e] of EMOJI_RULES) if (re.test(name || "")) return e;
  return null;
}

/** Цвет с прозрачностью: "#AABBCC" + alpha 0..1 -> "#AABBCC33" */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return hex + a;
}
