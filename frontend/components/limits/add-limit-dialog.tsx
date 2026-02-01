"use client";

import { useState, useEffect } from "react";
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
    const { defaultCurrency, addLimit, updateLimit } = useStore();

    const [formData, setFormData] = useState({
        category: "",
        period: "monthly" as "daily" | "weekly" | "monthly",
        amount: "",
        currency: defaultCurrency as Currency,
    });

    useEffect(() => {
        if (editingLimit) {
            setFormData({
                category: editingLimit.category,
                period: editingLimit.period,
                amount: editingLimit.amount.toString(),
                currency: editingLimit.currency,
            });
        } else {
            setFormData({
                category: "",
                period: "monthly",
                amount: "",
                currency: defaultCurrency,
            });
        }
    }, [editingLimit, defaultCurrency, open]);

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

        onOpenChange(false);
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave}>{t("common.save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
