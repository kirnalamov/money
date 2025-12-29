"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency, convertCurrency } from "@/lib/utils";
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
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Position, Currency, AccountType } from "@/types";

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { positions, accounts, defaultCurrency, addPosition, updatePosition, deletePosition } = useStore();
  const [editingPosition, setEditingPosition] = useState<{ symbol: string; accountId: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    quantity: "",
    avgPrice: "",
    currentPrice: "",
    currency: defaultCurrency as Currency,
    accountId: "",
    assetClass: "stock" as Position["assetClass"],
  });

  const brokerageAccounts = accounts.filter(acc => acc.type === 'brokerage');

  const resetForm = () => {
    setFormData({
      symbol: "",
      name: "",
      quantity: "",
      avgPrice: "",
      currentPrice: "",
      currency: defaultCurrency,
      accountId: brokerageAccounts[0]?.id || "",
      assetClass: "stock",
    });
    setEditingPosition(null);
  };

  const handleOpenDialog = (position?: Position) => {
    if (position) {
      setEditingPosition({ symbol: position.symbol, accountId: position.accountId });
      setFormData({
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity.toString(),
        avgPrice: position.avgPrice.toString(),
        currentPrice: position.currentPrice.toString(),
        currency: position.currency,
        accountId: position.accountId,
        assetClass: position.assetClass || "stock",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.symbol || !formData.name || !formData.quantity || !formData.avgPrice || !formData.currentPrice || !formData.accountId) return;

    const positionData: Position = {
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      avgPrice: parseFloat(formData.avgPrice),
      currentPrice: parseFloat(formData.currentPrice),
      currency: formData.currency,
      accountId: formData.accountId,
      assetClass: formData.assetClass,
    };

    if (editingPosition) {
      updatePosition(editingPosition.symbol, editingPosition.accountId, positionData);
    } else {
      addPosition(positionData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (symbol: string, accountId: string) => {
    if (confirm(t("portfolio.delete_position") + "?")) {
      deletePosition(symbol, accountId);
    }
  };

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let dayPnL = 0;
    let totalPnL = 0;

    positions.forEach((position) => {
      const value = position.quantity * position.currentPrice;
      const cost = position.quantity * position.avgPrice;
      
      const valueInDefault = convertCurrency(value, position.currency, defaultCurrency);
      const costInDefault = convertCurrency(cost, position.currency, defaultCurrency);
      
      totalValue += valueInDefault;
      totalCost += costInDefault;
      
      // Assuming 2% daily change for demo (in real app, fetch from API)
      const dailyChange = value * 0.02;
      dayPnL += convertCurrency(dailyChange, position.currency, defaultCurrency);
    });

    totalPnL = totalValue - totalCost;
    const ytdReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      dayPnL,
      totalPnL,
      ytdReturn,
    };
  }, [positions, defaultCurrency]);

  // Group positions by account
  const positionsByAccount = useMemo(() => {
    const grouped: Record<string, Position[]> = {};
    positions.forEach((position) => {
      if (!grouped[position.accountId]) {
        grouped[position.accountId] = [];
      }
      grouped[position.accountId].push(position);
    });
    return grouped;
  }, [positions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t("portfolio.title")}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} disabled={brokerageAccounts.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              {t("portfolio.add_position")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPosition ? t("portfolio.edit_position") : t("portfolio.add_position")}
              </DialogTitle>
              <DialogDescription>
                {editingPosition ? t("portfolio.edit_position_desc") : t("portfolio.add_position_desc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountId" className="text-right">
                  {t("portfolio.account")}
                </Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("portfolio.select_account")} />
                  </SelectTrigger>
                  <SelectContent>
                    {brokerageAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol" className="text-right">
                  {t("portfolio.symbol")}
                </Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  placeholder="AAPL"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t("portfolio.name")}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Apple Inc."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assetClass" className="text-right">
                  {t("portfolio.asset_class")}
                </Label>
                <Select
                  value={formData.assetClass}
                  onValueChange={(value: Position["assetClass"]) =>
                    setFormData({ ...formData, assetClass: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">{t("portfolio.asset_classes.stock")}</SelectItem>
                    <SelectItem value="crypto">{t("portfolio.asset_classes.crypto")}</SelectItem>
                    <SelectItem value="etf">{t("portfolio.asset_classes.etf")}</SelectItem>
                    <SelectItem value="bond">{t("portfolio.asset_classes.bond")}</SelectItem>
                    <SelectItem value="cash">{t("portfolio.asset_classes.cash")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  {t("portfolio.quantity")}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avgPrice" className="text-right">
                  {t("portfolio.avg_price")}
                </Label>
                <Input
                  id="avgPrice"
                  type="number"
                  step="0.01"
                  value={formData.avgPrice}
                  onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPrice" className="text-right">
                  {t("portfolio.current_price")}
                </Label>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  {t("portfolio.currency")}
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
              <Button onClick={handleSave} disabled={brokerageAccounts.length === 0}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl p-6 bg-card">
          <p className="text-sm text-muted-foreground mb-2">{t("portfolio.total_value")}</p>
          <p className="text-2xl font-bold">{formatCurrency(portfolioMetrics.totalValue, defaultCurrency)}</p>
        </div>
        <div className="border rounded-xl p-6 bg-card">
          <p className="text-sm text-muted-foreground mb-2">{t("portfolio.day_pnl")}</p>
          <p className={`text-2xl font-bold ${portfolioMetrics.dayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolioMetrics.dayPnL >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.dayPnL, defaultCurrency)}
          </p>
        </div>
        <div className="border rounded-xl p-6 bg-card">
          <p className="text-sm text-muted-foreground mb-2">{t("portfolio.total_pnl")}</p>
          <p className={`text-2xl font-bold ${portfolioMetrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolioMetrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.totalPnL, defaultCurrency)}
          </p>
        </div>
        <div className="border rounded-xl p-6 bg-card">
          <p className="text-sm text-muted-foreground mb-2">{t("portfolio.ytd_return")}</p>
          <p className={`text-2xl font-bold ${portfolioMetrics.ytdReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolioMetrics.ytdReturn >= 0 ? '+' : ''}{portfolioMetrics.ytdReturn.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Positions List */}
      {positions.length === 0 ? (
        <div className="border rounded-xl p-6 flex items-center justify-center text-muted-foreground">
          {brokerageAccounts.length === 0 
            ? t("portfolio.no_brokerage_accounts")
            : t("portfolio.no_positions")}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(positionsByAccount).map(([accountId, accountPositions]) => {
            const account = accounts.find(acc => acc.id === accountId);
            if (!account) return null;

            return (
              <div key={accountId} className="space-y-4">
                <h3 className="text-xl font-semibold">{account.name}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accountPositions.map((position) => {
                    const value = position.quantity * position.currentPrice;
                    const cost = position.quantity * position.avgPrice;
                    const pnl = value - cost;
                    const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
                    const valueInDefault = convertCurrency(value, position.currency, defaultCurrency);

                    return (
                      <div key={`${position.symbol}-${position.accountId}`} className="border rounded-xl p-6 bg-card">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{position.symbol}</h3>
                            <p className="text-sm text-muted-foreground">{position.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t(`portfolio.asset_classes.${position.assetClass || 'stock'}`)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(position)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(position.symbol, position.accountId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("portfolio.quantity")}</span>
                            <span className="text-sm font-medium">{position.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("portfolio.avg_price")}</span>
                            <span className="text-sm font-medium">{formatCurrency(position.avgPrice, position.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("portfolio.current_price")}</span>
                            <span className="text-sm font-medium">{formatCurrency(position.currentPrice, position.currency)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm text-muted-foreground">{t("portfolio.value")}</span>
                            <span className="text-sm font-bold">{formatCurrency(valueInDefault, defaultCurrency)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{t("portfolio.pnl")}</span>
                            <div className="flex items-center gap-2">
                              {pnl >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`text-sm font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, position.currency)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
