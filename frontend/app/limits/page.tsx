"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LimitRule } from "@/types";
import { AddLimitDialog } from "@/components/limits/add-limit-dialog";
import { LimitList } from "@/components/limits/limit-list";

export default function LimitsPage() {
  const { t } = useTranslation();
  const [editingLimit, setEditingLimit] = useState<LimitRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = (limit?: LimitRule) => {
    if (limit) {
      setEditingLimit(limit);
    } else {
      setEditingLimit(null);
    }
    setIsDialogOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 container mx-auto pb-20 md:pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("limits.title")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t("limits.subtitle") || "Manage your monthly spending limits."}
            </p>
          </div>

          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t("limits.add_limit")}
          </Button>
        </div>

        <LimitList onEdit={handleOpenDialog} />

        <AddLimitDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingLimit={editingLimit}
        />
      </div>
    </ProtectedRoute>
  );
}
