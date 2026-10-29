"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LimitRule, Currency } from "@/types";
import { useStore } from "@/lib/store";

interface AddLimitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingLimit?: LimitRule | null;
}

export function AddLimitDialog({ open, onOpenChange, editingLimit }: AddLimitDialogProps) {
    const { t } = useTranslation();
    const { defaultCurrency, addLimit, updateLimit, categories } = useStore();

    const [formData, setFormData] = useState({
        category: editingLimit?.category || "",
        period: editingLimit?.period || "monthly" as "daily" | "weekly" | "monthly",
        amount: editingLimit?.amount.toString() || "",
        currency: editingLimit?.currency || defaultCurrency as Currency,
    });
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        const amount = Number(formData.amount);
        if (!formData.category) {
            setError(t("limits.validation.category"));
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setError(t("limits.validation.amount"));
            return;
        }

        const limitData: Omit<LimitRule, "id"> = {
            category: formData.category,
            period: formData.period,
            amount,
            currency: formData.currency,
            spent: editingLimit?.spent || 0,
        };

        try {
            if (editingLimit) await updateLimit(editingLimit.id, limitData);
            else await addLimit({ ...limitData, id: crypto.randomUUID() });
            onOpenChange(false);
        } catch {
            setError(t('common.error'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {editingLimit ? t("limits.edit_limit") : t("limits.add_limit")}
                    </DialogTitle>
                    <DialogDescription>
                        {editingLimit ? t("limits.edit_limit") : t("limits.add_limit")}
                    </DialogDescription>
                </DialogHeader>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                        <Label htmlFor="category" className="sm:text-right">
                            {t("limits.category")}
                        </Label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                            <SelectTrigger className="sm:col-span-3">
                                <SelectValue placeholder={t("limits.category")} />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                                {categories.length === 0 && (
                                    <SelectItem value="no-category" disabled>{t("limits.validation.no_categories")}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                        <Label htmlFor="period" className="sm:text-right">
                            {t("limits.period")}
                        </Label>
                        <Select
                            value={formData.period}
                            onValueChange={(value: "daily" | "weekly" | "monthly") =>
                                setFormData({ ...formData, period: value })
                            }
                        >
                            <SelectTrigger className="sm:col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">{t("limits.periods.daily")}</SelectItem>
                                <SelectItem value="weekly">{t("limits.periods.weekly")}</SelectItem>
                                <SelectItem value="monthly">{t("limits.periods.monthly")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                        <Label htmlFor="amount" className="sm:text-right">
                            {t("limits.limit")}
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="sm:col-span-3"
                            min="0.01"
                        />
                    </div>

                    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                        <Label htmlFor="currency" className="sm:text-right">
                            {t("limits.currency")}
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave}>{t("common.save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
