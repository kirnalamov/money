export type Currency = 'USD' | 'EUR' | 'GBP' | 'RUB';

export type AccountType = 'bank' | 'brokerage' | 'cash' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  provider?: string; // e.g., 'Chase', 'Binance'
  lastSync?: string; // ISO date
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'trade';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  date: string; // ISO date
  description?: string;
  merchant?: string;
  tags?: string[];
  status: 'pending' | 'completed';
  toAccountId?: string; // For transfers
}

export interface Position {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: Currency;
  accountId: string;
  assetClass?: 'stock' | 'crypto' | 'etf' | 'bond' | 'cash';
}

export interface LimitRule {
  id: string;
  category: string;
  period: 'daily' | 'weekly' | 'monthly';
  amount: number;
  currency: Currency;
  spent: number; // Calculated field
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  deadline?: string; // ISO date
  linkedAccountId?: string;
}
