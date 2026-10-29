"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { Account, AccountType, Currency } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

export default function AccountsPage() {
  const { t, i18n } = useTranslation();
  const { accounts, defaultCurrency, addAccount, updateAccount, deleteAccount } = useStore();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "bank" as AccountType,
    balance: "",
    currency: defaultCurrency as Currency,
    provider: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "bank",
      balance: "",
      currency: defaultCurrency,
      provider: "",
    });
    setEditingAccount(null);
  };

  const handleOpenDialog = (account?: Account) => {
    setError(null);
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        balance: account.balance.toString(),
        currency: account.currency,
        provider: account.provider || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const balance = Number(formData.balance);
    if (!formData.name.trim()) {
      setError(t("accounts.validation.name"));
      return;
    }
    if (!Number.isFinite(balance) || (balance < 0 && balance !== editingAccount?.balance)) {
      setError(t("accounts.validation.balance"));
      return;
    }
    if (editingAccount && balance !== editingAccount.balance && !window.confirm(t("accounts.balance_change_warning"))) {
      return;
    }

    const accountData = {
      name: formData.name.trim(),
      type: formData.type,
      balance,
      currency: formData.currency,
      provider: formData.provider || undefined,
    };

    try {
      if (editingAccount) {
        const { balance: _balance, ...details } = accountData;
        await updateAccount(editingAccount.id, balance === editingAccount.balance
          ? details
          : { ...details, balance, expected_balance: editingAccount.balance });
      } else {
        await addAccount(accountData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (saveError) {
      setError(axios.isAxiosError(saveError) && saveError.response?.status === 409
        ? t("accounts.edit_conflict")
        : saveError instanceof Error ? saveError.message : t("common.error"));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t("accounts.delete_confirmation"))) {
      setError(null);
      try {
        await deleteAccount(id);
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : t("common.error"));
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">{t("accounts.title")}</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("accounts.add_account")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? t("accounts.edit_account") : t("accounts.add_account")}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount ? t("accounts.edit_account") : t("accounts.add_account")}
                </DialogDescription>
              </DialogHeader>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="name" className="sm:text-right">
                    {t("accounts.account_name")}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="type" className="sm:text-right">
                    {t("accounts.account_type")}
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: AccountType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">{t("accounts.types.bank")}</SelectItem>
                      <SelectItem value="savings">{t("accounts.types.savings")}</SelectItem>
                      <SelectItem value="cash">{t("accounts.types.cash")}</SelectItem>
                      <SelectItem value="brokerage">{t("accounts.types.brokerage")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="balance" className="sm:text-right">
                    {t("accounts.balance")}
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="sm:col-span-3"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="currency" className="sm:text-right">
                    {t("accounts.currency")}
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: Currency) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="provider" className="sm:text-right">
                    {t("accounts.provider")}
                  </Label>
                  <Input
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="sm:col-span-3"
                    placeholder={t("accounts.provider_placeholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {error && !isDialogOpen && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {accounts.length === 0 ? (
          <div className="border rounded-xl p-6 flex items-center justify-center text-muted-foreground">
            {t("accounts.no_accounts")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const convertedBalance = account.currency !== defaultCurrency
                ? convertCurrency(account.balance, account.currency, defaultCurrency)
                : null;

              return (
                  <div key={account.id} className="min-w-0 rounded-xl border bg-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="max-w-[180px] truncate font-semibold" title={account.name}>{account.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t(`accounts.types.${account.type}`)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(account)}
                        title={t("common.edit")}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id)}
                        title={t("common.delete")}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("accounts.balance")}</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(account.balance, account.currency)}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">{account.currency}</p>
                      {convertedBalance !== null && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(convertedBalance, defaultCurrency)}
                        </p>
                      )}
                    </div>
                    {account.provider && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t("accounts.provider")}</p>
                        <p className="text-sm">{account.provider}</p>
                      </div>
                    )}
                    {(account.updated_at || account.lastSync) && (
                      <p className="text-xs text-muted-foreground">
                        {t("accounts.last_updated")}: {new Date(account.updated_at || account.lastSync || "").toLocaleDateString(i18n.language)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

