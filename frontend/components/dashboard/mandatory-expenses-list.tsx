"use client";

import { useTranslation } from "react-i18next";
import { formatCurrency, cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, MoreHorizontal } from "lucide-react";
import { isSameMonth, parseISO } from "date-fns";
import { RecurringExpense } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MandatoryExpensesList() {
    const { t } = useTranslation();
    const { recurringExpenses, payRecurringExpense, toggleRecurringExpense, accounts } = useStore();
    const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);

    const isPaidThisMonth = (dateString?: string) => {
        if (!dateString) return false;
        return isSameMonth(parseISO(dateString), new Date());
    };

    const handlePayClick = (expense: RecurringExpense) => {
        setSelectedExpense(expense);
        const defaultAcc = accounts.find(a => a.type === 'bank' || a.type === 'cash');
        if (defaultAcc) setSelectedAccount(defaultAcc.id);
        setIsPayDialogOpen(true);
    };

    const confirmPayment = () => {
        if (selectedExpense && selectedAccount) {
            payRecurringExpense(selectedExpense.id, selectedAccount);
            setIsPayDialogOpen(false);
            setSelectedExpense(null);
        }
    };

    const sortedExpenses = [...recurringExpenses].sort((a, b) => {
        const aPaid = isPaidThisMonth(a.lastPaidDate);
        const bPaid = isPaidThisMonth(b.lastPaidDate);
        if (aPaid === bPaid) return a.dueDay - b.dueDay;
        return aPaid ? 1 : -1;
    });

    return (
        <Card className="h-full">
            <CardHeader className="py-3 px-4">
                <CardTitle className="text-base font-semibold">{t('dashboard.mandatory_expenses.title')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
                {sortedExpenses.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                        {t('dashboard.mandatory_expenses.empty')}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedExpenses.map(expense => {
                            const isPaid = isPaidThisMonth(expense.lastPaidDate);
                            return (
                                <div key={expense.id} className="flex items-center justify-between py-2 group">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={isPaid}
                                            onCheckedChange={() => toggleRecurringExpense(expense.id)}
                                            className="h-4 w-4"
                                        />
                                        <div className="flex flex-col">
                                            <span className={cn("text-sm font-medium leading-none", isPaid && "text-muted-foreground line-through")}>
                                                {expense.name}
                                            </span>
                                            {!isPaid && (
                                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                                    {t('common.due')} {expense.dueDay}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-sm font-medium", isPaid && "text-muted-foreground")}>
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handlePayClick(expense)}>
                                                    {t('dashboard.mandatory_expenses.pay_with_transaction')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.mandatory_expenses.pay_title')} {selectedExpense?.name}</DialogTitle>
                        <DialogDescription>
                            {t('dashboard.mandatory_expenses.pay_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="account" className="text-right">
                                {t('common.account')}
                            </Label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={t('common.select_account')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={confirmPayment}>{t('common.confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
