"use client"

import ProtectedRoute from "@/components/auth/protected-route";

import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Globe, Coins, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { t } = useTranslation();

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
          <p className="text-muted-foreground mt-1">Manage your application preferences and data.</p>
        </div>

        <div className="grid gap-6">
          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>{t('settings.appearance')}</CardTitle>
              </div>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">{t('settings.theme_mode')}</span>
                  <p className="text-xs text-muted-foreground">Select light or dark mode.</p>
                </div>
                <ModeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Regional Settings</CardTitle>
              </div>
              <CardDescription>Configure language and currency preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">{t('settings.interface_language')}</span>
                  <p className="text-xs text-muted-foreground">Change the language of the application.</p>
                </div>
                <LanguageToggle />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('settings.default_currency')}</span>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Select your primary currency for reporting.</p>
                </div>
                <CurrencyToggle />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Data Management</CardTitle>
              </div>
              <CardDescription>Manage your local data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium text-destructive">Reset Application</span>
                  <p className="text-xs text-muted-foreground">Clear all local data and reset to default.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleReset}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
