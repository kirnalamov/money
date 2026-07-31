import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, Transaction, Currency, LimitRule, Position, Goal, RecurringExpense, Category, Tag } from '@/types';
import { getAccounts, createAccount, updateAccount as updateAccountApi, deleteAccount as deleteAccountApi } from './api/accounts';
import { getTransactions, createTransaction, updateTransaction as updateTransactionApi, deleteTransaction as deleteTransactionApi } from './api/transactions';

import { getGoals, createGoal, updateGoal as updateGoalApi, deleteGoal as deleteGoalApi } from './api/goals';
import { getCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi } from './api/categories';
import { getTags, createTag as createTagApi, updateTag as updateTagApi, deleteTag as deleteTagApi } from './api/tags';

const getRandomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  tags: Tag[];
  limits: LimitRule[];
  positions: Position[];
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;

  isLoading: boolean;
  fetchAllData: () => Promise<void>;

  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: number, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;

  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  addCategory: (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCategory: (id: number, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  addTag: (tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTag: (id: number, tag: Partial<Tag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  addLimit: (limit: LimitRule) => void;
  updateLimit: (id: string, limit: Partial<LimitRule>) => void;
  deleteLimit: (id: string) => void;
  addPosition: (position: Position) => void;
  updatePosition: (symbol: string, accountId: number, position: Partial<Position>) => void;
  deletePosition: (symbol: string, accountId: number) => void;
  goals: Goal[];
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  recurringExpenses: RecurringExpense[];
  addRecurringExpense: (expense: RecurringExpense) => void;
  updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => void;
  deleteRecurringExpense: (id: string) => void;
  payRecurringExpense: (id: string, accountId: number, date?: string) => void;
  toggleRecurringExpense: (id: string) => void;
  reset: () => void;
}

// Empty initial data for backend integration
const initialRecurringExpenses: RecurringExpense[] = [];
const initialGoals: Goal[] = [];
const initialAccounts: Account[] = [];
const initialLimits: LimitRule[] = [];
const initialPositions: Position[] = [];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      transactions: [],
      categories: [],
      tags: [],
      limits: initialLimits,
      positions: initialPositions,
      goals: initialGoals,
      recurringExpenses: initialRecurringExpenses,
      defaultCurrency: 'USD',
      isLoading: false,

      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      fetchAllData: async () => {
        set({ isLoading: true });
        try {
          const [accounts, transactions, goals, categories, tags] = await Promise.all([
            getAccounts(),
            getTransactions(),
            getGoals(),
            getCategories(),
            getTags()
          ]);
          set((state) => {
            const accountIds = new Set(accounts.map((a) => a.id));
            const validPositions = state.positions.filter((p) => accountIds.has(p.accountId));
            return { accounts, transactions, goals, categories, tags, positions: validPositions, isLoading: false };
          });
        } catch (error) {
          console.error("Failed to fetch data:", error);
          set({ isLoading: false });
        }
      },

      // ... Account actions ...
      addAccount: async (account: Account) => {
        try {
          const newAccount = await createAccount(account);
          set((state) => ({ accounts: [...state.accounts, newAccount] }));
        } catch (e) { console.error(e) }
      },
      updateAccount: async (id: number, updates: Partial<Account>) => {
        try {
          // Convert to string for API if needed, or update API client
          const updated = await updateAccountApi(id, updates);
          set((state) => ({ accounts: state.accounts.map(acc => acc.id === id ? updated : acc) }));
        } catch (e) { console.error(e) }
      },
      deleteAccount: async (id: number) => {
        try {
          await deleteAccountApi(id);
          set((state) => ({
            accounts: state.accounts.filter(acc => acc.id !== id),
            positions: state.positions.filter(p => p.accountId !== id),
          }));
        } catch (e) { console.error(e) }
      },

      // ... Goal actions ...
      // ... Goal actions ...
      addGoal: async (goal: Goal) => {
        try {
          const newGoal = await createGoal(goal);
          set((state) => ({ goals: [...state.goals, newGoal] }));
        } catch (e) { console.error(e) }
      },
      updateGoal: async (id: string, updates: Partial<Goal>) => {
        try {
          const updated = await updateGoalApi(id, updates);
          set((state) => ({ goals: state.goals.map(g => g.id === id ? updated : g) }));
        } catch (e) { console.error(e) }
      },
      deleteGoal: async (id: string) => {
        try {
          await deleteGoalApi(id);
          set((state) => ({ goals: state.goals.filter(g => g.id !== id) }));
        } catch (e) { console.error(e) }
      },

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
      updatePosition: (symbol: string, accountId: number, updates: Partial<Position>) => set((state) => ({ positions: state.positions.map(p => p.symbol === symbol && p.accountId === accountId ? { ...p, ...updates } : p) })),
      deletePosition: (symbol: string, accountId: number) => set((state) => ({ positions: state.positions.filter(p => !(p.symbol === symbol && p.accountId === accountId)) })),

      // ... Transaction actions ...
      addTransaction: async (transaction: Transaction) => {
        try {
          const newTx = await createTransaction(transaction);
          const categories = await getCategories();
          const tags = await getTags();
          
          set((state) => {
            const newAccounts = [...state.accounts];
            const accIndex = newAccounts.findIndex(a => a.id === newTx.accountId);
            if (accIndex >= 0) {
              if (newTx.type === 'expense') newAccounts[accIndex].balance -= newTx.amount;
              else if (newTx.type === 'income') newAccounts[accIndex].balance += newTx.amount;
            }
            
            let updatedState: Partial<AppState> = { 
              transactions: [newTx, ...state.transactions], 
              accounts: newAccounts, 
              categories, 
              tags 
            };
            
            // If isRecurring is true, also add to recurringExpenses if not already there
            if (transaction.isRecurring) {
              const exists = state.recurringExpenses.find(e => 
                e.name === transaction.description || 
                (e.amount === transaction.amount && e.category === transaction.category && e.name === transaction.category)
              );
              if (!exists) {
                const newRecurring: RecurringExpense = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: transaction.description || transaction.category,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  category: transaction.category,
                  dueDay: new Date(transaction.date).getDate(),
                  lastPaidDate: transaction.date
                };
                updatedState.recurringExpenses = [...state.recurringExpenses, newRecurring];
              }
            }
            
            return updatedState;
          });
        } catch (e) { console.error(e) }
      },

      updateTransaction: async (id: number, updates: Partial<Transaction>) => {
        try {
          const oldTx = get().transactions.find(t => t.id === id);
          if (!oldTx) return;

          const updated = await updateTransactionApi(id.toString(), updates);
          
          const categories = await getCategories();
          const tags = await getTags();

          set((state) => {
            const newAccounts = [...state.accounts];
            
            // Revert old transaction effect
            const oldAccIndex = newAccounts.findIndex(a => a.id === oldTx.accountId);
            if (oldAccIndex >= 0) {
                if (oldTx.type === 'expense') newAccounts[oldAccIndex].balance += oldTx.amount;
                else if (oldTx.type === 'income') newAccounts[oldAccIndex].balance -= oldTx.amount;
            }

            // Apply new transaction effect
            const newAccIndex = newAccounts.findIndex(a => a.id === updated.accountId);
            if (newAccIndex >= 0) {
                if (updated.type === 'expense') newAccounts[newAccIndex].balance -= updated.amount;
                else if (updated.type === 'income') newAccounts[newAccIndex].balance += updated.amount;
            }

            let updatedState: Partial<AppState> = {
              transactions: state.transactions.map(t => t.id === id ? updated : t),
              accounts: newAccounts,
              categories,
              tags
            };

            // If isRecurring became true, also add to recurringExpenses if not already there
            if (updated.isRecurring && !oldTx.isRecurring) {
              const exists = state.recurringExpenses.find(e => 
                e.name === updated.description || 
                (e.amount === updated.amount && e.category === updated.category && e.name === updated.category)
              );
              if (!exists) {
                const newRecurring: RecurringExpense = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: updated.description || updated.category,
                  amount: updated.amount,
                  currency: updated.currency,
                  category: updated.category,
                  dueDay: new Date(updated.date).getDate(),
                  lastPaidDate: updated.date
                };
                updatedState.recurringExpenses = [...state.recurringExpenses, newRecurring];
              }
            }

            return updatedState;
          });
        } catch (e) { console.error(e) }
      },

      deleteTransaction: async (id: number) => {
        try {
          const txToDelete = get().transactions.find(t => t.id === id);
          if (!txToDelete) return;

          await deleteTransactionApi(id.toString());
          
          set((state) => {
            const newAccounts = [...state.accounts];
            const accIndex = newAccounts.findIndex(a => a.id === txToDelete.accountId);
            if (accIndex >= 0) {
              if (txToDelete.type === 'expense') newAccounts[accIndex].balance += txToDelete.amount;
              else if (txToDelete.type === 'income') newAccounts[accIndex].balance -= txToDelete.amount;
            }

            return {
              transactions: state.transactions.filter(t => t.id !== id),
              accounts: newAccounts
            };
          });
        } catch (e) { console.error(e) }
      },

      addCategory: async (category) => {
        try {
          const catPayload = { ...category, color: category.color || getRandomHexColor() };
          const newCat = await createCategoryApi(catPayload);
          set((state) => ({ categories: [...state.categories, newCat] }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      updateCategory: async (id, updates) => {
        try {
          const updated = await updateCategoryApi(id, updates);
          set((state) => ({ categories: state.categories.map(c => c.id === id ? updated : c) }));
        } catch (e) { console.error(e) }
      },
      deleteCategory: async (id) => {
        try {
          await deleteCategoryApi(id);
          set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
        } catch (e) { console.error(e) }
      },

      addTag: async (tag) => {
        try {
          const tagPayload = { ...tag, color: tag.color || getRandomHexColor() };
          const newTag = await createTagApi(tagPayload);
          set((state) => ({ tags: [...state.tags, newTag] }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      updateTag: async (id, updates) => {
        try {
          const updated = await updateTagApi(id, updates);
          set((state) => ({ tags: state.tags.map(t => t.id === id ? updated : t) }));
        } catch (e) { console.error(e) }
      },
      deleteTag: async (id) => {
        try {
          await deleteTagApi(id);
          set((state) => ({ tags: state.tags.filter(t => t.id !== id) }));
        } catch (e) { console.error(e) }
      },

      // ... Recurring Expense actions ...
      // recurringExpenses property is already initialized in state object above
      addRecurringExpense: (expense: RecurringExpense) => set((state) => ({ recurringExpenses: [...state.recurringExpenses, expense] })),
      updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => set((state) => ({ recurringExpenses: state.recurringExpenses.map(e => e.id === id ? { ...e, ...updates } : e) })),
      deleteRecurringExpense: (id: string) => set((state) => ({ recurringExpenses: state.recurringExpenses.filter(e => e.id !== id) })),
      payRecurringExpense: async (id: string, accountId: number, dateStr?: string) => {
        const state = get();
        const expense = state.recurringExpenses.find(e => e.id === id);
        if (!expense) return;

        const date = dateStr || new Date().toISOString();

        // 1. Create Transaction to sync with backend
        await state.addTransaction({
          amount: expense.amount,
          currency: expense.currency,
          description: expense.name,
          date: date,
          type: 'expense',
          category: 'Housing', // Default category for mandatory expenses
          accountId: accountId,
        } as Transaction);

        // 2. Update local state
        set((currentState) => ({
          recurringExpenses: currentState.recurringExpenses.map(e => e.id === id ? { ...e, lastPaidDate: date } : e)
        }));
      },
      toggleRecurringExpense: (id: string) => set((state) => {
        return {
          recurringExpenses: state.recurringExpenses.map(e => {
            if (e.id === id) {
              const date = e.lastPaidDate ? undefined : new Date().toISOString();
              return { ...e, lastPaidDate: date };
            }
            return e;
          })
        };
      }),
      reset: () => set({
        accounts: [],
        transactions: [],
        categories: [],
        tags: [],
        limits: initialLimits,
        positions: initialPositions,
        goals: initialGoals,
        recurringExpenses: initialRecurringExpenses,
        isLoading: false
      }),
    }),
    {
      name: 'plutus-storage',
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        return persistedState as AppState;
      },
    }
  )
);
