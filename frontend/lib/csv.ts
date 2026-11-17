import type { Account, Transaction } from "@/types";

const HEADER = ["date", "type", "category", "description", "account", "amount", "currency"];

const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Все операции в CSV (UTF-8 с BOM, чтобы Excel не ломал кириллицу) */
export function transactionsToCsv(transactions: Transaction[], accounts: Account[]): string {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const lines = transactions.map((tx) => {
    const acc = byId.get(tx.accountId);
    return [
      tx.date,
      tx.type,
      quote(tx.category),
      quote(tx.description || ""),
      quote(acc?.name || ""),
      tx.amount,
      acc?.currency || tx.currency,
    ].join(",");
  });
  return "﻿" + [HEADER.join(","), ...lines].join("\n");
}

/** Разбор CSV с кавычками (RFC 4180): поддерживает запятые и переводы строк внутри полей */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export interface ImportRow {
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  account: string;
  amount: number;
}

export interface ImportParse {
  rows: ImportRow[];
  /** строки, которые не удалось прочитать или это переводы */
  skipped: number;
}

/** Читает файл в том же формате, что отдаёт экспорт (date,type,category,description,account,amount,currency) */
export function parseTransactionsCsv(text: string): ImportParse {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0 };
  const head = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const idx = {
    date: col("date"),
    type: col("type"),
    category: col("category"),
    description: col("description"),
    account: col("account"),
    amount: col("amount"),
  };
  if (idx.date < 0 || idx.type < 0 || idx.amount < 0 || idx.account < 0) {
    return { rows: [], skipped: table.length - 1 };
  }
  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const r of table.slice(1)) {
    const type = (r[idx.type] || "").trim().toLowerCase();
    const amount = parseFloat((r[idx.amount] || "").replace(",", "."));
    const date = new Date(r[idx.date]);
    if ((type !== "income" && type !== "expense") || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
    rows.push({
      date: date.toISOString(),
      type,
      category: (idx.category >= 0 ? r[idx.category] : "").trim() || "Uncategorized",
      description: (idx.description >= 0 ? r[idx.description] : "").trim(),
      account: (r[idx.account] || "").trim(),
      amount,
    });
  }
  return { rows, skipped };
}
