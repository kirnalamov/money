import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, Transaction, Currency, LimitRule, Position, Goal, RecurringExpense, Category, Tag } from '@/types';
import { getAccounts, createAccount, updateAccount as updateAccountApi, deleteAccount as deleteAccountApi } from './api/accounts';
import { getTransactions, createTransaction, updateTransaction as updateTransactionApi, deleteTransaction as deleteTransactionApi } from './api/transactions';

import { getGoals, createGoal, updateGoal as updateGoalApi, deleteGoal as deleteGoalApi } from './api/goals';
import { getCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi } from './api/categories';
import { getTags, createTag as createTagApi, updateTag as updateTagApi, deleteTag as deleteTagApi } from './api/tags';
import { getExchangeRates as getExchangeRatesApi } from './api/exchange-rates';
import { updateExchangeRates } from './utils';
import { getUserItems, saveUserItem, deleteUserItem, payUserExpense } from './api/user-items';

const getRandomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

export type DataSource = 'accounts' | 'transactions' | 'goals' | 'categories' | 'tags';

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
  dataReady: boolean;
  dataError: string | null;
  dataErrors: Partial<Record<DataSource, string>>;
  fetchAllData: () => Promise<void>;
  exchangeRatesUpdatedAt: string | null;
  refreshExchangeRates: () => Promise<void>;

  addAccount: (account: Omit<Account, 'id' | 'lastSync'>) => Promise<void>;
  updateAccount: (id: number, account: Partial<Account> & { expected_balance?: number }) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  addCategory: (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCategory: (id: number, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  addTag: (tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTag: (id: number, tag: Partial<Tag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  addLimit: (limit: LimitRule) => Promise<void>;
  updateLimit: (id: string, limit: Partial<LimitRule>) => Promise<void>;
  deleteLimit: (id: string) => Promise<void>;
  addPosition: (position: Position) => Promise<void>;
  updatePosition: (symbol: string, accountId: number, position: Partial<Position>) => Promise<void>;
  deletePosition: (symbol: string, accountId: number) => Promise<void>;
  seedDemoPositions: () => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: number, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  recurringExpenses: RecurringExpense[];
  addRecurringExpense: (expense: RecurringExpense) => Promise<void>;
  updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  payRecurringExpense: (id: string, accountId: number) => Promise<void>;
  toggleRecurringExpense: (id: string) => Promise<void>;
  reset: () => void;
}

// Empty initial data for backend integration
const initialRecurringExpenses: RecurringExpense[] = [];
const initialGoals: Goal[] = [];
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
      dataReady: false,
      dataError: null,
      dataErrors: {},
      exchangeRatesUpdatedAt: null,

      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      refreshExchangeRates: async () => {
        try {
          const snapshot = await getExchangeRatesApi();
          updateExchangeRates(snapshot.rates);
          set({ exchangeRatesUpdatedAt: snapshot.updated_at });
        } catch (error) {
          console.warn('Failed to refresh exchange rates; using cached rates:', error);
        }
      },

      fetchAllData: async () => {
        set({ isLoading: true, dataReady: false, dataError: null, dataErrors: {} });
        try {
          const userItems = await getUserItems();
          const exchangeRatesPromise = get().refreshExchangeRates();
          const results = await Promise.allSettled([
            getAccounts(),
            getTransactions(),
            getGoals(),
            getCategories(),
            getTags()
          ]);
          await exchangeRatesPromise;

          const sourceNames: DataSource[] = ['accounts', 'transactions', 'goals', 'categories', 'tags'];
          const dataErrors: Partial<Record<DataSource, string>> = {};
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              dataErrors[sourceNames[index]] = 'common.data_source_failed';
              console.error(`Failed to load ${sourceNames[index]}:`, result.reason);
            }
          });

          set((state) => {
            const accounts = results[0].status === 'fulfilled' ? results[0].value : state.accounts;
            const transactions = results[1].status === 'fulfilled' ? results[1].value : state.transactions;
            const goals = results[2].status === 'fulfilled' ? results[2].value : state.goals;
            const categories = results[3].status === 'fulfilled' ? results[3].value : state.categories;
            const tags = results[4].status === 'fulfilled' ? results[4].value : state.tags;
            const accountIds = new Set(accounts.map((a) => a.id));
            const validPositions = results[0].status === 'fulfilled' ? userItems.positions.filter((p) => accountIds.has(p.accountId)) : userItems.positions;
            const allSourcesFailed = sourceNames.every((source) => dataErrors[source]);
            return {
              accounts,
              transactions,
              goals,
              categories,
              tags,
              positions: validPositions,
              limits: userItems.limits,
              recurringExpenses: userItems.recurringExpenses,
              isLoading: false,
              dataReady: true,
              dataError: allSourcesFailed ? 'common.data_load_failed' : null,
              dataErrors,
            };
          });
        } catch (error) {
          console.error("Failed to fetch data:", error);
          set({ isLoading: false, dataReady: true, dataError: "common.data_load_failed", dataErrors: {} });
        }
      },

      // ... Account actions ...
      addAccount: async (account: Omit<Account, 'id' | 'lastSync'>) => {
        try {
          const newAccount = await createAccount(account);
          set((state) => ({ accounts: [...state.accounts, newAccount] }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      updateAccount: async (id: number, updates: Partial<Account> & { expected_balance?: number }) => {
        try {
          // Convert to string for API if needed, or update API client
          const updated = await updateAccountApi(id, updates);
          set((state) => ({ accounts: state.accounts.map(acc => acc.id === id ? updated : acc) }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      deleteAccount: async (id: number) => {
        try {
          await deleteAccountApi(id);
          set((state) => ({
            accounts: state.accounts.filter(acc => acc.id !== id),
            positions: state.positions.filter(p => p.accountId !== id),
          }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      // ... Goal actions ...
      // ... Goal actions ...
      addGoal: async (goal: Omit<Goal, 'id'>) => {
        try {
          const newGoal = await createGoal(goal);
          set((state) => ({ goals: [...state.goals, newGoal] }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      updateGoal: async (id: number, updates: Partial<Goal>) => {
        try {
          const updated = await updateGoalApi(id, updates);
          set((state) => ({ goals: state.goals.map(g => g.id === id ? updated : g) }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      deleteGoal: async (id: number) => {
        try {
          await deleteGoalApi(id);
          set((state) => ({ goals: state.goals.filter(g => g.id !== id) }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      // ... Limit actions ...
      addLimit: async (limit) => { await saveUserItem('limits', limit.id, limit); set((state) => ({ limits: [...state.limits, limit] })); },
      updateLimit: async (id, updates) => { const item = get().limits.find(l => l.id === id); if (!item) return; const updated = { ...item, ...updates }; await saveUserItem('limits', id, updated); set((state) => ({ limits: state.limits.map(l => l.id === id ? updated : l) })); },
      deleteLimit: async (id) => { await deleteUserItem('limits', id); set((state) => ({ limits: state.limits.filter(l => l.id !== id) })); },

      // ... Position actions ...
      addPosition: async (position: Position) => { await saveUserItem('positions', `${position.accountId}:${position.symbol}`, position); set((state) => {
        const existingIndex = state.positions.findIndex(p => p.symbol === position.symbol && p.accountId === position.accountId);
        if (existingIndex >= 0) {
          return { positions: state.positions.map((p, idx) => idx === existingIndex ? { ...p, ...position } : p) };
        }
        return { positions: [...state.positions, position] };
      }); },
      updatePosition: async (symbol, accountId, updates) => { const item = get().positions.find(p => p.symbol === symbol && p.accountId === accountId); if (!item) return; const updated = { ...item, ...updates, symbol, accountId }; await saveUserItem('positions', `${accountId}:${symbol}`, updated); set((state) => ({ positions: state.positions.map(p => p.symbol === symbol && p.accountId === accountId ? updated : p) })); },
      deletePosition: async (symbol, accountId) => { await deleteUserItem('positions', `${accountId}:${symbol}`); set((state) => ({ positions: state.positions.filter(p => !(p.symbol === symbol && p.accountId === accountId)) })); },
      seedDemoPositions: () => set((state) => {
        if (state.positions.length > 0) return state;

        const brokerageAccount = state.accounts.find((account) => account.type === 'brokerage');
        if (!brokerageAccount) return state;

        return {
          positions: [
            {
              symbol: 'VOO',
              name: 'Vanguard S&P 500 ETF',
              quantity: 8,
              avgPrice: 450,
              currentPrice: 508,
              currency: 'USD',
              accountId: brokerageAccount.id,
              assetClass: 'etf',
            },
            {
              symbol: 'SBER',
              name: 'Sberbank',
              quantity: 100,
              avgPrice: 250,
              currentPrice: 312,
              currency: 'RUB',
              accountId: brokerageAccount.id,
              assetClass: 'stock',
            },
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              quantity: 0.05,
              avgPrice: 58000,
              currentPrice: 66500,
              currency: 'USD',
              accountId: brokerageAccount.id,
              assetClass: 'crypto',
            },
          ],
        };
      }),

      // ... Transaction actions ...
      addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
        try {
          const newTx = await createTransaction(transaction);
          const [accounts, categories, tags] = await Promise.allSettled([
            getAccounts(),
            getCategories(),
            getTags(),
          ]);
          let recurringToSave: RecurringExpense | undefined;
          set((state) => {
            const updatedState: Partial<AppState> = {
              transactions: [newTx, ...state.transactions], 
              accounts: accounts.status === 'fulfilled' ? accounts.value : state.accounts,
              categories: categories.status === 'fulfilled' ? categories.value : state.categories,
              tags: tags.status === 'fulfilled' ? tags.value : state.tags,
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
                recurringToSave = newRecurring;
                updatedState.recurringExpenses = [...state.recurringExpenses, newRecurring];
              }
            }
            
            return updatedState;
          });
          if (recurringToSave) {
            try { await saveUserItem('recurringExpenses', recurringToSave.id, recurringToSave); }
            catch { window.alert('Операция сохранена, но регулярный расход не удалось сохранить.'); }
          }
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      updateTransaction: async (id: number, updates: Partial<Transaction>) => {
        try {
          const oldTx = get().transactions.find(t => t.id === id);
          if (!oldTx) return;

          const updated = await updateTransactionApi(id.toString(), updates);
          
          const [accounts, categories, tags] = await Promise.all([
            getAccounts(),
            getCategories(),
            getTags(),
          ]);

          set((state) => {
            const updatedState: Partial<AppState> = {
              transactions: state.transactions.map(t => t.id === id ? updated : t),
              accounts,
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
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      deleteTransaction: async (id: number) => {
        try {
          const txToDelete = get().transactions.find(t => t.id === id);
          if (!txToDelete) return;

          await deleteTransactionApi(id.toString());
          const accounts = await getAccounts();
          set((state) => ({
            transactions: state.transactions.filter(t => t.id !== id),
            accounts,
          }));
        } catch (e) {
          console.error(e);
          throw e;
        }
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
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      deleteCategory: async (id) => {
        try {
          await deleteCategoryApi(id);
          set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
        } catch (e) {
          console.error(e);
          throw e;
        }
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
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      deleteTag: async (id) => {
        try {
          await deleteTagApi(id);
          set((state) => ({ tags: state.tags.filter(t => t.id !== id) }));
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      // ... Recurring Expense actions ...
      // recurringExpenses property is already initialized in state object above
      addRecurringExpense: async (expense) => { await saveUserItem('recurringExpenses', expense.id, expense); set((state) => ({ recurringExpenses: [...state.recurringExpenses, expense] })); },
      updateRecurringExpense: async (id, updates) => { const item = get().recurringExpenses.find(e => e.id === id); if (!item) return; const updated = { ...item, ...updates }; await saveUserItem('recurringExpenses', id, updated); set((state) => ({ recurringExpenses: state.recurringExpenses.map(e => e.id === id ? updated : e) })); },
      deleteRecurringExpense: async (id) => { await deleteUserItem('recurringExpenses', id); set((state) => ({ recurringExpenses: state.recurringExpenses.filter(e => e.id !== id) })); },
      payRecurringExpense: async (id: string, accountId: number) => {
        await payUserExpense(id, accountId);
        await get().fetchAllData();
      },
      toggleRecurringExpense: async (id) => { const expense = get().recurringExpenses.find(e => e.id === id); if (expense) await get().updateRecurringExpense(id, { lastPaidDate: expense.lastPaidDate ? undefined : new Date().toISOString() }); },
      reset: () => set({
        accounts: [],
        transactions: [],
        categories: [],
        tags: [],
        limits: initialLimits,
        positions: initialPositions,
        goals: initialGoals,
        recurringExpenses: initialRecurringExpenses,
        defaultCurrency: 'USD',
        exchangeRatesUpdatedAt: null,
        dataError: null,
        dataErrors: {},
        dataReady: false,
        isLoading: false
      }),
    }),
    {
      name: 'plutus-storage',
      version: 1,
      migrate: (persistedState: unknown) => {
        return persistedState as AppState;
      },
    }
  )
);
