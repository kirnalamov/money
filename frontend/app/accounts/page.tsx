"use client";

import { useRef, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatMoney } from "@/lib/utils";
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
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountsPage() {
  const { t, i18n } = useTranslation();
  const { accounts, defaultCurrency, isLoading, dataError, dataErrors, fetchAllData, addAccount, updateAccount, deleteAccount } = useStore();
  const dateLocale = i18n.language === "ru" ? ru : enUS;
  const opener = useRef<HTMLElement | null>(null);
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

  const handleOpenDialog = (account?: Account, trigger?: HTMLElement) => {
    opener.current = trigger ?? null;
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
        const { name, type, currency, provider } = accountData;
        const details = { name, type, currency, provider };
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
      <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-20 md:px-4 md:pb-6 xl:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{t("accounts.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("accounts.subtitle")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full sm:w-auto" onClick={(e) => handleOpenDialog(undefined, e.currentTarget)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("accounts.add_account")}
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]"
              onCloseAutoFocus={(e) => {
                if (opener.current?.isConnected) {
                  e.preventDefault();
                  opener.current.focus();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? t("accounts.edit_account") : t("accounts.add_account")}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount ? t("accounts.edit_description") : t("accounts.add_description")}
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
                    autoComplete="off"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="account-type" className="sm:text-right">
                    {t("accounts.account_type")}
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: AccountType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="account-type" className="sm:col-span-3">
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
                    autoComplete="off"
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="sm:col-span-3"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                  <Label htmlFor="account-currency" className="sm:text-right">
                    {t("accounts.currency")}
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: Currency) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger id="account-currency" className="sm:col-span-3">
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
                    autoComplete="organization"
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

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label={t("common.loading")}>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}
          </div>
        ) : (dataError || dataErrors.accounts) && accounts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center" role="alert">
            <h3 className="text-base font-semibold">{t("common.data_load_failed_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("common.data_load_failed")}</p>
            <Button type="button" variant="outline" onClick={() => void fetchAllData()} className="mt-5 h-11">{t("common.retry")}</Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card p-5 py-10 text-center text-sm text-muted-foreground">
            {t("accounts.no_accounts")}
            <Button className="h-11" onClick={(e) => handleOpenDialog(undefined, e.currentTarget)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("accounts.add_account")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const convertedBalance = account.currency !== defaultCurrency
                ? convertCurrency(account.balance, account.currency, defaultCurrency)
                : null;

              return (
                  <div key={account.id} className="min-w-0 rounded-2xl border bg-card p-5">
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
                        className="h-11 w-11"
                        onClick={(e) => handleOpenDialog(account, e.currentTarget)}
                        title={t("common.edit")}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
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
                      <p className="text-2xl font-bold tabular-nums">
                        {formatMoney(account.balance, account.currency, i18n.language)}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">{account.currency}</p>
                      {convertedBalance !== null && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          ≈ {formatMoney(convertedBalance, defaultCurrency, i18n.language)}
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
                        {t("accounts.last_updated")}: {format(new Date(account.updated_at || account.lastSync || ""), "d MMM yyyy", { locale: dateLocale })}
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

