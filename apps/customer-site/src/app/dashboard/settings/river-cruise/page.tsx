'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  PlusCircle,
  Trash2,
  Pencil,
  Ship,
  Users,
  Upload,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadMediaFile } from '@/lib/media/upload';

import {
  RiverCruisePackage as DTPackage,
  DailyBoat as DTBoat,
  RiverCruisePricing,
} from '@/lib/types';

// Types
type RiverCruisePackageLocal = DTPackage & {
  package_boats: string[];
};

const DEFAULT_PACKAGE: RiverCruisePackageLocal = {
  id: '',
  name: '',
  photo_url: '',
  duration_hours: 1,
  destination: '',
  min_capacity: 1,
  is_active: true,
  description: '',
  pricing: {
    type: 'per-person',
    adults: { withoutFood: 0, withFood: 0, minAge: 18, maxAge: 64 },
    children: { withoutFood: 0, withFood: 0, minAge: 0, maxAge: 17 },
    seniors: { withoutFood: 0, withFood: 0, minAge: 65 },
    totalPrice: 0,
  },
  package_boats: [],
};

const DEFAULT_BOAT: Omit<DTBoat, 'id'> = {
  name: '',
  max_capacity: 0,
  min_capacity: 0,
  boat_type: 'large_vessel',
};

