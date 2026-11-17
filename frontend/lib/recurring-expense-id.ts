export async function recurringExpenseId(name: string, category: string, amount: number, currency: string): Promise<string> {
  const value = new TextEncoder().encode(JSON.stringify([name, category, amount, currency]));
  const digest = await crypto.subtle.digest('SHA-256', value);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
