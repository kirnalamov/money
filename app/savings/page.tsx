"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Goal } from "@/types";

export default function SavingsPage() {
  const { t } = useTranslation();
  const { goals, addGoal, updateGoal, deleteGoal, defaultCurrency } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Calculator State
  const [calcMonthly, setCalcMonthly] = useState("500");
  const [calcYears, setCalcYears] = useState("5");
  const [calcInterest, setCalcInterest] = useState("5");

  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    deadline: "",
  });

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: goal.currentAmount.toString(),
        deadline: goal.deadline || "",
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        deadline: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.targetAmount) return;

    const goalData = {
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount || "0"),
      deadline: formData.deadline,
      currency: defaultCurrency,
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal({
        id: crypto.randomUUID(),
        ...goalData,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("portfolio.delete_position") + "?")) {
      deleteGoal(id);
    }
  };

  // Calculator Logic
  const calculateSavings = () => {
    const p = 0; // initial
    const r = parseFloat(calcInterest) / 100 / 12;
    const n = parseFloat(calcYears) * 12;
    const pmt = parseFloat(calcMonthly);

    // FV = PMT * (((1 + r)^n - 1) / r)
    const fv = pmt * ((Math.pow(1 + r, n) - 1) / r);
    return fv;
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("savings.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("savings.subtitle") || "Track your financial goals and dreams"}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="md:w-auto w-full">
          <Plus className="mr-2 h-4 w-4" />
          {t("savings.add_goal") || "New Goal"}
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const isCompleted = progress >= 100;

          return (
            <div key={goal.id} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                  <Target className="h-6 w-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(goal)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
              <p className="text-muted-foreground text-sm mb-4 flex items-center gap-1">
                {goal.deadline && (
                  <>
                    <Calendar className="h-3 w-3" />
                    {new Date(goal.deadline).toLocaleDateString()}
                  </>
                )}
              </p>

              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">{formatCurrency(goal.currentAmount, goal.currency)}</span>
                <span className="text-sm font-medium text-muted-foreground">of {formatCurrency(goal.targetAmount, goal.currency)}</span>
              </div>

              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500 rounded-full", isCompleted ? "bg-green-500" : "bg-primary")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-right text-sm font-medium text-muted-foreground">
                {progress}%
              </div>
            </div>
          );
        })}

        {/* Add New Goal Placeholder Card */}
        <button
          onClick={() => handleOpenDialog()}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted bg-transparent p-6 hover:bg-muted/50 transition-colors h-full min-h-[220px]"
        >
          <div className="p-4 rounded-full bg-muted mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <span className="font-medium text-muted-foreground">Create New Goal</span>
        </button>
      </div>

      {/* Savings Calculator Section */}
      <div className="rounded-xl border bg-card p-6 md:p-8 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Interest Calculator</h3>
            <p className="text-sm text-muted-foreground">Estimate your future savings growth</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Monthly Contribution</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={calcMonthly}
                  onChange={(e) => setCalcMonthly(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Time Period (Years)</Label>
              <Input
                type="number"
                value={calcYears}
                onChange={(e) => setCalcYears(e.target.value)}
                max={50}
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>1 year</span>
                <span>50 years</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={calcYears}
                onChange={(e) => setCalcYears(e.target.value)}
                className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Annual Interest Rate (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={calcInterest}
                  onChange={(e) => setCalcInterest(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center bg-secondary/20 rounded-xl p-6 text-center">
            <span className="text-sm text-muted-foreground mb-2">Projected Total after {calcYears} years</span>
            <span className="text-4xl md:text-5xl font-bold text-primary mb-2">
              {formatCurrency(calculateSavings(), defaultCurrency)}
            </span>
            <span className="text-sm text-muted-foreground">
              Total Contributed: {formatCurrency(parseFloat(calcMonthly) * 12 * parseFloat(calcYears), defaultCurrency)}
            </span>
            <div className="mt-4 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold">
              +{formatCurrency(calculateSavings() - (parseFloat(calcMonthly) * 12 * parseFloat(calcYears)), defaultCurrency)} Interest Earned
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            <DialogDescription>Set a target and deadline to track your progress.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. New Car" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="target">Target Amount</Label>
                <Input id="target" type="number" value={formData.targetAmount} onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current">Current Savings</Label>
                <Input id="current" type="number" value={formData.currentAmount} onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Target Date</Label>
              <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