export default function RiverCruiseSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  // Dialogs
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isBoatDialogOpen, setIsBoatDialogOpen] = useState(false);

  // Package state
  const [editingPackage, setEditingPackage] = useState<RiverCruisePackageLocal | null>(null);
  const [packageState, setPackageState] = useState<RiverCruisePackageLocal>(DEFAULT_PACKAGE);

  // Boat state
  const [editingBoat, setEditingBoat] = useState<DTBoat | null>(null);
  const [boatState, setBoatState] = useState<Omit<DTBoat, 'id'>>(DEFAULT_BOAT);

  // Data
  const [packages, setPackages] = useState<RiverCruisePackageLocal[]>([]);
  const [boats, setBoats] = useState<DTBoat[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isPackagePhotoUploading, setIsPackagePhotoUploading] = useState(false);

  // ------- Fetch Functions -------
  const fetchPackages = useCallback(async () => {
    if (!supabase) return;
    const { data: packagesData } = await supabase.from('daily_travel_packages').select('*');
    if (packagesData) {
      // Also fetch boat assignments
      const { data: assignments } = await supabase.from('package_boats').select('*');

      const mappedPackages = (packagesData as DTPackage[]).map(pkg => ({
        ...pkg,
        package_boats: assignments?.filter((a: any) => a.package_id === pkg.id).map((a: any) => a.boat_id) || []
      }));

      setPackages(mappedPackages as RiverCruisePackageLocal[]);
    }
  }, [supabase]);

  const fetchBoats = useCallback(async () => {
    if (!supabase) return;
    const [dbRes, hmRes] = await Promise.all([
      supabase.from('daily_boats').select('*'),
      supabase.from('houseboat_models').select('*')
    ]);

    const combined = [
      ...(dbRes.data || []).map((b: any) => ({ ...b, source: 'daily' })),
      ...(hmRes.data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        max_capacity: m.max_capacity || m.maximumCapacity || 12,
        source: 'houseboat_model'
      }))
    ];
    setBoats(combined as any);
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    await Promise.all([fetchPackages(), fetchBoats()]);
    setIsDataLoading(false);
  }, [fetchBoats, fetchPackages]);

  useEffect(() => {
    fetchData();

    if (!supabase) return;
    const packagesChannel = supabase.channel('packages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_travel_packages' }, () => fetchPackages())
      .subscribe();

    const boatsChannel = supabase.channel('boats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_boats' }, () => fetchBoats())
      .subscribe();

    return () => {
      supabase.removeChannel(packagesChannel);
      supabase.removeChannel(boatsChannel);
    };
  }, [fetchBoats, fetchData, fetchPackages, supabase]);

  // ------- Package Handlers -------
  const openNewPackageDialog = () => {
    setEditingPackage(null);
    setPackageState(DEFAULT_PACKAGE);
    setIsPackageDialogOpen(true);
  };

  const openEditPackageDialog = (pkg: RiverCruisePackageLocal) => {
    setEditingPackage(pkg);
    setPackageState(pkg);
    setIsPackageDialogOpen(true);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('daily_travel_packages').delete().eq('id', packageId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Package deleted.' });
      fetchPackages();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete package.' });
    }
  };

  const handleSavePackage = async () => {
    if (!supabase || !packageState.name) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Package name is required.' });
      return;
    }

    try {
      const {
        name,
        description,
        destination,
        duration_hours,
        photo_url,
        pricing,
        min_capacity,
        preparation_buffer,
        is_active,
        package_boats
      } = packageState;

      const payload = {
        name,
        description,
        destination,
        duration_hours,
        photo_url: photo_url || '',
        pricing,
        min_capacity,
        preparation_buffer: preparation_buffer || 60,
        is_active
      };

      let packageId = editingPackage?.id;

      if (packageId) {
        const { error } = await supabase.from('daily_travel_packages').update(payload).eq('id', packageId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('daily_travel_packages').insert([payload]).select().single();
        if (error) throw error;
        packageId = data.id;
      }

      // Sync Boats
      if (packageId) {
        // Delete old assignments
        await supabase.from('package_boats').delete().eq('package_id', packageId);

        // Insert new ones
        if (package_boats && package_boats.length > 0) {
          const assignments = package_boats.map((bId: string) => ({
            package_id: packageId,
            boat_id: bId
          }));
          const { error: boatError } = await supabase.from('package_boats').insert(assignments);
          if (boatError) throw boatError;
        }
      }

      toast({ title: 'Success', description: `Package ${editingPackage ? 'updated' : 'created'}.` });
      setIsPackageDialogOpen(false);
      fetchPackages();
    } catch (error: any) {
      console.error('Failed to save package:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save package.'
      });
    }
  };

  // ------- Boat Handlers -------
  const openNewBoatDialog = () => {
    setEditingBoat(null);
    setBoatState(DEFAULT_BOAT);
    setIsBoatDialogOpen(true);
  };

  const openEditBoatDialog = (boat: DTBoat) => {
    setEditingBoat(boat);
    setBoatState(boat);
    setIsBoatDialogOpen(true);
  };

  const handleDeleteBoat = async (boatId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('daily_boats').delete().eq('id', boatId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Boat deleted.' });
      fetchBoats();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete boat.' });
    }
  };

  const handleSaveBoat = async () => {
    if (!supabase || !boatState.name) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Boat name is required.' });
      return;
    }

    try {
      const payload = {
        name: boatState.name,
        max_capacity: boatState.max_capacity,
        min_capacity: boatState.min_capacity,
        boat_type: boatState.boat_type,
      };

      if (editingBoat?.id) {
        const { error } = await supabase.from('daily_boats').update(payload).eq('id', editingBoat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_boats').insert([payload]);
        if (error) throw error;
      }
      toast({ title: 'Success', description: `Boat ${editingBoat ? 'updated' : 'created'}.` });
      setIsBoatDialogOpen(false);
      fetchBoats();
    } catch (error) {
      console.error('Failed to save boat:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save boat.' });
    }
  };

  // ------- Helpers -------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPackagePhotoUploading(true);
    try {
      const imageUrl = await uploadMediaFile(file, {
        folder: 'river-cruise/packages',
      });
      setPackageState((prev: RiverCruisePackageLocal) => ({ ...prev, photo_url: imageUrl }));
      toast({ title: 'Photo uploaded', description: 'Package image stored as URL.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'Could not upload package photo.',
      });
    } finally {
      e.target.value = '';
      setIsPackagePhotoUploading(false);
    }
  };

  const handlePackageInputChange = (field: string, value: any) => {
    setPackageState((prev: RiverCruisePackageLocal) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section: 'pricing', field: keyof RiverCruisePricing, value: any) => {
    setPackageState((prev: RiverCruisePackageLocal) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value } as any,
    }));
  };

  const handlePriceAgeChange = (category: 'adults' | 'children' | 'seniors', field: string, value: any) => {
    setPackageState((prev: RiverCruisePackageLocal) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [category]: { ...(prev.pricing as any)[category], [field]: Number(value) || 0 },
      },
    }));
  };

  return (
    <>
      <Tabs defaultValue="packages">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              River Cruise Control
            </CardTitle>
            <CardDescription className="mt-1">
              Configure packages and boats for daily excursions.
            </CardDescription>
          </div>
          <TabsList>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="boats">Boats</TabsTrigger>
          </TabsList>
        </div>

        {/* =================== PACKAGES TAB =================== */}
        <TabsContent value="packages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Travel Packages</CardTitle>
                <CardDescription>Manage options and pricing for river cruise excursions.</CardDescription>
              </div>
              <Button onClick={openNewPackageDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Package
              </Button>
            </CardHeader>
            <CardContent>
              {isDataLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  {packages.map(pkg => {
                    // No longer using single boat_id
                    return (
                      <Card key={pkg.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                        <div className="flex-grow">

                          <CardTitle>{pkg.name}</CardTitle>
                          <CardDescription>{pkg.destination}</CardDescription>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {pkg.package_boats?.map(boatId => {
                              const boat = boats.find(b => b.id === boatId);
                              if (!boat) return null;
                              return (
                                <Badge key={boatId} variant="outline" className="text-xs">
                                  <Ship className="h-3 w-3 mr-1" /> {boat.name} <span className="ml-1 opacity-50 text-[8px]">({(boat as any).source === 'houseboat_model' ? 'Model' : 'Vessel'})</span>
                                </Badge>
                              );
                            })}
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" /> Min: {pkg.min_capacity || 1}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="icon" onClick={() => openEditPackageDialog(pkg)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the &quot;{pkg.name}&quot; package.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePackage(pkg.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </Card>
                    );
                  })}
                  {packages.length === 0 && !isDataLoading && (
                    <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-lg font-semibold text-muted-foreground">No travel packages created yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Click &quot;Add New Package&quot; to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== BOATS TAB =================== */}
        <TabsContent value="boats" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>River Cruise Boats</CardTitle>
                <CardDescription>Manage the boats used for daily excursions.</CardDescription>
              </div>
              <Button onClick={openNewBoatDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Boat
              </Button>
            </CardHeader>
            <CardContent>
              {isDataLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  {boats.map(boat => (
                    <Card key={boat.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                      <div className="flex-grow">
                        <CardTitle>{boat.name}</CardTitle>
                        <CardDescription>Max Capacity: {boat.max_capacity} people</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="icon" onClick={() => openEditBoatDialog(boat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the &quot;{boat.name}&quot; boat.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBoat(boat.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}
                  {boats.length === 0 && !isDataLoading && (
                    <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                      <Ship className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-lg font-semibold text-muted-foreground">No river cruise boats created yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Click &quot;Add New Boat&quot; to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =================== PACKAGE DIALOG =================== */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              {editingPackage ? 'Edit' : 'Add New'} River Cruise Package
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* General Info */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">Package Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pkg-name">Package Name</Label>
                  <Input id="pkg-name" value={packageState.name} onChange={e => handlePackageInputChange('name', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pkg-description">Description</Label>
                  <Textarea id="pkg-description" value={packageState.description} onChange={e => handlePackageInputChange('description', e.target.value)} placeholder="Enter package description..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-destination">Destination</Label>
                  <Input id="pkg-destination" value={packageState.destination} onChange={e => handlePackageInputChange('destination', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-duration">Duration (hours)</Label>
                  <Input id="pkg-duration" type="number" value={packageState.duration_hours} onChange={e => handlePackageInputChange('duration_hours', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-buffer">Preparation Buffer (minutes)</Label>
                  <Input id="pkg-buffer" type="number" value={packageState.preparation_buffer || 60} onChange={e => handlePackageInputChange('preparation_buffer', Number(e.target.value))} placeholder="e.g. 60" />
                  <p className="text-[10px] text-muted-foreground italic">Padding added before/after bookings.</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Assigned Boats</Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-muted/20">
                  {boats.map(boat => (
                    <div key={boat.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`boat-${boat.id}`}
                        checked={(packageState as any).package_boats?.includes(boat.id)}
                        onCheckedChange={(checked) => {
                          const currentBoats = (packageState as any).package_boats || [];
                          const updatedBoats = checked
                            ? [...currentBoats, boat.id]
                            : currentBoats.filter((id: string) => id !== boat.id);
                          handlePackageInputChange('package_boats', updatedBoats);
                        }}
                      />
                      <label htmlFor={`boat-${boat.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {boat.name} <span className="text-xs text-muted-foreground">(Max: {boat.max_capacity})</span>
                      </label>
                    </div>
                  ))}
                  {boats.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No boats available. Please add boats first.</p>}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Package Photo</Label>
                <div className="flex flex-col gap-4">
                  {packageState.photo_url && (
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                      <Image
                        src={packageState.photo_url}
                        alt="Package preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setPackageState((prev: RiverCruisePackageLocal) => ({ ...prev, photo_url: '' }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    disabled={isPackagePhotoUploading}
                    onClick={() => document.getElementById('pkg-photo-upload')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isPackagePhotoUploading ? 'Uploading...' : 'Upload Package Photo'}
                  </Button>
                  <input
                    id="pkg-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">Pricing Model</h3>
              <RadioGroup value={packageState.pricing.type} onValueChange={value => handleNestedChange('pricing', 'type', value)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per-person" id="r-person" />
                  <Label htmlFor="r-person">Per Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exclusive" id="r-exclusive" />
                  <Label htmlFor="r-exclusive">Exclusive (Fixed Price)</Label>
                </div>
              </RadioGroup>

              {packageState.pricing.type === 'per-person' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {['children', 'adults', 'seniors'].map((cat) => (
                    <div key={cat} className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-bold text-lg capitalize border-b pb-2">{cat}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Min Age</Label>
                          <Input type="number" value={(packageState.pricing as any)[cat].minAge} onChange={e => handlePriceAgeChange(cat as any, 'minAge', e.target.value)} />
                        </div>
                        {cat !== 'seniors' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Max Age</Label>
                            <Input type="number" value={(packageState.pricing as any)[cat].maxAge} onChange={e => handlePriceAgeChange(cat as any, 'maxAge', e.target.value)} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-sm text-blue-600 font-semibold">Price Without Food (€)</Label>
                          <Input type="number" value={(packageState.pricing as any)[cat].withoutFood} onChange={e => handlePriceAgeChange(cat as any, 'withoutFood', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-green-600 font-semibold">Price With Food (€)</Label>
                          <Input type="number" value={(packageState.pricing as any)[cat].withFood} onChange={e => handlePriceAgeChange(cat as any, 'withFood', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {packageState.pricing.type === 'exclusive' && (
                <div className="pt-2">
                  <Label htmlFor="pkg-total-price">Total Package Price (€)</Label>
                  <Input id="pkg-total-price" type="number" value={packageState.pricing.totalPrice} onChange={e => handleNestedChange('pricing', 'totalPrice', Number(e.target.value))} />
                </div>
              )}
            </div>

            {/* Package Description (Merged from Terms) */}
            <div className="space-y-2">
              <Label htmlFor="pkg-description-bottom">Package Overview & Terms</Label>
              <Textarea
                id="pkg-description-bottom"
                value={packageState.description}
                onChange={e => handlePackageInputChange('description', e.target.value)}
                placeholder="Describe the excursion, what's included, and any important conditions..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePackage} disabled={isPackagePhotoUploading}>
              {isPackagePhotoUploading
                ? 'Uploading photo...'
                : `${editingPackage ? 'Update' : 'Create'} Package`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================== BOAT DIALOG =================== */}
      <Dialog open={isBoatDialogOpen} onOpenChange={setIsBoatDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBoat ? 'Edit' : 'Add New'} Boat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="boat-name">Boat Name</Label>
              <Input
                id="boat-name"
                value={boatState.name}
                onChange={e => setBoatState(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="boat-max">Max Capacity</Label>
                <Input
                  id="boat-max"
                  type="number"
                  value={boatState.max_capacity}
                  onChange={e => setBoatState(prev => ({ ...prev, max_capacity: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boat-min">Min Capacity (Suggested)</Label>
                <Input
                  id="boat-min"
                  type="number"
                  value={boatState.min_capacity}
                  onChange={e => setBoatState(prev => ({ ...prev, min_capacity: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="boat-type">Boat Type (for Allocation)</Label>
              <Select
                value={boatState.boat_type}
                onValueChange={value => setBoatState(prev => ({ ...prev, boat_type: value as any }))}
              >
                <SelectTrigger id="boat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="large_vessel">Large Vessel (16+ guests)</SelectItem>
                  <SelectItem value="houseboat">Houseboat (7-15 guests)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveBoat}>Save Boat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


