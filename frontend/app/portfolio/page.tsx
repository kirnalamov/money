"use client";

import { useState, useMemo } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
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
import { Plus } from "lucide-react";
import { Position, Currency } from "@/types";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { AssetAllocationCard } from "@/components/portfolio/asset-allocation-card";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { IncomeForecastCard } from "@/components/portfolio/income-forecast-card";
import { InvestmentForecastCard } from "@/components/portfolio/investment-forecast-card";

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { positions, accounts, defaultCurrency, addPosition, updatePosition, deletePosition } = useStore();
  const [editingPosition, setEditingPosition] = useState<{ symbol: string; accountId: number } | null>(null);
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

  const resetForm = (assetClass: Position["assetClass"] = "stock") => {
    setFormData({
      symbol: "",
      name: "",
      quantity: "",
      avgPrice: "",
      currentPrice: "",
      currency: defaultCurrency,
      accountId: brokerageAccounts[0]?.id.toString() || "",
      assetClass,
    });
    setEditingPosition(null);
  };

  const handleOpenDialog = (position?: Position, presetClass?: Position["assetClass"]) => {
    if (position) {
      setEditingPosition({ symbol: position.symbol, accountId: position.accountId });
      setFormData({
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity.toString(),
        avgPrice: position.avgPrice.toString(),
        currentPrice: position.currentPrice.toString(),
        currency: position.currency,
        accountId: position.accountId.toString(),
        assetClass: position.assetClass || "stock",
      });
    } else {
      resetForm(presetClass);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.symbol || !formData.name || !formData.quantity || !formData.avgPrice || !formData.currentPrice || !formData.accountId) return;

    const positionData: Position = {
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      avgPrice: parseFloat(formData.avgPrice),
      currentPrice: parseFloat(formData.currentPrice),
      currency: formData.currency,
      accountId: parseInt(formData.accountId),
      assetClass: formData.assetClass,
    };

    if (editingPosition && (editingPosition.symbol !== positionData.symbol || editingPosition.accountId !== positionData.accountId)) {
      alert(t('common.error'));
      return;
    }
    try {
      if (editingPosition) await updatePosition(editingPosition.symbol, editingPosition.accountId, positionData);
      else await addPosition(positionData);
    } catch { alert(t('common.error')); return; }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (position: Position) => {
    if (confirm(t("portfolio.delete_position") + "?")) {
      try { await deletePosition(position.symbol, Number(position.accountId)); } catch { alert(t('common.error')); }
    }
  };

  const portfolioMetrics = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;

    positions.forEach((position) => {
      const value = position.quantity * position.currentPrice;
      const cost = position.quantity * position.avgPrice;
      totalValue += convertCurrency(value, position.currency, defaultCurrency);
      totalCost += convertCurrency(cost, position.currency, defaultCurrency);
    });

    const totalPnL = totalValue - totalCost;
    const returnPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnL, returnPercent };
  }, [positions, defaultCurrency]);

  return (
    <ProtectedRoute>
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-5 pb-20 text-[#F1F3EE] md:px-4 md:pb-6 xl:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-[-0.02em] sm:text-[30px] sm:leading-[1.2]">{t("portfolio.title")}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">{t("portfolio.subtitle")}</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={brokerageAccounts.length === 0}
            className="h-[42px] gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-[18px] text-sm font-semibold text-[#10170A] hover:bg-[#D3F76F]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t("portfolio.add_position")}
          </Button>
        </header>

        <div className="flex flex-wrap items-stretch gap-5">
          <PortfolioSummary
            totalValue={portfolioMetrics.totalValue}
            totalCost={portfolioMetrics.totalCost}
            totalPnL={portfolioMetrics.totalPnL}
            returnPercent={portfolioMetrics.returnPercent}
          />
          <AssetAllocationCard />
        </div>

        <PositionsTable
          onEdit={(position) => handleOpenDialog(position)}
          onDelete={handleDelete}
          onAddBond={() => handleOpenDialog(undefined, "bond")}
        />

        <IncomeForecastCard />

        <InvestmentForecastCard initialValue={portfolioMetrics.totalValue} />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPosition ? t("portfolio.edit_position") : t("portfolio.add_position")}
              </DialogTitle>
              <DialogDescription>
                {editingPosition ? t("portfolio.edit_position_desc") : t("portfolio.add_position_desc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountId" className="text-right">{t("portfolio.account")}</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder={t("portfolio.select_account")} /></SelectTrigger>
                  <SelectContent>
                    {brokerageAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol" className="text-right">{t("portfolio.symbol")}</Label>
                <Input id="symbol" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })} className="col-span-3" placeholder="AAPL" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">{t("portfolio.name")}</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" placeholder="Apple Inc." />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assetClass" className="text-right">{t("portfolio.asset_class")}</Label>
                <Select value={formData.assetClass} onValueChange={(value) => setFormData({ ...formData, assetClass: value as Position["assetClass"] })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
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
                <Label htmlFor="quantity" className="text-right">{t("portfolio.quantity")}</Label>
                <Input id="quantity" type="number" step="0.00000001" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avgPrice" className="text-right">{t("portfolio.avg_price")}</Label>
                <Input id="avgPrice" type="number" step="0.01" value={formData.avgPrice} onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPrice" className="text-right">{t("portfolio.current_price")}</Label>
                <Input id="currentPrice" type="number" step="0.01" value={formData.currentPrice} onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">{t("portfolio.currency")}</Label>
                <Select value={formData.currency} onValueChange={(value: Currency) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
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
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={brokerageAccounts.length === 0}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
