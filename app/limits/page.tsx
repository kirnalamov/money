"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LimitRule, Currency } from "@/types";

export default function LimitsPage() {
  const { t } = useTranslation();
  const { limits, defaultCurrency, addLimit, updateLimit, deleteLimit } = useStore();
  const [editingLimit, setEditingLimit] = useState<LimitRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    period: "monthly" as "daily" | "weekly" | "monthly",
    amount: "",
    currency: defaultCurrency as Currency,
  });

  const resetForm = () => {
    setFormData({
      category: "",
      period: "monthly",
      amount: "",
      currency: defaultCurrency,
    });
    setEditingLimit(null);
  };

  const handleOpenDialog = (limit?: LimitRule) => {
    if (limit) {
      setEditingLimit(limit);
      setFormData({
        category: limit.category,
        period: limit.period,
        amount: limit.amount.toString(),
        currency: limit.currency,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.category || !formData.amount) return;

    const limitData: Partial<LimitRule> = {
      category: formData.category,
      period: formData.period,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      spent: editingLimit?.spent || 0,
    };

    if (editingLimit) {
      updateLimit(editingLimit.id, limitData);
    } else {
      addLimit({
        ...(limitData as Omit<LimitRule, "id">),
        id: Math.random().toString(36).substr(2, 9),
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("limits.delete_limit") + "?")) {
      deleteLimit(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t("limits.title")}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t("limits.add_limit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingLimit ? t("limits.edit_limit") : t("limits.add_limit")}
              </DialogTitle>
              <DialogDescription>
                {editingLimit ? t("limits.edit_limit") : t("limits.add_limit")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  {t("limits.category")}
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("limits.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard.categories.housing">{t("dashboard.categories.housing")}</SelectItem>
                    <SelectItem value="dashboard.categories.food">{t("dashboard.categories.food")}</SelectItem>
                    <SelectItem value="dashboard.categories.transport">{t("dashboard.categories.transport")}</SelectItem>
                    <SelectItem value="dashboard.categories.shopping">{t("dashboard.categories.shopping")}</SelectItem>
                    <SelectItem value="dashboard.categories.utilities">{t("dashboard.categories.utilities")}</SelectItem>
                    <SelectItem value="dashboard.categories.groceries">{t("dashboard.categories.groceries")}</SelectItem>
                    <SelectItem value="dashboard.categories.dining_out">{t("dashboard.categories.dining_out")}</SelectItem>
                    <SelectItem value="dashboard.categories.entertainment">{t("dashboard.categories.entertainment")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="period" className="text-right">
                  {t("limits.period")}
                </Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setFormData({ ...formData, period: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("limits.periods.daily")}</SelectItem>
                    <SelectItem value="weekly">{t("limits.periods.weekly")}</SelectItem>
                    <SelectItem value="monthly">{t("limits.periods.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  {t("limits.limit")}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  {t("limits.currency")}
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: Currency) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
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

      {limits.length === 0 ? (
        <div className="border rounded-xl p-6 flex items-center justify-center text-muted-foreground">
          {t("limits.no_limits")}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("limits.category")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("limits.period")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("limits.limit")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("limits.spent")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {limits.map((limit) => {
                  const percentage = Math.min(100, (limit.spent / limit.amount) * 100);
                  return (
                    <tr key={limit.id} className="border-t">
                      <td className="px-4 py-3">{t(limit.category)}</td>
                      <td className="px-4 py-3">{t(`limits.periods.${limit.period}`)}</td>
                      <td className="px-4 py-3">{formatCurrency(limit.amount, limit.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(limit.spent, limit.currency)}</span>
                          <span className="text-xs text-muted-foreground">({Math.round(percentage)}%)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(limit)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(limit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
