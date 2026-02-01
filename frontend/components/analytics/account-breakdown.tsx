"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AccountBreakdown() {
    const { t } = useTranslation();
    const { accounts, defaultCurrency } = useStore();

    const totalNetWorth = accounts.reduce((sum, acc) =>
        sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0
    );

    const sortedAccounts = [...accounts].sort((a, b) => {
        const valA = convertCurrency(a.balance, a.currency, defaultCurrency);
        const valB = convertCurrency(b.balance, b.currency, defaultCurrency);
        return valB - valA;
    });

    const getTypeLabel = (type: string) => {
        const keyMap: Record<string, string> = {
            'bank': t('accounts.types.bank'),
            'savings': t('accounts.types.savings'),
            'cash': t('accounts.types.cash'),
            'brokerage': t('accounts.types.brokerage')
        };
        return keyMap[type] || type;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{t('analytics.breakdown.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('accounts.account_name')}</TableHead>
                            <TableHead>{t('accounts.account_type')}</TableHead>
                            <TableHead className="text-right">{t('accounts.balance')}</TableHead>
                            <TableHead className="text-right">%</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAccounts.map((acc) => {
                            const val = convertCurrency(acc.balance, acc.currency, defaultCurrency);
                            const percent = totalNetWorth !== 0 ? (val / totalNetWorth) * 100 : 0;

                            return (
                                <TableRow key={acc.id}>
                                    <TableCell className="font-medium">{acc.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {getTypeLabel(acc.type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(acc.balance, acc.currency)}
                                        {acc.currency !== defaultCurrency && (
                                            <div className="text-xs text-muted-foreground">
                                                ≈ {formatCurrency(val, defaultCurrency)}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {percent.toFixed(1)}%
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
