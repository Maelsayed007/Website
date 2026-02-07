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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TariffPeriod = {
  start: string; // MM-DD
  end: string;   // MM-DD
};

type Tariff = {
  id?: string;
  name: string;
  periods: TariffPeriod[];
};

// Helper to format MM-DD into a readable format e.g., "Jun 01"
const formatPeriodDate = (mmdd: string) => {
  try {
    // Parse as a date in a non-leap year to get month and day
    const date = parse(mmdd, 'MM-dd', new Date(2000, 0, 1));
    return format(date, 'LLL dd');
  } catch (e) {
    return 'Invalid Date';
  }
};

export default function TariffsSettingsPage() {
  const { toast } = useToast();
  const { supabase, session } = useSupabase(); // Using session to debug auth

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffName, setTariffName] = useState('');
  const [periods, setPeriods] = useState<TariffPeriod[]>([]);

  useEffect(() => {
    if (!supabase) return;
    const fetchTariffs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tariffs')
        .select('*');

      if (data) {
        setTariffs(data);
      }
      if (error) {
        console.error('Error fetching tariffs:', error);
      }
      setIsLoading(false);
    };
    fetchTariffs();
  }, [supabase]);

  const openNewTariffDialog = () => {
    setEditingTariff(null);
    setTariffName('');
    setPeriods([{ start: '', end: '' }]);
    setIsDialogOpen(true);
  };

  const openEditTariffDialog = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setTariffName(tariff.name);
    setPeriods(tariff.periods);
    setIsDialogOpen(true);
  };

  const handlePeriodChange = (index: number, part: 'start' | 'end', value: string) => {
    const newPeriods = [...periods];
    newPeriods[index][part] = value;
    setPeriods(newPeriods);
  };

  const addPeriod = () => {
    setPeriods([...periods, { start: '', end: '' }]);
  };

  const removePeriod = (index: number) => {
    const newPeriods = periods.filter((_, i) => i !== index);
    setPeriods(newPeriods);
  };

  const isValidMMDD = (value: string) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);

  const handleSave = async () => {
    if (!supabase) return;

    // Debug Authentication
    if (!session) {
      console.error('No active session found during save.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to save tariffs.',
      });
      return;
    }

    if (!tariffName) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Tariff name is required.',
      });
      return;
    }

    const formattedPeriods = periods.filter(p => p.start && p.end);

    if (formattedPeriods.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least one complete date period is required.',
      });
      return;
    }

    for (const period of formattedPeriods) {
      if (!isValidMMDD(period.start) || !isValidMMDD(period.end)) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Invalid date format. Please use MM-DD for all periods.`,
        });
        return;
      }
    }


    const tariffData = {
      name: tariffName,
      periods: formattedPeriods, // Supabase should handle JSON array
    };

    console.log('Attempting to save tariff:', tariffData);

    try {
      if (editingTariff?.id) {
        const { error } = await supabase
          .from('tariffs')
          .update(tariffData)
          .eq('id', editingTariff.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Tariff updated successfully.' });
        setTariffs(prev => prev.map(t => t.id === editingTariff.id ? { ...t, ...tariffData } : t));
      } else {
        const { data, error } = await supabase
          .from('tariffs')
          .insert([tariffData])
          .select()
          .single();

        if (error) throw error;
        toast({ title: 'Success', description: 'Tariff created successfully.' });
        if (data) setTariffs(prev => [...prev, data]);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to save tariff:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to save tariff. Check console for details.',
      });
    }
  };

  const handleDelete = async (tariffId: string) => {
    if (!supabase) return;
    if (!window.confirm('Are you sure you want to delete this tariff?')) return;

    try {
      const { error } = await supabase
        .from('tariffs')
        .delete()
        .eq('id', tariffId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Tariff deleted successfully.' });
      setTariffs(prev => prev.filter(t => t.id !== tariffId));
    } catch (error) {
      console.error('Failed to delete tariff:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete tariff. Please try again.',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tariff Control
            </CardTitle>
            <CardDescription>
              Define pricing seasons (e.g., high season, low season) and their
              recurring date ranges.
            </CardDescription>
          </div>
          <Button onClick={openNewTariffDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Tariff
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tariff Name</TableHead>
                  <TableHead>Periods</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tariffs && tariffs.length > 0 ? (
                  tariffs.map(tariff => (
                    <TableRow key={tariff.id}>
                      <TableCell className="font-medium">{tariff.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tariff.periods?.map((p, i) => (
                            <span key={i} className="text-sm text-muted-foreground">
                              {formatPeriodDate(p.start)} - {formatPeriodDate(p.end)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTariffDialog(tariff)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tariff.id!)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No tariffs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTariff ? 'Edit Tariff' : 'Add New Tariff'}
            </DialogTitle>
            <DialogDescription>
              {editingTariff
                ? 'Update the tariff name and date periods.'
                : 'Create a new tariff with its corresponding date periods.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tariff-name">Tariff Name</Label>
              <Input
                id="tariff-name"
                value={tariffName}
                onChange={e => setTariffName(e.target.value)}
                placeholder="e.g., High Season"
              />
            </div>
            <div className="space-y-2">
              <Label>Periods</Label>
              <div className="space-y-4">
                {periods.map((period, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <Input
                      value={period.start}
                      onChange={(e) => handlePeriodChange(index, 'start', e.target.value)}
                      placeholder="Start (MM-DD)"
                    />
                    <span>-</span>
                    <Input
                      value={period.end}
                      onChange={(e) => handlePeriodChange(index, 'end', e.target.value)}
                      placeholder="End (MM-DD)"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removePeriod(index)} className="shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" onClick={addPeriod} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Period
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Tariff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
