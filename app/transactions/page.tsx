"use client";

import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";

const localeMap: Record<string, Locale> = {
  ru: ru,
  en: enUS,
};

export default function TransactionsPage() {
  const { t, i18n } = useTranslation();
  const locale = localeMap[i18n.language] || enUS;
  const { transactions, accounts, defaultCurrency } = useStore();
  
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('transactions.title')}</h2>
        <AddTransactionDialog />
      </div>
      
      <div className="rounded-md border">
        <div className="p-4">
           {transactions.length === 0 ? (
             <div className="text-center text-muted-foreground py-8">
               {t('transactions.empty_state')}
             </div>
           ) : (
             <div className="space-y-4">
               {transactions.map((tx) => (
                 <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                   <div className="flex flex-col">
                     <span className="font-medium">{tx.category}</span>
                     <span className="text-xs text-muted-foreground">
                       {format(new Date(tx.date), 'dd.MM.yyyy', { locale })} • {getAccountName(tx.accountId)} 
                       {tx.type === 'transfer' && ` → ${getAccountName(tx.toAccountId!)}`}
                     </span>
                     {tx.description && <span className="text-xs text-muted-foreground">{tx.description}</span>}
                   </div>
                   <div className="flex flex-col items-end">
                     <div className={`font-bold ${
                       tx.type === 'income' ? 'text-plutus-green' : 
                       tx.type === 'expense' ? 'text-destructive' : 'text-foreground'
                     }`}>
                       {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                       {formatCurrency(tx.amount, tx.currency)}
                     </div>
                     {tx.currency !== defaultCurrency && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                         {formatCurrency(
                           convertCurrency(tx.amount, tx.currency, defaultCurrency),
                           defaultCurrency
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
