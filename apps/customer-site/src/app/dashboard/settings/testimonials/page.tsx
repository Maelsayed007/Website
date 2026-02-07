'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
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
import { PlusCircle, Trash2, Pencil, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Type
type Testimonial = {
  id?: string;
  name: string;
  content: string;
  rating: number;
};

const DEFAULT_TESTIMONIAL: Testimonial = {
  name: '',
  content: '',
  rating: 5,
};

export default function TestimonialsSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialState, setTestimonialState] = useState<Testimonial>(DEFAULT_TESTIMONIAL);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTestimonials = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
    if (data) setTestimonials(data as Testimonial[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTestimonials();

    if (!supabase) return;
    const channel = supabase.channel('testimonials_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => fetchTestimonials())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const openNewDialog = () => {
    setEditingTestimonial(null);
    setTestimonialState(DEFAULT_TESTIMONIAL);
    setIsDialogOpen(true);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialState(testimonial);
    setIsDialogOpen(true);
  };

  const handleDelete = async (testimonialId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', testimonialId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Testimonial deleted.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete testimonial.',
      });
    }
  };

  const handleSave = async () => {
    if (!supabase || !testimonialState.name || !testimonialState.content) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and quote are required.',
      });
      return;
    }

    try {
      if (editingTestimonial?.id) {
        const { error } = await supabase.from('testimonials').update(testimonialState).eq('id', editingTestimonial.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Testimonial updated.' });
      } else {
        const { error } = await supabase.from('testimonials').insert([testimonialState]);
        if (error) throw error;
        toast({ title: 'Success', description: 'Testimonial created.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save testimonial:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save testimonial.',
      });
    }
  };

  const handleInputChange = (
    field: keyof Testimonial,
    value: string | number
  ) => {
    setTestimonialState(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Testimonials Control
            </CardTitle>
            <CardDescription>
              Manage the customer testimonials displayed on your website.
            </CardDescription>
          </div>
          <Button onClick={openNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Testimonial
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-4">
              {testimonials.map(testimonial => (
                <Card key={testimonial.id} className="flex items-start p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-center pr-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <div className="flex-grow">
                    <p className="text-muted-foreground">"{testimonial.content}"</p>
                    <p className="mt-2 font-semibold text-sm">- {testimonial.name}</p>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(testimonial)}
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
                            This will permanently delete the testimonial from "{testimonial.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(testimonial.id!)}
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
              {testimonials.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                  <Star className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold text-muted-foreground">
                    No testimonials created yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add New Testimonial" to get started.
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
              {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testimonial-name">Customer Name</Label>
              <Input
                id="testimonial-name"
                value={testimonialState.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testimonial-quote">Quote</Label>
              <Textarea
                id="testimonial-quote"
                value={testimonialState.content}
                onChange={e => handleInputChange('content', e.target.value)}
                placeholder="A short, glowing review from the customer."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testimonial-rating">Rating (1-5)</Label>
              <Select
                value={String(testimonialState.rating)}
                onValueChange={(value) => handleInputChange('rating', Number(value))}
              >
                <SelectTrigger id="testimonial-rating">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Star</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Testimonial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
