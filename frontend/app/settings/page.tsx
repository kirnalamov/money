"use client"

import ProtectedRoute from "@/components/auth/protected-route";

import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Globe, Coins, Database, Trash2, Tags, Tag as TagIcon, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { categories, tags, addCategory, updateCategory, deleteCategory, addTag, updateTag, deleteTag } = useStore();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [catError, setCatError] = useState("");
  const [tagError, setTagError] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);


  const handleAddCategory = async () => {
    setCatError("");
    if (newCategoryName.trim()) {
      try {
        await addCategory({ name: newCategoryName.trim() });
        setNewCategoryName("");
      } catch (e: any) {
        setCatError("Failed to add category. Please try again.");
      }
    }
  };

  const handleAddTag = async () => {
  	setTagError("");
    if (newTagName.trim()) {
      try {
        await addTag({ name: newTagName.trim() });
        setNewTagName("");
      } catch (e: any) {
        setTagError("Failed to add tag. Please try again.");
      }
    }
  };

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

          {/* Categories and Tags Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                <CardTitle>Custom Classifications</CardTitle>
              </div>
              <CardDescription>Manage your custom categories and tags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categories */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <LayoutList className="h-4 w-4" /> Categories
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="New category name..." 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory}>Add</Button>
                </div>
                {catError && <p className="text-sm text-destructive font-medium">{catError}</p>}
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Popover key={cat.id} onOpenChange={(open) => {
                      if (open) setEditingCategory({ id: cat.id, name: cat.name, color: cat.color || '#cccccc' });
                      else setEditingCategory(null);
                    }}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50">
                          <div className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: cat.color || '#cccccc' }} />
                          {cat.name}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 space-y-4 shadow-xl">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2"><LayoutList className="w-4 h-4" /> Edit Category</h4>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={editingCategory?.id === cat.id ? editingCategory.color : (cat.color || '#cccccc')}
                              className="w-12 h-10 p-1 cursor-pointer shrink-0"
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, color: e.target.value } : null)}
                            />
                            <Input
                              type="text"
                              value={editingCategory?.id === cat.id ? editingCategory.name : cat.name}
                              className="w-full h-10"
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => {
                              if (editingCategory && editingCategory.name.trim()) {
                                updateCategory(cat.id, { name: editingCategory.name.trim(), color: editingCategory.color });
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Close popover
                              }
                            }}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                        <Separator />
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Category
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {categories.length === 0 && <span className="text-xs text-muted-foreground">No custom categories.</span>}
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <TagIcon className="h-4 w-4" /> Tags
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="New tag name..." 
                    value={newTagName} 
                    onChange={(e) => setNewTagName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag}>Add</Button>
                </div>
                {tagError && <p className="text-sm text-destructive font-medium">{tagError}</p>}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Popover key={tag.id} onOpenChange={(open) => {
                      if (open) setEditingTag({ id: tag.id, name: tag.name, color: tag.color || '#cccccc' });
                      else setEditingTag(null);
                    }}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50">
                          <div className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: tag.color || '#cccccc' }} />
                          #{tag.name}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 space-y-4 shadow-xl">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2"><TagIcon className="w-4 h-4" /> Edit Tag</h4>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={editingTag?.id === tag.id ? editingTag.color : (tag.color || '#cccccc')}
                              className="w-12 h-10 p-1 cursor-pointer shrink-0"
                              onChange={(e) => setEditingTag(prev => prev ? { ...prev, color: e.target.value } : null)}
                            />
                            <Input
                              type="text"
                              value={editingTag?.id === tag.id ? editingTag.name : tag.name}
                              className="w-full h-10"
                              onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => {
                              if (editingTag && editingTag.name.trim()) {
                                updateTag(tag.id, { name: editingTag.name.trim(), color: editingTag.color });
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Close popover
                              }
                            }}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                        <Separator />
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteTag(tag.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Tag
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {tags.length === 0 && <span className="text-xs text-muted-foreground">No custom tags.</span>}
                </div>
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
