import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, Transaction, Currency, LimitRule, Position, Goal, RecurringExpense } from '@/types';

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
  goals: Goal[];
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  recurringExpenses: RecurringExpense[];
  addRecurringExpense: (expense: RecurringExpense) => void;
  updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => void;
  deleteRecurringExpense: (id: string) => void;
  payRecurringExpense: (id: string, accountId: string, date?: string) => void;
  toggleRecurringExpense: (id: string) => void;
}

// Mock initial data
const initialRecurringExpenses: RecurringExpense[] = [
  { id: '1', name: 'Rent', amount: 1200, currency: 'USD', category: 'dashboard.categories.housing', dueDay: 1, lastPaidDate: '2026-01-01T00:00:00.000Z' },
  { id: '2', name: 'Internet', amount: 60, currency: 'USD', category: 'dashboard.categories.utilities', dueDay: 15, lastPaidDate: '2026-01-15T00:00:00.000Z' },
  { id: '3', name: 'Netflix', amount: 15, currency: 'USD', category: 'dashboard.categories.entertainment', dueDay: 20 },
];
const initialGoals: Goal[] = [
  { id: '1', name: 'Emergency Fund', targetAmount: 20000, currentAmount: 12000, currency: 'USD', deadline: '2026-12-31', linkedAccountId: '2' },
  { id: '2', name: 'New Car', targetAmount: 35000, currentAmount: 5000, currency: 'USD', deadline: '2027-06-30' },
  { id: '3', name: 'Vacation', targetAmount: 5000, currentAmount: 350, currency: 'USD', deadline: '2026-08-15', linkedAccountId: '3' },
];

const initialAccounts: Account[] = [
  { id: '1', name: 'Chase Checking', type: 'bank', balance: 4500.00, currency: 'USD' },
  { id: '2', name: 'Citi Savings', type: 'savings', balance: 12000.00, currency: 'USD' }, // Matched to Emergency Fund
  { id: '3', name: 'Cash Wallet', type: 'cash', balance: 350.00, currency: 'USD' }, // Matched to Vacation
];

