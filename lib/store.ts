import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, Transaction, Currency, LimitRule, Position } from '@/types';

interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  limits: LimitRule[];
  positions: Position[];
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  addTransaction: (transaction: Transaction) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addLimit: (limit: LimitRule) => void;
  updateLimit: (id: string, limit: Partial<LimitRule>) => void;
  deleteLimit: (id: string) => void;
  addPosition: (position: Position) => void;
  updatePosition: (symbol: string, accountId: string, position: Partial<Position>) => void;
  deletePosition: (symbol: string, accountId: string) => void;
}

// Mock initial data
// Пример счетов с разными валютами для демонстрации конвертации
const initialAccounts: Account[] = [
  { id: '1', name: 'Chase Checking', type: 'bank', balance: 4500.00, currency: 'USD' },
  { id: '2', name: 'Citi Savings', type: 'savings', balance: 12000.00, currency: 'USD' },
  { id: '3', name: 'Cash Wallet', type: 'cash', balance: 350.00, currency: 'USD' },
  // Примеры счетов с другими валютами (раскомментируйте для тестирования конвертации):
  // { id: '4', name: 'Sberbank Account', type: 'bank', balance: 50000.00, currency: 'RUB' },
  // { id: '5', name: 'Deutsche Bank', type: 'bank', balance: 3000.00, currency: 'EUR' },
  // { id: '6', name: 'Barclays Savings', type: 'savings', balance: 2000.00, currency: 'GBP' },
];

const initialLimits: LimitRule[] = [
  { id: '1', category: 'dashboard.categories.groceries', period: 'monthly', amount: 600, currency: 'USD', spent: 450 },
  { id: '2', category: 'dashboard.categories.dining_out', period: 'monthly', amount: 300, currency: 'USD', spent: 280 },
  { id: '3', category: 'dashboard.categories.entertainment', period: 'monthly', amount: 200, currency: 'USD', spent: 150 },
  { id: '4', category: 'dashboard.categories.transport', period: 'monthly', amount: 250, currency: 'USD', spent: 180 },
  { id: '5', category: 'dashboard.categories.shopping', period: 'monthly', amount: 300, currency: 'USD', spent: 320 },
];

const initialPositions: Position[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, avgPrice: 150.00, currentPrice: 175.50, currency: 'USD', accountId: '1', assetClass: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 5, avgPrice: 120.00, currentPrice: 140.25, currency: 'USD', accountId: '1', assetClass: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', quantity: 0.5, avgPrice: 40000.00, currentPrice: 45000.00, currency: 'USD', accountId: '1', assetClass: 'crypto' },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      transactions: [],
      limits: initialLimits,
      positions: initialPositions,
      defaultCurrency: 'USD',
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      addAccount: (account) =>
        set((state) => ({ accounts: [...state.accounts, account] })),
      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
        })),
      deleteAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter(acc => acc.id !== id)
        })),
      addLimit: (limit) =>
        set((state) => ({ limits: [...state.limits, limit] })),
      updateLimit: (id, updates) =>
        set((state) => ({
          limits: state.limits.map(limit => limit.id === id ? { ...limit, ...updates } : limit)
        })),
      deleteLimit: (id) =>
        set((state) => ({
          limits: state.limits.filter(limit => limit.id !== id)
        })),
      addPosition: (position) =>
        set((state) => {
          // Check if position already exists for this symbol and account
          const existingIndex = state.positions.findIndex(
            p => p.symbol === position.symbol && p.accountId === position.accountId
          );
          if (existingIndex >= 0) {
            // Update existing position
            return {
              positions: state.positions.map((p, idx) => 
                idx === existingIndex ? { ...p, ...position } : p
              )
            };
          }
          return { positions: [...state.positions, position] };
        }),
      updatePosition: (symbol, accountId, updates) =>
        set((state) => ({
          positions: state.positions.map(p => 
            p.symbol === symbol && p.accountId === accountId 
              ? { ...p, ...updates } 
              : p
          )
        })),
      deletePosition: (symbol, accountId) =>
        set((state) => ({
          positions: state.positions.filter(
            p => !(p.symbol === symbol && p.accountId === accountId)
          )
        })),
      addTransaction: (transaction) =>
        set((state) => {
          const newAccounts = [...state.accounts];
          
          if (transaction.type === 'expense') {
             const accIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
             if (accIndex >= 0) {
               newAccounts[accIndex].balance -= transaction.amount;
             }
          } else if (transaction.type === 'income') {
             const accIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
             if (accIndex >= 0) {
               newAccounts[accIndex].balance += transaction.amount;
             }
          } else if (transaction.type === 'transfer' && transaction.toAccountId) {
             const fromIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
             const toIndex = newAccounts.findIndex(a => a.id === transaction.toAccountId);
             
             if (fromIndex >= 0 && toIndex >= 0) {
               newAccounts[fromIndex].balance -= transaction.amount;
               newAccounts[toIndex].balance += transaction.amount;
             }
          }

          return {
            transactions: [transaction, ...state.transactions],
            accounts: newAccounts,
          };
        }),
    }),
    {
      name: 'plutus-storage',
    }
  )
);
