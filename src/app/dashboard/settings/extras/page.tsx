'use client';

import { useState, useMemo, useEffect } from 'react';
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
  DialogClose,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2, Pencil, Puzzle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabase } from '@/components/providers/supabase-provider';

// Type
type Extra = {
  id?: string;
  name: string;
  description: string;
  price: number;
  type: 'houseboat' | 'daily-travel' | 'restaurant' | 'all';
  price_type?: 'per_stay' | 'per_day' | 'per_person';
};

const DEFAULT_EXTRA: Extra = {
  name: '',
  description: '',
  price: 0,
  type: 'all',
  price_type: 'per_stay'
};

export default function ExtrasSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [extraState, setExtraState] = useState<Extra>(DEFAULT_EXTRA);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExtras = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('extras').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load extras." });
    } else {
      setExtras(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExtras();
  }, [supabase]);


  const openNewDialog = () => {
    setEditingExtra(null);
    setExtraState(DEFAULT_EXTRA);
    setIsDialogOpen(true);
  };

  const openEditDialog = (extra: Extra) => {
    setEditingExtra(extra);
    setExtraState(extra);
    setIsDialogOpen(true);
  };

  const handleDelete = async (extraId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('extras').delete().eq('id', extraId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Extra deleted.' });
      fetchExtras();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete extra.',
      });
    }
  };

  const handleSave = async () => {
    if (!supabase || !extraState.name) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Extra name is required.',
      });
      return;
    }

    try {
      if (editingExtra?.id) {
        // Update
        const { error } = await supabase.from('extras').update({
          name: extraState.name,
          description: extraState.description,
          price: extraState.price,
          type: extraState.type,
          price_type: extraState.price_type
        }).eq('id', editingExtra.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Extra updated.' });
      } else {
        // Create
        const { error } = await supabase.from('extras').insert({
          name: extraState.name,
          description: extraState.description,
          price: extraState.price,
          type: extraState.type,
          price_type: extraState.price_type
        });
        if (error) throw error;
        toast({ title: 'Success', description: 'Extra created.' });
      }
      setIsDialogOpen(false);
      fetchExtras();
    } catch (error) {
      console.error('Failed to save extra:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save extra.',
      });
    }
  };

  const handleInputChange = (
    field: keyof Extra,
    value: string | number
  ) => {
    setExtraState(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Extras Control
            </CardTitle>
            <CardDescription>
              Manage optional add-ons and extra services available for booking.
            </CardDescription>
          </div>
          <Button onClick={openNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Extra
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-4">
              {extras?.map(extra => (
                <Card key={extra.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                  <div className="flex-grow">
                    <CardTitle className="text-base font-semibold">{extra.name}</CardTitle>
                    <CardDescription>{extra.description}</CardDescription>
                  </div>
                  <div className="text-right px-4">
                    <p className="font-semibold">€{Number(extra.price).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{extra.type} • {extra.price_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(extra)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{extra.name}"
                            extra.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(extra.id!)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
              {extras?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                  <Puzzle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold text-muted-foreground">
                    No extras created yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add New Extra" to get started.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExtra ? 'Edit Extra' : 'Add New Extra'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extra-name">Name</Label>
              <Input
                id="extra-name"
                value={extraState.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="e.g., Welcome Basket"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-desc">Description</Label>
              <Textarea
                id="extra-desc"
                value={extraState.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="A short description of what's included."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extra-price">Price (€)</Label>
                <Input
                  id="extra-price"
                  type="number"
                  value={extraState.price}
                  onChange={e => handleInputChange('price', Number(e.target.value))}
                  placeholder="e.g., 25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-price-type">Price Model</Label>
                <Select
                  value={extraState.price_type}
                  onValueChange={(value) => handleInputChange('price_type', value)}
                >
                  <SelectTrigger id="extra-price-type">
                    <SelectValue placeholder="Price Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_stay">Per Stay</SelectItem>
                    <SelectItem value="per_day">Per Day</SelectItem>
                    <SelectItem value="per_person">Per Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="extra-type">Applicable To</Label>
                <Select
                  value={extraState.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger id="extra-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Booking Types</SelectItem>
                    <SelectItem value="houseboat">Houseboat</SelectItem>
                    <SelectItem value="daily_travel">Daily Travel</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Extra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