// ... (existing initialLimits and initialPositions remain unchanged)
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
  { symbol: 'VTI', name: 'Vanguard Total Stock Market', quantity: 15, avgPrice: 200.00, currentPrice: 240.00, currency: 'USD', accountId: '1', assetClass: 'etf' }, // Added variety
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      transactions: [],
      limits: initialLimits,
      positions: initialPositions,
      goals: initialGoals,
      defaultCurrency: 'USD',
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      // ... Account actions ...
      addAccount: (account: Account) => set((state) => ({ accounts: [...state.accounts, account] })),
      updateAccount: (id: string, updates: Partial<Account>) => set((state) => ({ accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc) })),
      deleteAccount: (id: string) => set((state) => ({ accounts: state.accounts.filter(acc => acc.id !== id) })),

      // ... Goal actions ...
      addGoal: (goal: Goal) => set((state) => ({ goals: [...state.goals, goal] })),
      updateGoal: (id: string, updates: Partial<Goal>) => set((state) => ({ goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g) })),
      deleteGoal: (id: string) => set((state) => ({ goals: state.goals.filter(g => g.id !== id) })),

      // ... Limit actions ...
      addLimit: (limit: LimitRule) => set((state) => ({ limits: [...state.limits, limit] })),
      updateLimit: (id: string, updates: Partial<LimitRule>) => set((state) => ({ limits: state.limits.map(l => l.id === id ? { ...l, ...updates } : l) })),
      deleteLimit: (id: string) => set((state) => ({ limits: state.limits.filter(l => l.id !== id) })),

      // ... Position actions ...
      addPosition: (position: Position) => set((state) => {
        const existingIndex = state.positions.findIndex(p => p.symbol === position.symbol && p.accountId === position.accountId);
        if (existingIndex >= 0) {
          return { positions: state.positions.map((p, idx) => idx === existingIndex ? { ...p, ...position } : p) };
        }
        return { positions: [...state.positions, position] };
      }),
      updatePosition: (symbol: string, accountId: string, updates: Partial<Position>) => set((state) => ({ positions: state.positions.map(p => p.symbol === symbol && p.accountId === accountId ? { ...p, ...updates } : p) })),
      deletePosition: (symbol: string, accountId: string) => set((state) => ({ positions: state.positions.filter(p => !(p.symbol === symbol && p.accountId === accountId)) })),

      // ... Transaction actions ...
      addTransaction: (transaction: Transaction) => set((state) => {
        const newAccounts = [...state.accounts];
        if (transaction.type === 'expense') {
          const accIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
          if (accIndex >= 0) newAccounts[accIndex].balance -= transaction.amount;
        } else if (transaction.type === 'income') {
          const accIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
          if (accIndex >= 0) newAccounts[accIndex].balance += transaction.amount;
        } else if (transaction.type === 'transfer' && transaction.toAccountId) {
          const fromIndex = newAccounts.findIndex(a => a.id === transaction.accountId);
          const toIndex = newAccounts.findIndex(a => a.id === transaction.toAccountId);
          if (fromIndex >= 0 && toIndex >= 0) {
            newAccounts[fromIndex].balance -= transaction.amount;
            newAccounts[toIndex].balance += transaction.amount;
          }
        }
        return { transactions: [transaction, ...state.transactions], accounts: newAccounts };
      }),

      // ... Recurring Expense actions ...
      recurringExpenses: initialRecurringExpenses, // Initialize with mock data
      addRecurringExpense: (expense: RecurringExpense) => set((state) => ({ recurringExpenses: [...state.recurringExpenses, expense] })),
      updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => set((state) => ({ recurringExpenses: state.recurringExpenses.map(e => e.id === id ? { ...e, ...updates } : e) })),
      deleteRecurringExpense: (id: string) => set((state) => ({ recurringExpenses: state.recurringExpenses.filter(e => e.id !== id) })),
      payRecurringExpense: (id: string, accountId: string, dateStr?: string) => set((state) => {
        const expense = state.recurringExpenses.find(e => e.id === id);
        if (!expense) return state;

        const date = dateStr || new Date().toISOString();

        // 1. Create Transaction
        const transaction: Transaction = {
          id: `recurring_${Date.now()}`,
          accountId: accountId,
          type: 'expense',
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          date: date,
          description: `Payment: ${expense.name}`,
          status: 'completed',
          isRecurring: true
        };

        // 2. Update Account Balance
        const newAccounts = [...state.accounts];
        const accIndex = newAccounts.findIndex(a => a.id === accountId);
        if (accIndex >= 0) {
          newAccounts[accIndex].balance -= expense.amount;
        }

        // 3. Update Last Paid Date
        const newRecurring = state.recurringExpenses.map(e => e.id === id ? { ...e, lastPaidDate: date } : e);

        return {
          transactions: [transaction, ...state.transactions],
          accounts: newAccounts,
          recurringExpenses: newRecurring
        };
      }),
      toggleRecurringExpense: (id: string) => set((state) => {
        const expense = state.recurringExpenses.find(e => e.id === id);
        if (!expense) return state;

        const now = new Date();
        let newDate: string | undefined = now.toISOString();

        if (expense.lastPaidDate) {
          const lastPaid = new Date(expense.lastPaidDate);
          if (lastPaid.getMonth() === now.getMonth() && lastPaid.getFullYear() === now.getFullYear()) {
            newDate = undefined; // Uncheck/Unpay
          }
        }

        return {
          recurringExpenses: state.recurringExpenses.map(e => e.id === id ? { ...e, lastPaidDate: newDate } : e)
        };
      }),
    }),
    {
      name: 'plutus-storage',
      version: 1,
    }
  )
);
