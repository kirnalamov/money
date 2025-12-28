import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, Transaction, Currency } from '@/types';

interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  addTransaction: (transaction: Transaction) => void;
  addAccount: (account: Account) => void;
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

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      transactions: [],
      defaultCurrency: 'USD',
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      addAccount: (account) =>
        set((state) => ({ accounts: [...state.accounts, account] })),
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
