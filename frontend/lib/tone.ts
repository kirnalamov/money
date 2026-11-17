/**
 * «Умный» цвет изменения: зелёный — заметный рост, красный — заметное падение,
 * жёлтый — изменение в пределах обычного «шума» за выбранный срок.
 * Допуск растёт с длиной периода: за неделю ≈ ±0,4%, за месяц ≈ ±0,8%, за год ≈ ±2,9%.
 */
export type Tone = "up" | "flat" | "down";

export const TONE_COLOR: Record<Tone, string> = { up: "#6EE7A0", flat: "#FBBF24", down: "#F87171" };

export function flatBand(days: number): number {
  return Math.max(0.3, 0.15 * Math.sqrt(Math.max(days, 1)));
}

export function changeTone(pct: number, days: number): Tone {
  if (!Number.isFinite(pct)) return "flat";
  const band = flatBand(days);
  if (pct > band) return "up";
  if (pct < -band) return "down";
  return "flat";
}

/** Тон по первой и последней точке ряда. */
export function seriesTone(first: number, last: number, days: number): Tone {
  if (!Number.isFinite(first) || first === 0) return "flat";
  return changeTone(((last - first) / Math.abs(first)) * 100, days);
}
