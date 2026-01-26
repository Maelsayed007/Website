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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PlusCircle, Trash2, Pencil, Ticket, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';


// Type
type Voucher = {
  id?: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  expiry_date?: string | null;
  active: boolean;
};

const DEFAULT_VOUCHER: Voucher = {
  code: '',
  description: '',
  discount_type: 'fixed',
  value: 0,
  active: true,
};

export default function VouchersSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherState, setVoucherState] = useState<Voucher>(DEFAULT_VOUCHER);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVouchers = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data } = await supabase.from('vouchers').select('*').order('code');
    if (data) setVouchers(data as Voucher[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVouchers();

    if (!supabase) return;
    const channel = supabase.channel('vouchers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, () => fetchVouchers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const openNewDialog = () => {
    setEditingVoucher(null);
    setVoucherState(DEFAULT_VOUCHER);
    setIsDialogOpen(true);
  };

  const openEditDialog = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setVoucherState(voucher);
    setIsDialogOpen(true);
  };

  const handleDelete = async (voucherId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Voucher deleted.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete voucher.',
      });
    }
  };

  const handleSave = async () => {
    if (!supabase || !voucherState.code) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Voucher code is required.',
      });
      return;
    }

    const dataToSave = {
      ...voucherState,
      code: voucherState.code.toUpperCase().trim(),
      expiry_date: voucherState.expiry_date || null,
    };

    try {
      if (editingVoucher?.id) {
        const { error } = await supabase.from('vouchers').update(dataToSave).eq('id', editingVoucher.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Voucher updated.' });
      } else {
        const { error } = await supabase.from('vouchers').insert([dataToSave]);
        if (error) throw error;
        toast({ title: 'Success', description: 'Voucher created.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save voucher:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save voucher.',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Voucher & Discount Management
            </CardTitle>
            <CardDescription>
              Create and manage promotional codes for your customers.
            </CardDescription>
          </div>
          <Button onClick={openNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Voucher
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-4">
              {vouchers.map(voucher => (
                <Card key={voucher.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-mono tracking-wider text-primary">{voucher.code}</CardTitle>
                      <Badge variant={voucher.active ? 'default' : 'secondary'}>{voucher.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <CardDescription>{voucher.description}</CardDescription>
                    <div className="text-sm mt-1">
                      <span className="font-semibold">{voucher.discount_type === 'fixed' ? `€${voucher.value}` : `${voucher.value}%`}</span> off
                      {voucher.expiry_date && <span className="text-muted-foreground ml-2">(Expires {format(new Date(voucher.expiry_date), 'PPP')})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(voucher)}
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
                            This will permanently delete the "{voucher.code}"
                            voucher.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(voucher.id!)}
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
              {vouchers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                  <Ticket className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold text-muted-foreground">
                    No vouchers created yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add New Voucher" to get started.
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
              {editingVoucher ? 'Edit Voucher' : 'Add New Voucher'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voucher-code">Voucher Code</Label>
              <Input
                id="voucher-code"
                value={voucherState.code}
                onChange={e => setVoucherState(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., SUMMER20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-desc">Description (for internal use)</Label>
              <Textarea
                id="voucher-desc"
                value={voucherState.description}
                onChange={e => setVoucherState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Summer promotion for website bookings"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voucher-type">Discount Type</Label>
                <Select
                  value={voucherState.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setVoucherState(prev => ({ ...prev, discount_type: value }))}
                >
                  <SelectTrigger id="voucher-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (€)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voucher-value">Value</Label>
                <Input
                  id="voucher-value"
                  type="number"
                  value={voucherState.value}
                  onChange={e => setVoucherState(prev => ({ ...prev, value: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !voucherState.expiry_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {voucherState.expiry_date ? format(new Date(voucherState.expiry_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={voucherState.expiry_date ? new Date(voucherState.expiry_date) : undefined}
                    onSelect={date => setVoucherState(prev => ({ ...prev, expiry_date: date?.toISOString() }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={voucherState.active}
                onCheckedChange={checked => setVoucherState(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="is-active">Voucher is Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
