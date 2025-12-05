"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionType } from '@/types';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AddTransactionDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');

  const { accounts, addTransaction } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;
    
    if (type === 'transfer' && !toAccountId) return;

    addTransaction({
      id: Math.random().toString(36).substr(2, 9),
      type,
      amount: parseFloat(amount),
      currency: 'USD',
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      category: category || 'Uncategorized',
      date: new Date().toISOString(),
      description,
      status: 'completed'
    });

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('transactions.add_button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('transactions.add_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('transactions.add_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t('transactions.type')}
            </Label>
            <div className="col-span-3">
              <Select 
                value={type} 
                onValueChange={(value: TransactionType) => setType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.placeholders.select_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
                  <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
                  <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t('transactions.amount')}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account" className="text-right">
              {type === 'transfer' ? t('transactions.from_account') : t('transactions.account')}
            </Label>
            <div className="col-span-3">
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.placeholders.select_account')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} {acc.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'transfer' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="toAccount" className="text-right">
                {t('transactions.to_account')}
              </Label>
              <div className="col-span-3">
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transactions.placeholders.destination_account')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(acc => acc.id !== accountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency} {acc.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              {t('transactions.category')}
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="col-span-3"
              placeholder={t('transactions.placeholders.category')}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              {t('transactions.description')}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder={t('transactions.placeholders.description')}
            />
          </div>
          
          <DialogFooter>
            <Button type="submit">{t('transactions.save_changes')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
