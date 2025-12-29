'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  getDocs,
  setDoc,
  addDoc,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Utensils,
  PlusCircle,
  Trash2,
  Pencil,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { suggestRestaurantMenuDescriptions } from '@/ai/flows/suggest-restaurant-menu-descriptions';

// Types
type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  ingredients?: string;
};

type MenuCategory = {
  id: string;
  name:string;
  order: number;
  items: MenuItem[];
};

export default function RestaurantSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<MenuCategory | null>(null);

  const menuQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'restaurant_menu'), orderBy('order'));
  }, [firestore]);

  // Fetch all data initially
  useEffect(() => {
    if (!firestore) return;
    setIsLoading(true);
    
    const fetchData = async () => {
      try {
        const categorySnap = await getDocs(query(collection(firestore, 'restaurant_menu'), orderBy('order')));
        const fetchedCategories: Omit<MenuCategory, 'items'>[] = categorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<MenuCategory, 'items'>));
        
        const categoriesWithItems: MenuCategory[] = [];
        for (const cat of fetchedCategories) {
          const itemsSnap = await getDocs(query(collection(firestore, `restaurant_menu/${cat.id}/items`)));
          const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
          categoriesWithItems.push({ ...cat, items });
        }
        
        setCategories(categoriesWithItems);
      } catch (error) {
        console.error("Failed to fetch menu:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not load the menu data." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, toast]);


  // Category Dialog
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
    if (!firestore || !categoryName) return;
    try {
      if (editingCategory) {
        // Update
        const catRef = doc(firestore, 'restaurant_menu', editingCategory.id);
        await setDoc(catRef, { name: categoryName }, { merge: true });
        toast({ title: 'Category Updated' });
         setCategories(cats => cats.map(c => c.id === editingCategory.id ? {...c, name: categoryName} : c));
      } else {
        // Create
        const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
        const newCatRef = doc(collection(firestore, 'restaurant_menu'));
        await setDoc(newCatRef, { name: categoryName, order: newOrder });
        toast({ title: 'Category Added' });
        setCategories(cats => [...cats, {id: newCatRef.id, name: categoryName, order: newOrder, items: []}]);
      }
      setIsCategoryDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error saving category' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!firestore) return;
    try {
      // Note: This doesn't delete subcollections. For a production app, a Cloud Function would be needed.
      await deleteDoc(doc(firestore, 'restaurant_menu', categoryId));
      toast({ title: 'Category Deleted' });
      setCategories(cats => cats.filter(c => c.id !== categoryId));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error deleting category' });
    }
  };

  // Item Dialog
  const openNewItemDialog = (categoryId: string) => {
    setEditingItem(null);
    setCurrentItem({ name: '', description: '', price: '€' });
    setActiveCategoryId(categoryId);
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: MenuItem, categoryId: string) => {
    setEditingItem(item);
    setCurrentItem(item);
    setActiveCategoryId(categoryId);
    setIsItemDialogOpen(true);
  };
  
  const handleItemChange = (field: keyof MenuItem, value: string) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveItem = async () => {
    if (!firestore || !activeCategoryId || !currentItem.name || !currentItem.price) return;

    const dataToSave = { ...currentItem };
    
    try {
        const collectionRef = collection(firestore, `restaurant_menu/${activeCategoryId}/items`);
        if (editingItem?.id) {
            // Update
            const itemRef = doc(collectionRef, editingItem.id);
            await setDoc(itemRef, dataToSave, { merge: true });
            toast({ title: 'Item Updated' });
            setCategories(cats => cats.map(c => c.id === activeCategoryId ? {...c, items: c.items.map(i => i.id === editingItem.id ? { ...i, ...dataToSave } as MenuItem : i)} : c));
        } else {
            // Create
            const newItemRef = doc(collectionRef);
            await setDoc(newItemRef, dataToSave);
            toast({ title: 'Item Added' });
            const newItem = { id: newItemRef.id, ...dataToSave } as MenuItem;
            setCategories(cats => cats.map(c => c.id === activeCategoryId ? {...c, items: [...c.items, newItem]} : c));
        }
        setIsItemDialogOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error saving item' });
        console.error(e);
    }
  };

  const handleDeleteItem = async (itemId: string, categoryId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, `restaurant_menu/${categoryId}/items`, itemId));
      toast({ title: 'Item Deleted' });
       setCategories(cats => cats.map(c => c.id === categoryId ? {...c, items: c.items.filter(i => i.id !== itemId)} : c));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error deleting item' });
    }
  };
  
  const handleGenerateDescription = async () => {
      if (!currentItem.name || !currentItem.ingredients) {
          toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide a dish name and some ingredients first.' });
          return;
      }
      setIsGenerating(true);
      try {
          const result = await suggestRestaurantMenuDescriptions({
              dishName: currentItem.name,
              ingredients: currentItem.ingredients,
              cuisineStyle: 'Portuguese / Mediterranean'
          });
          setCurrentItem(prev => ({...prev, description: result.description}));
          toast({title: 'Description generated!'});
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error generating description' });
      } finally {
          setIsGenerating(false);
      }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, category: MenuCategory) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetCategory: MenuCategory) => {
    e.preventDefault();
    if (!draggedItem || !firestore) return;
    
    const draggedIndex = categories.findIndex(c => c.id === draggedItem.id);
    const targetIndex = categories.findIndex(c => c.id === targetCategory.id);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);
    
    setCategories(newCategories);

    try {
      const batch = writeBatch(firestore);
      newCategories.forEach((cat, index) => {
        const catRef = doc(firestore, 'restaurant_menu', cat.id);
        batch.update(catRef, { order: index });
      });
      await batch.commit();
      toast({ title: 'Menu order updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to update order' });
      // Revert UI on failure
      setCategories(categories); 
    } finally {
      setDraggedItem(null);
    }
  };


  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Restaurant Control
            </CardTitle>
            <CardDescription>
              Manage restaurant menu items and categories.
            </CardDescription>
          </div>
           <Button onClick={openNewCategoryDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : categories.length > 0 ? (
            <div className="space-y-8">
              {categories.map(category => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category)}
                  className="p-1 rounded-lg transition-shadow"
                >
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <div className="flex items-center gap-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            <h3 className="text-2xl font-semibold text-primary">{category.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openNewItemDialog(category.id)}>Add Item</Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditCategoryDialog(category)}><Pencil className="h-4 w-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the category and all items within it.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                     <div className="space-y-4 pl-8">
                        {category.items.map(item => (
                            <Card key={item.id} className="p-4 flex items-start justify-between shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-muted-foreground max-w-lg">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-2 pl-4">
                                    <p className="font-semibold whitespace-nowrap">{item.price}</p>
                                    <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item, category.id)}><Pencil className="h-4 w-4"/></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem(item.id, category.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </Card>
                        ))}
                         {category.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items in this category yet.</p>}
                     </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-dashed">
                <p className="text-muted-foreground">No menu categories created yet.</p>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit' : 'New'} Menu Category</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input id="category-name" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g., Appetizers" />
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleSaveCategory}>Save Category</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Item Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit' : 'New'} Menu Item</DialogTitle>
              </DialogHeader>
              <div className="py-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                     <Label htmlFor="item-name">Item Name</Label>
                     <Input id="item-name" value={currentItem.name || ''} onChange={e => handleItemChange('name', e.target.value)} placeholder="e.g., Grilled Octopus" />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="item-price">Price</Label>
                     <Input id="item-price" value={currentItem.price || ''} onChange={e => handleItemChange('price', e.target.value)} placeholder="e.g., €24.50" />
                  </div>
                   <div className="space-y-2">
                     <Label htmlFor="item-ingredients">Primary Ingredients</Label>
                     <Input id="item-ingredients" value={currentItem.ingredients || ''} onChange={e => handleItemChange('ingredients', e.target.value)} placeholder="e.g., octopus, potato, olive oil, garlic" />
                  </div>
                   <div className="col-span-2 space-y-2">
                     <Label htmlFor="item-description">Description</Label>
                     <Textarea id="item-description" value={currentItem.description || ''} onChange={e => handleItemChange('description', e.target.value)} placeholder="A short, enticing description of the dish." />
                     <Button variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}><Sparkles className="mr-2 h-4 w-4"/> {isGenerating ? 'Generating...' : 'Suggest with AI'}</Button>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleSaveItem}>Save Item</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
