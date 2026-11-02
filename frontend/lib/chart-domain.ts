export function chartDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const padding = min === max ? Math.max(Math.abs(min) * 0.01, 1) : Math.max((max - min) * 0.15, 0.01);
  return [min - padding, max + padding];
}

export function accountExistsAtEndOfDay(createdAt: string | undefined, targetDate: Date): boolean {
  if (!createdAt) return true;
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return true;

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() >= createdTime;
}
