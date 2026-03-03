'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Pencil,
  Utensils,
  Loader2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  FileText,
  Euro,
  Plus,
  ArrowLeft,
  Baby,
  User,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

// --- Types ---

interface MenuDish {
  id?: string;
  menu_id: string;
  name: string;
  description: string;
  ingredients?: string;
  category: string;
  allergens: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  sort_order: number;
}

interface RestaurantMenu {
  id: string;
  name: string;
  description: string;
  price_adult: number;
  price_child: number;
  price_senior: number;
  is_active: boolean;
  sort_order: number;
  dishes?: MenuDish[];
}

// Group dishes by category
function groupByCategory(dishes: MenuDish[]): Record<string, MenuDish[]> {
  const groups: Record<string, MenuDish[]> = {};
  for (const dish of dishes) {
    const cat = dish.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(dish);
  }
  return groups;
}

// Capitalize first letter
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}



export default function RestaurantSettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [menus, setMenus] = useState<RestaurantMenu[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Views: 'list' | 'editor'
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Menu form
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price_adult: 0, price_child: 0, price_senior: 0, is_active: true
  });
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  // Dish/Item form
  const [isDishDialogOpen, setIsDishDialogOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishForm, setDishForm] = useState({
    name: '', description: '', category: 'main'
  });

  // Category Dialog
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Expandable categories in editor
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: menuData, error } = await supabase
        .from('restaurant_menus')
        .select(`*, dishes:menu_dishes(*)`)
        .order('sort_order', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching menus:', error);
      }

      const sortedMenus = (menuData || []).map((m: any) => ({
        ...m,
        price_senior: m.price_senior || 0,
        dishes: (m.dishes || []).sort((a: MenuDish, b: MenuDish) => a.sort_order - b.sort_order)
      }));
      setMenus(sortedMenus);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load menus" });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeMenu = menus.find(m => m.id === activeMenuId);
  const groupedDishes = activeMenu?.dishes ? groupByCategory(activeMenu.dishes) : {};
  const categoryNames = Object.keys(groupedDishes);

  // Initialize expanded categories when menu changes
  useEffect(() => {
    if (categoryNames.length > 0) {
      const expanded: Record<string, boolean> = {};
      categoryNames.forEach(c => expanded[c] = true);
      setExpandedCategories(expanded);
    }
  }, [activeMenuId]);

  // =====================
  // MENU HANDLERS
  // =====================

  const openNewMenu = () => {
    setEditingMenuId(null);
    setMenuForm({ name: '', description: '', price_adult: 0, price_child: 0, price_senior: 0, is_active: true });
    setIsMenuDialogOpen(true);
  };

  const openEditMenu = (menu: RestaurantMenu) => {
    setEditingMenuId(menu.id);
    setMenuForm({
      name: menu.name,
      description: menu.description,
      price_adult: menu.price_adult,
      price_child: menu.price_child,
      price_senior: menu.price_senior || 0,
      is_active: menu.is_active
    });
    setIsMenuDialogOpen(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name.trim()) return toast({ variant: "destructive", title: "Name required" });
    setIsSaving(true);
    try {
      if (editingMenuId) {
        await supabase.from('restaurant_menus').update(menuForm).eq('id', editingMenuId);
      } else {
        await supabase.from('restaurant_menus').insert({ ...menuForm, sort_order: menus.length });
      }
      setIsMenuDialogOpen(false);
      await fetchData();
      toast({ title: "Saved", description: "Menu saved successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      await supabase.from('restaurant_menus').delete().eq('id', id);
      if (activeMenuId === id) { setView('list'); setActiveMenuId(null); }
      await fetchData();
      toast({ title: "Deleted", description: "Menu deleted." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const openMenuEditor = (menuId: string) => {
    setActiveMenuId(menuId);
    setView('editor');
  };

  // =====================
  // DISH / ITEM HANDLERS
  // =====================

  const openNewDish = (category: string) => {
    setEditingDishId(null);
    setDishForm({ name: '', description: '', category });
    setIsDishDialogOpen(true);
  };

  const openEditDish = (dish: MenuDish) => {
    setEditingDishId(dish.id || null);
    setDishForm({ name: dish.name, description: dish.description, category: dish.category });
    setIsDishDialogOpen(true);
  };

  const handleSaveDish = async () => {
    if (!dishForm.name.trim()) return toast({ variant: "destructive", title: "Name required" });
    if (!activeMenuId) return;
    setIsSaving(true);
    try {
      if (editingDishId) {
        await supabase.from('menu_dishes').update({
          name: dishForm.name,
          description: dishForm.description,
          category: dishForm.category
        }).eq('id', editingDishId);
      } else {
        const count = activeMenu?.dishes?.filter(d => d.category === dishForm.category).length || 0;
        await supabase.from('menu_dishes').insert({
          menu_id: activeMenuId,
          name: dishForm.name,
          description: dishForm.description,
          category: dishForm.category,
          allergens: [],
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: false,
          sort_order: count
        });
      }
      setIsDishDialogOpen(false);
      await fetchData();
      toast({ title: "Saved", description: "Item saved." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDish = async (id: string) => {
    try {
      await supabase.from('menu_dishes').delete().eq('id', id);
      await fetchData();
      toast({ title: "Deleted", description: "Item removed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  // =====================
  // CATEGORY HANDLER
  // =====================

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const key = newCategoryName.trim().toLowerCase();
    setExpandedCategories(prev => ({ ...prev, [key]: true }));
    setIsCategoryDialogOpen(false);
    // Open new dish dialog for this category immediately
    setEditingDishId(null);
    setDishForm({ name: '', description: '', category: key });
    setIsDishDialogOpen(true);
    setNewCategoryName('');
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // =====================
  // RENDER
  // =====================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // =====================
  // MENU EDITOR VIEW
  // =====================
  if (view === 'editor' && activeMenu) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{activeMenu.name}</h1>
              <p className="text-sm text-muted-foreground">{activeMenu.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Pricing Badges */}
            <div className="flex gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-[10px] font-bold text-blue-500 uppercase">Kid</span>
                <span className="text-xs font-bold text-blue-700">€{activeMenu.price_child}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Adult</span>
                <span className="text-xs font-bold text-emerald-700">€{activeMenu.price_adult}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-[10px] font-bold text-amber-500 uppercase">Senior</span>
                <span className="text-xs font-bold text-amber-700">€{activeMenu.price_senior || 0}</span>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => openEditMenu(activeMenu)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Menu
            </Button>
            <Button
              size="sm"
              className="bg-[#34C759] hover:bg-[#2DA64D] text-slate-900 font-bold"
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Category
            </Button>
          </div>
        </div>

        {/* Category Columns */}
        {categoryNames.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50/50">
            <Utensils className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-bold text-slate-400">No categories yet</p>
            <p className="text-sm text-slate-400 mt-1">Add a category to start building your menu.</p>
            <Button className="mt-4" onClick={() => setIsCategoryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add First Category
            </Button>
          </div>
        ) : (
          <div className={cn(
            "grid gap-5",
            categoryNames.length === 1 ? "grid-cols-1" :
              categoryNames.length === 2 ? "grid-cols-2" :
                "grid-cols-2 xl:grid-cols-3"
          )}>
            {categoryNames.map(cat => {
              const items = groupedDishes[cat] || [];
              const isExpanded = expandedCategories[cat] !== false;

              return (
                <div
                  key={cat}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Category Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 cursor-pointer select-none"
                    onClick={() => toggleCategory(cat)}
                  >
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                        {capitalize(cat)}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={(e) => { e.stopPropagation(); openNewDish(cat); }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs font-bold">Item</span>
                      </Button>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Items List */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-50">
                      {items.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-slate-400">No items yet.</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-xs text-emerald-600 hover:bg-emerald-50"
                            onClick={() => openNewDish(cat)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Item
                          </Button>
                        </div>
                      ) : (
                        items.map(dish => (
                          <div
                            key={dish.id}
                            className="group flex items-start justify-between px-4 py-2.5 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 leading-snug truncate">
                                {dish.name}
                              </p>
                              {dish.description && (
                                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                                  {dish.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                onClick={() => openEditDish(dish)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-500"
                                onClick={() => handleDeleteDish(dish.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===================== DIALOGS ===================== */}

        {/* Add Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-bold">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="e.g. Starters, Mains, Desserts"
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                autoFocus
              />
              <p className="text-[10px] text-slate-400">
                After creating the category, you can add items to it.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Create Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add / Edit Dish Dialog */}
        <Dialog open={isDishDialogOpen} onOpenChange={setIsDishDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDishId ? 'Edit Item' : 'New Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Name</Label>
                <Input
                  value={dishForm.name}
                  onChange={e => setDishForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Grilled Sea Bass"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={dishForm.description}
                  onChange={e => setDishForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the dish..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Category: <strong className="text-slate-600">{capitalize(dishForm.category)}</strong></span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveDish} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDishId ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Menu Dialog */}
        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMenuId ? 'Edit Menu' : 'New Menu'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Menu Name</Label>
                <Input
                  value={menuForm.name}
                  onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Lunch Menu, Dinner Menu"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={menuForm.description}
                  onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* 3-Tier Pricing */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pricing per Person
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Baby className="h-3.5 w-3.5 text-blue-500" />
                      <Label className="text-xs font-bold text-blue-600">Kid</Label>
                    </div>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={menuForm.price_child}
                        onChange={e => setMenuForm(p => ({ ...p, price_child: Number(e.target.value) }))}
                        className="pl-8 h-9 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      <Label className="text-xs font-bold text-emerald-700">Adult</Label>
                    </div>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={menuForm.price_adult}
                        onChange={e => setMenuForm(p => ({ ...p, price_adult: Number(e.target.value) }))}
                        className="pl-8 h-9 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                      <Label className="text-xs font-bold text-amber-700">Senior</Label>
                    </div>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={menuForm.price_senior}
                        onChange={e => setMenuForm(p => ({ ...p, price_senior: Number(e.target.value) }))}
                        className="pl-8 h-9 text-sm font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Visible on Website</Label>
                <Switch
                  checked={menuForm.is_active}
                  onCheckedChange={c => setMenuForm(p => ({ ...p, is_active: c }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveMenu} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Menu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =====================
  // MENU LIST VIEW (Default)
  // =====================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Restaurant Menus</h1>
          <p className="text-sm text-muted-foreground">Create and manage your set menus with categories, items, and pricing.</p>
        </div>
        <Button
          onClick={openNewMenu}
          className="bg-[#34C759] hover:bg-[#2DA64D] text-slate-900 font-bold rounded-lg shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Menu Page
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-slate-50/50">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-400">No menus created yet.</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Menu Page" to create your first menu.</p>
          <Button onClick={openNewMenu} className="mt-6">
            <Plus className="h-4 w-4 mr-2" /> Create First Menu
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {menus.map(menu => {
            const dishCount = menu.dishes?.length || 0;
            const categoryCount = menu.dishes ? Object.keys(groupByCategory(menu.dishes)).length : 0;

            return (
              <div
                key={menu.id}
                className={cn(
                  "group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer",
                  menu.is_active ? "border-slate-200" : "border-slate-100 opacity-70"
                )}
                onClick={() => openMenuEditor(menu.id)}
              >
                {/* Color bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  menu.is_active ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-slate-200"
                )} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">{menu.name}</h3>
                      {menu.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{menu.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openEditMenu(menu); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={e => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{menu.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete this menu and all its items.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMenu(menu.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="font-semibold">{categoryCount} categories</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Utensils className="h-3.5 w-3.5" />
                      <span className="font-semibold">{dishCount} items</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Kid</span>
                      <span className="text-sm font-black text-blue-700">€{menu.price_child}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Adult</span>
                      <span className="text-sm font-black text-emerald-700">€{menu.price_adult}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <span className="text-[10px] font-bold text-amber-600 uppercase">Senior</span>
                      <span className="text-sm font-black text-amber-700">€{menu.price_senior || 0}</span>
                    </div>
                  </div>
                </div>

                {!menu.is_active && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="text-[10px] font-bold">Hidden</Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Menu Dialog (for list view) */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMenuId ? 'Edit Menu' : 'New Menu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Menu Name</Label>
              <Input
                value={menuForm.name}
                onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Lunch Menu, Dinner Menu"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description</Label>
              <Textarea
                value={menuForm.description}
                onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description..."
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pricing per Person
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-blue-600">Kid (€)</Label>
                  </div>
                  <div className="relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={menuForm.price_child}
                      onChange={e => setMenuForm(p => ({ ...p, price_child: Number(e.target.value) }))}
                      className="pl-8 h-9 text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-emerald-700">Adult (€)</Label>
                  </div>
                  <div className="relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={menuForm.price_adult}
                      onChange={e => setMenuForm(p => ({ ...p, price_adult: Number(e.target.value) }))}
                      className="pl-8 h-9 text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-amber-700">Senior (€)</Label>
                  </div>
                  <div className="relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={menuForm.price_senior}
                      onChange={e => setMenuForm(p => ({ ...p, price_senior: Number(e.target.value) }))}
                      className="pl-8 h-9 text-sm font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">Visible on Website</Label>
              <Switch
                checked={menuForm.is_active}
                onCheckedChange={c => setMenuForm(p => ({ ...p, is_active: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveMenu} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
