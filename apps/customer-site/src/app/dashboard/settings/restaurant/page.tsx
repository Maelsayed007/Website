'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Trash2,
  Pencil,
  GripVertical,
  Sparkles,
  Utensils,
  Layers,
  Save,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogClose
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { RestaurantMenuPackage } from '@/lib/types';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  ingredients: string;
  category_id: string;
  order_index: number;
}

interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  items: MenuItem[];
}

export default function RestaurantSettingsPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [packages, setPackages] = useState<RestaurantMenuPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<RestaurantMenuPackage | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>({});
  const [currentPackage, setCurrentPackage] = useState<Partial<RestaurantMenuPackage>>({
    prices: { adult: 0, child: 0 },
    is_active: true
  });
  const [draggedCategory, setDraggedCategory] = useState<MenuCategory | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch categories and items
      const { data: catData, error: catError } = await supabase
        .from('restaurant_menu_categories')
        .select(`
          *,
          items:restaurant_menu_items(*)
        `)
        .order('order_index');

      if (catError) throw catError;

      // Sort items within each category
      const sortedCategories = (catData || []).map(cat => ({
        ...cat,
        items: (cat.items || []).sort((a: MenuItem, b: MenuItem) => a.order_index - b.order_index)
      }));

      setCategories(sortedCategories);

      // Fetch menu packages
      const { data: pkgData, error: pkgError } = await supabase
        .from('restaurant_menu_packages')
        .select('*')
        .order('created_at');

      if (pkgError && pkgError.code !== 'PGRST116') {
        // Table might not exist yet if migration wasn't run
        console.warn('Could not fetch packages. Table might not exist.', pkgError);
      } else {
        setPackages(pkgData || []);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load restaurant data" });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category Handlers
  const openNewCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Category name is required" });
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('restaurant_menu_categories')
          .update({ name: categoryName })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({ title: "Success", description: "Category updated" });
      } else {
        const { error } = await supabase
          .from('restaurant_menu_categories')
          .insert({ name: categoryName, order_index: categories.length });
        if (error) throw error;
        toast({ title: "Success", description: "Category created" });
      }
      setIsCategoryDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('restaurant_menu_categories').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Category deleted" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  // Item Handlers
  const openNewItemDialog = (categoryId: string) => {
    setEditingItem(null);
    setCurrentItem({ category_id: categoryId, name: '', description: '', price: '', ingredients: '' });
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: MenuItem, categoryId: string) => {
    setEditingItem(item);
    setCurrentItem({ ...item });
    setIsItemDialogOpen(true);
  };

  const handleItemChange = (field: keyof MenuItem, value: string) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveItem = async () => {
    if (!currentItem.name?.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Item name is required" });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('restaurant_menu_items')
          .update({
            name: currentItem.name,
            description: currentItem.description,
            price: currentItem.price,
            ingredients: currentItem.ingredients
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: "Success", description: "Item updated" });
      } else {
        // Get current items in category to set order_index
        const category = categories.find(c => c.id === currentItem.category_id);
        const orderIndex = category?.items?.length || 0;

        const { error } = await supabase
          .from('restaurant_menu_items')
          .insert({
            ...currentItem as any,
            order_index: orderIndex
          });
        if (error) throw error;
        toast({ title: "Success", description: "Item created" });
      }
      setIsItemDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeleteItem = async (id: string, categoryId: string) => {
    try {
      const { error } = await supabase.from('restaurant_menu_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Item deleted" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleGenerateDescription = async () => {
    if (!currentItem.name) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a dish name first" });
      return;
    }

    setIsGenerating(true);
    try {
      // Mock AI generation for now - in production this would call your AI endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      const ingredients = currentItem.ingredients ? ` featuring ${currentItem.ingredients}` : '';
      const description = `${currentItem.name} is a culinary masterpiece${ingredients}, prepared with traditional techniques and the freshest local ingredients for an unforgettable experience.`;
      handleItemChange('description', description);
      toast({ title: "Success", description: "Description generated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate description" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Package Handlers
  const openNewPackageDialog = () => {
    setEditingPackage(null);
    setCurrentPackage({
      name: '',
      description: '',
      prices: { adult: 0, child: 0 },
      is_active: true
    });
    setIsPackageDialogOpen(true);
  };

  const openEditPackageDialog = (pkg: RestaurantMenuPackage) => {
    setEditingPackage(pkg);
    setCurrentPackage({ ...pkg });
    setIsPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    if (!currentPackage.name?.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Package name is required" });
      return;
    }

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from('restaurant_menu_packages')
          .update(currentPackage)
          .eq('id', editingPackage.id);
        if (error) throw error;
        toast({ title: "Success", description: "Package updated" });
      } else {
        const { error } = await supabase
          .from('restaurant_menu_packages')
          .insert(currentPackage);
        if (error) throw error;
        toast({ title: "Success", description: "Package created" });
      }
      setIsPackageDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      const { error } = await supabase.from('restaurant_menu_packages').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Package deleted" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, category: MenuCategory) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: MenuCategory) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

    const newCategories = [...categories];
    const draggedIndex = newCategories.findIndex(c => c.id === draggedCategory.id);
    const targetIndex = newCategories.findIndex(c => c.id === targetCategory.id);

    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedCategory);

    // Update state immediately for smooth UI
    setCategories(newCategories.map((c, i) => ({ ...c, order_index: i })));

    // Save to DB
    try {
      const updates = newCategories.map((c, i) => ({
        id: c.id,
        name: c.name,
        order_index: i
      }));

      const { error } = await supabase.from('restaurant_menu_categories').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save new order" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Restaurant Management</h1>
        <p className="text-muted-foreground">Configure your menu categories, items, and pricing strategies.</p>
      </div>

      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="menu" className="rounded-lg font-bold data-[state=active]:bg-white">
            Categories & Items
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-lg font-bold data-[state=active]:bg-white">
            Menu Packages (Pricing)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-4">
          <Card className="border-none overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-primary" />
                  Menu Categories
                </CardTitle>
                <CardDescription>Drag and drop to reorder categories</CardDescription>
              </div>
              <Button onClick={openNewCategoryDialog} className="rounded-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
              ) : categories.length > 0 ? (
                <div className="space-y-10">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, category)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, category)}
                      className="group relative animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className="flex justify-between items-center mb-6 pl-2 border-l-4 border-primary/20 hover:border-primary transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 cursor-grab active:cursor-grabbing text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold tracking-tight text-slate-800">{category.name}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{category.items?.length || 0} items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openNewItemDialog(category.id)} className="rounded-full">
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Item
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditCategoryDialog(category)} className="rounded-full">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{category.name}" and all menu items within it.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete Category
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                        {category.items?.map(item => (
                          <Card key={item.id} className="group/item border border-slate-200/60 hover:border-primary/30 transition-all hover:-translate-y-0.5 overflow-hidden">
                            <div className="p-4 flex flex-col justify-between h-full">
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-slate-800 group-hover/item:text-primary transition-colors">{item.name}</h4>
                                  <span className="text-sm font-black bg-slate-100 px-2 py-0.5 rounded text-slate-700">{item.price}</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2 italic">"{item.description}"</p>
                                {item.ingredients && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-2 py-1 rounded w-fit">
                                    <span className="font-bold uppercase">Base:</span>
                                    <span>{item.ingredients}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end gap-1 mt-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item, category.id)} className="h-8 w-8 rounded-full">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Dish?</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure you want to remove "{item.name}" from the menu?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteItem(item.id, category.id)} className="bg-destructive hover:bg-destructive/90">Delete dish</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {category.items?.length === 0 && (
                          <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-sm text-muted-foreground">No dishes in this category yet.</p>
                            <Button variant="link" size="sm" onClick={() => openNewItemDialog(category.id)}>Add your first dish</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl gap-4">
                  <div className="p-4 flex items-center justify-center">
                    <Utensils className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-600">No categories found</p>
                    <p className="text-sm text-slate-400">Create a category to start building your menu.</p>
                  </div>
                  <Button onClick={openNewCategoryDialog} className="rounded-full">Create First Category</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Card className="border-none overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Menu Packages
                </CardTitle>
                <CardDescription>Setup price-per-person packages for easy billing</CardDescription>
              </div>
              <Button onClick={openNewPackageDialog} className="rounded-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Package
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                </div>
              ) : packages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map(pkg => (
                    <Card key={pkg.id} className="group border-2 border-slate-100 hover:border-primary/30 transition-all overflow-hidden rounded-2xl">
                      {!pkg.is_active && (
                        <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 border border-amber-200">
                          HIDDEN
                        </div>
                      )}
                      <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-xl text-slate-800 leading-tight mb-1">{pkg.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{pkg.description}"</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditPackageDialog(pkg)} className="h-8 w-8 rounded-full">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Package?</AlertDialogTitle>
                                  <AlertDialogDescription>This will remove the "{pkg.name}" pricing model.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePackage(pkg.id)} className="bg-destructive hover:bg-destructive/90">Delete Package</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 hover:bg-white transition-all text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Adult</p>
                            <div className="flex items-baseline justify-center gap-0.5">
                              <span className="text-sm font-bold text-primary/70">€</span>
                              <span className="text-2xl font-black text-primary">{pkg.prices.adult}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 hover:bg-white transition-all text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Child</p>
                            <div className="flex items-baseline justify-center gap-0.5">
                              <span className="text-sm font-bold text-primary/70">€</span>
                              <span className="text-2xl font-black text-primary">{pkg.prices.child}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 pt-2 opacity-60">
                          <Info className="h-3 w-3" />
                          <span>Assign to guests in reservations</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <button
                    onClick={openNewPackageDialog}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="p-3 bg-slate-50 rounded-full mb-3 group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                      <PlusCircle className="h-6 w-6 text-slate-300 group-hover:text-primary" />
                    </div>
                    <span className="font-bold text-slate-500 group-hover:text-primary">Add New Package</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl gap-4">
                  <div className="p-4 bg-slate-50 rounded-full">
                    <Layers className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-600">No packages defined</p>
                    <p className="text-sm text-slate-400">Add common menu packages like "Standard Lunch" or "Buffet".</p>
                  </div>
                  <Button onClick={openNewPackageDialog}>Create First Package</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {editingCategory ? 'Edit' : 'New'} Menu Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name" className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Category Name
              </Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                placeholder="e.g., Starters, Main Course, Drinks"
                className="h-12 text-lg focus-visible:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-lg">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveCategory} className="rounded-full px-8">
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-50/80 p-6 border-b">
            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800">
              {editingItem ? 'Edit Dish' : 'Add New Dish'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 grid grid-cols-2 gap-8">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="item-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dish Name</Label>
              <Input
                id="item-name"
                value={currentItem.name || ''}
                onChange={e => handleItemChange('name', e.target.value)}
                placeholder="What's for dinner?"
                className="h-12 text-lg focus-visible:ring-primary bg-slate-50/50"
              />
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="item-price" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Internal Price / Ref</Label>
                <div className="relative">
                  <Input
                    id="item-price"
                    value={currentItem.price || ''}
                    onChange={e => handleItemChange('price', e.target.value)}
                    placeholder="€24.00"
                    className="pl-8 h-12 font-bold bg-slate-50/50"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-ingredients" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Ingredient / Note</Label>
                <Input
                  id="item-ingredients"
                  value={currentItem.ingredients || ''}
                  onChange={e => handleItemChange('ingredients', e.target.value)}
                  placeholder="e.g., fresh octopus, wild herbs"
                  className="h-12 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="item-description" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Menu Description</Label>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || !currentItem.name}
                  className="h-auto p-0 text-[10px] font-bold uppercase tracking-tight"
                >
                  {isGenerating ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Generate AI
                </Button>
              </div>
              <Textarea
                id="item-description"
                value={currentItem.description || ''}
                onChange={e => handleItemChange('description', e.target.value)}
                placeholder="Describe this dish to your guests..."
                className="min-h-[148px] resize-none bg-slate-50/50 leading-relaxed italic"
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveItem} className="rounded-full px-10 bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Save Dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent className="sm:max-w-[480px] overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-50/80 p-6 border-b">
            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {editingPackage ? 'Edit Package' : 'New Pricing Package'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-2">
              <Label htmlFor="pkg-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Package Name</Label>
              <Input
                id="pkg-name"
                value={currentPackage.name || ''}
                onChange={e => setCurrentPackage(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Lunch Menu"
                className="h-12 text-lg focus-visible:ring-primary bg-slate-50/50 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Short Description</Label>
              <Textarea
                id="pkg-desc"
                value={currentPackage.description || ''}
                onChange={e => setCurrentPackage(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Include what's typically included in this price..."
                className="min-h-[80px] bg-slate-50/50 resize-none"
              />
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border-2 border-slate-100 flex flex-col gap-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-center text-slate-400">Pricing Strategy (€)</p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="pkg-adult" className="text-[10px] font-bold text-slate-500 pl-1 uppercase">Adult Price</Label>
                  <div className="relative">
                    <Input
                      id="pkg-adult"
                      type="number"
                      value={currentPackage.prices?.adult || 0}
                      onChange={e => setCurrentPackage(prev => ({ ...prev, prices: { ...prev.prices!, adult: Number(e.target.value) } }))}
                      className="h-14 text-2xl font-black pl-8 bg-white"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold italic">€</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-child" className="text-[10px] font-bold text-slate-500 pl-1 uppercase">Child Price</Label>
                  <div className="relative">
                    <Input
                      id="pkg-child"
                      type="number"
                      value={currentPackage.prices?.child || 0}
                      onChange={e => setCurrentPackage(prev => ({ ...prev, prices: { ...prev.prices!, child: Number(e.target.value) } }))}
                      className="h-14 text-2xl font-black pl-8 shadow-sm bg-white text-primary"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold italic">€</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
              <Info className="h-4 w-4 text-blue-500" />
              <p className="text-[10px] text-blue-700 font-medium">This package will be available for selection when making reservations.</p>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full px-6">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePackage} className="rounded-full px-10 shadow-lg shadow-primary/20">
              {editingPackage ? 'Update Strategy' : 'Create Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
