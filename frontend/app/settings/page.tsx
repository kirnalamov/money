"use client"

import ProtectedRoute from "@/components/auth/protected-route";

import { useTheme } from "next-themes";
import { Currency } from "@/types";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Globe, Coins, Database, Trash2, Tags, Tag as TagIcon, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { resetApplicationStorage } from "@/lib/legacy-backup";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { categories, tags, addCategory, updateCategory, deleteCategory, addTag, updateTag, deleteTag, defaultCurrency, setDefaultCurrency } = useStore();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [catError, setCatError] = useState("");
  const [tagError, setTagError] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);
  const hasUnsavedChanges = Boolean(
    (editingCategory && categories.some((category) => category.id === editingCategory.id && (category.name !== editingCategory.name || (category.color || "#cccccc") !== editingCategory.color))) ||
    (editingTag && tags.some((tag) => tag.id === editingTag.id && (tag.name !== editingTag.name || (tag.color || "#cccccc") !== editingTag.color)))
  );

  const getOperationError = (error: unknown) => {
    const response = typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { detail?: unknown } } }).response
      : undefined;
    const detail = response?.data?.detail;
    if (typeof detail === "string") {
      return detail.toLowerCase().includes("already exists")
        ? t("settings.name_conflict")
        : detail;
    }
    return error instanceof Error ? error.message : t("common.error");
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("settings.unsaved_warning");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, t]);


  const handleAddCategory = async () => {
    setCatError("");
    if (newCategoryName.trim()) {
      try {
        await addCategory({ name: newCategoryName.trim() });
        setNewCategoryName("");
      } catch (error) {
        setCatError(getOperationError(error));
      }
    }
  };

  const handleAddTag = async () => {
  	setTagError("");
    if (newTagName.trim()) {
      try {
        await addTag({ name: newTagName.trim() });
        setNewTagName("");
      } catch (error) {
        setTagError(getOperationError(error));
      }
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    setCatError("");
    try {
      await updateCategory(id, { name: editingCategory.name.trim(), color: editingCategory.color });
      setEditingCategory(null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (error) {
      setCatError(getOperationError(error));
    }
  };

  const handleUpdateTag = async (id: number) => {
    if (!editingTag || !editingTag.name.trim()) return;
    setTagError("");
    try {
      await updateTag(id, { name: editingTag.name.trim(), color: editingTag.color });
      setEditingTag(null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (error) {
      setTagError(getOperationError(error));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t("settings.delete_category_confirm"))) return;
    setCatError("");
    try {
      await deleteCategory(id);
    } catch (error) {
      setCatError(getOperationError(error));
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm(t("settings.delete_tag_confirm"))) return;
    setTagError("");
    try {
      await deleteTag(id);
    } catch (error) {
      setTagError(getOperationError(error));
    }
  };

  const handleReset = () => {
    if (confirm(t("settings.reset_confirm"))) {
      resetApplicationStorage(localStorage);
      window.location.reload();
    }
  };

  return (
    <ProtectedRoute>
       <div className="mx-auto max-w-[1440px] space-y-6 pb-10 text-sm [&_button]:min-h-11 [&_button]:min-w-11 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:rounded-xl [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring [&_button]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-offset-background">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
        </div>

        <div className="grid gap-6">
          {/* Appearance Section */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('settings.appearance')}</CardTitle>
              </div>
              <CardDescription>{t('settings.appearance_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-medium">{t('settings.theme_mode')}</span>
                  <p className="text-xs text-muted-foreground">{t('settings.theme_description')}</p>
                </div>
                <Button variant="outline" aria-label={t('settings.toggle_theme')} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{t('settings.toggle_theme')}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('settings.regional')}</CardTitle>
              </div>
              <CardDescription>{t('settings.regional_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-medium">{t('settings.interface_language')}</span>
                  <p className="text-xs text-muted-foreground">{t('settings.language_description')}</p>
                </div>
                <Select value={i18n.language.startsWith('ru') ? 'ru' : 'en'} onValueChange={(value) => { void i18n.changeLanguage(value); localStorage.setItem('i18nextLng', value); }}>
                  <SelectTrigger aria-label={t('settings.interface_language')} className="w-auto min-w-36 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem className="min-h-11" value="ru">{t('settings.language_ru')}</SelectItem>
                    <SelectItem className="min-h-11" value="en">{t('settings.language_en')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('settings.default_currency')}</span>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('settings.currency_description')}</p>
                </div>
                <Select value={defaultCurrency} onValueChange={(value) => setDefaultCurrency(value as Currency)}>
                  <SelectTrigger aria-label={t('settings.default_currency')} className="w-auto min-w-36 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['USD', 'EUR', 'GBP', 'RUB'] as const).map((currency) => <SelectItem className="min-h-11" key={currency} value={currency}>{t(`settings.currencies.${currency}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Categories and Tags Management */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('settings.classifications')}</CardTitle>
              </div>
              <CardDescription>{t('settings.classifications_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categories */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <LayoutList className="h-4 w-4" /> {t('settings.categories')}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('settings.new_category')}
                    aria-label={t('settings.new_category')}
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory}>{t('common.add')}</Button>
                </div>
                {catError && <p role="alert" className="text-sm text-expense font-medium">{catError}</p>}
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Popover key={cat.id} onOpenChange={(open) => {
                      if (open) setEditingCategory({ id: cat.id, name: cat.name, color: cat.color || '#cccccc' });
                      else setEditingCategory(null);
                    }}>
                      <PopoverTrigger asChild>
                        <button aria-label={t('settings.edit_category_named', { name: cat.name })} className="min-h-11 min-w-11 max-w-full break-words border bg-secondary text-secondary-foreground px-3 py-2 rounded-full text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {cat.name}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-5 space-y-4 shadow-none [&_button]:min-h-11 [&_input]:min-h-11 [&_input]:rounded-xl">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-base flex items-center gap-2"><LayoutList className="w-4 h-4" /> {t('settings.edit_category')}</h4>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              aria-label={t('settings.category_color')}
                              value={editingCategory?.id === cat.id ? editingCategory.color : (cat.color || '#cccccc')}
                              className="w-12 h-11 p-1 cursor-pointer shrink-0"
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, color: e.target.value } : null)}
                            />
                            <Input
                              type="text"
                              aria-label={t('settings.category_name')}
                              value={editingCategory?.id === cat.id ? editingCategory.name : cat.name}
                              className="w-full min-w-0 h-11"
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          </div>
                            <Button
                              size="sm"
                              className="w-full"
                            onClick={() => void handleUpdateCategory(cat.id)}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                        <Separator />
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => void handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> {t('settings.delete_category')}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {categories.length === 0 && <span className="text-xs text-muted-foreground">{t('settings.no_categories')}</span>}
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <TagIcon className="h-4 w-4" /> {t('settings.tags')}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('settings.new_tag')}
                    aria-label={t('settings.new_tag')}
                    value={newTagName} 
                    onChange={(e) => setNewTagName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag}>{t('common.add')}</Button>
                </div>
                {tagError && <p role="alert" className="text-sm text-expense font-medium">{tagError}</p>}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Popover key={tag.id} onOpenChange={(open) => {
                      if (open) setEditingTag({ id: tag.id, name: tag.name, color: tag.color || '#cccccc' });
                      else setEditingTag(null);
                    }}>
                      <PopoverTrigger asChild>
                        <button aria-label={t('settings.edit_tag_named', { name: tag.name })} className="min-h-11 min-w-11 max-w-full break-words border bg-secondary text-secondary-foreground px-3 py-2 rounded-full text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          #{tag.name}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-5 space-y-4 shadow-none [&_button]:min-h-11 [&_input]:min-h-11 [&_input]:rounded-xl">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-base flex items-center gap-2"><TagIcon className="w-4 h-4" /> {t('settings.edit_tag')}</h4>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              aria-label={t('settings.tag_color')}
                              value={editingTag?.id === tag.id ? editingTag.color : (tag.color || '#cccccc')}
                              className="w-12 h-11 p-1 cursor-pointer shrink-0"
                              onChange={(e) => setEditingTag(prev => prev ? { ...prev, color: e.target.value } : null)}
                            />
                            <Input
                              type="text"
                              aria-label={t('settings.tag_name')}
                              value={editingTag?.id === tag.id ? editingTag.name : tag.name}
                              className="w-full min-w-0 h-11"
                              onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          </div>
                          <Button
                            size="sm" 
                            className="w-full" 
                            onClick={() => void handleUpdateTag(tag.id)}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                        <Separator />
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => void handleDeleteTag(tag.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> {t('settings.delete_tag')}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {tags.length === 0 && <span className="text-xs text-muted-foreground">{t('settings.no_tags')}</span>}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('settings.data_management')}</CardTitle>
              </div>
              <CardDescription>{t('settings.data_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-medium text-expense">{t('settings.reset_application')}</span>
                  <p className="text-xs text-muted-foreground">{t('settings.reset_description')}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleReset}>
                  <Trash2 className="mr-2 h-4 w-4" />
                   {t('settings.reset_data')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
