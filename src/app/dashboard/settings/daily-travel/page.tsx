'use client';

import { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
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
  Camera,
  Pencil,
  Ship,
  Users,
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

// Types
type AgePrice = { price: number; minAge: number; maxAge?: number };
type Pricing = {
  type: 'per-person' | 'exclusive';
  adults: AgePrice;
  children: AgePrice;
  seniors: Omit<AgePrice, 'maxAge'>;
  totalPrice?: number;
};
type Terms = { minimumPeople: number; conditions: string };
type DailyTravelPackage = {
  id?: string;
  name: string;
  boatId: string;
  photoUrl: string;
  durationHours: number;
  destination: string;
  pricing: Pricing;
  terms: Terms;
};
type DailyBoat = { id: string; name: string; capacity: number };

const DEFAULT_PACKAGE: DailyTravelPackage = {
  name: '',
  boatId: '',
  photoUrl: '',
  durationHours: 1,
  destination: '',
  pricing: {
    type: 'per-person',
    adults: { price: 0, minAge: 18, maxAge: 64 },
    children: { price: 0, minAge: 0, maxAge: 17 },
    seniors: { price: 0, minAge: 65 },
    totalPrice: 0,
  },
  terms: {
    minimumPeople: 1,
    conditions: '',
  },
};

const DEFAULT_BOAT: Omit<DailyBoat, 'id'> = {
  name: '',
  capacity: 0,
};

export default function DailyTravelSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isBoatDialogOpen, setIsBoatDialogOpen] = useState(false);

  const [editingPackage, setEditingPackage] =
    useState<DailyTravelPackage | null>(null);
  const [packageState, setPackageState] =
    useState<DailyTravelPackage>(DEFAULT_PACKAGE);

  const [editingBoat, setEditingBoat] = useState<DailyBoat | null>(null);
  const [boatState, setBoatState] = useState<Omit<DailyBoat, 'id'>>(
    DEFAULT_BOAT
  );

  const packagesQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'daily_travel_packages');
  }, [firestore]);

  const boatsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'daily_boats');
  }, [firestore]);

  // Fetch data
  const { data: packages, isLoading: isLoadingPackages } = useCollection<
    DailyTravelPackage
  >(packagesQuery);

  const { data: boats, isLoading: isLoadingBoats } =
    useCollection<DailyBoat>(boatsQuery);

  const openNewPackageDialog = () => {
    setEditingPackage(null);
    setPackageState(DEFAULT_PACKAGE);
    setIsPackageDialogOpen(true);
  };

  const openEditPackageDialog = (pkg: DailyTravelPackage) => {
    setEditingPackage(pkg);
    setPackageState(pkg);
    setIsPackageDialogOpen(true);
  };

  const openNewBoatDialog = () => {
    setEditingBoat(null);
    setBoatState(DEFAULT_BOAT);
    setIsBoatDialogOpen(true);
  };

  const openEditBoatDialog = (boat: DailyBoat) => {
    setEditingBoat(boat);
    setBoatState(boat);
    setIsBoatDialogOpen(true);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'daily_travel_packages', packageId));
      toast({ title: 'Success', description: 'Package deleted.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete package.',
      });
    }
  };

  const handleDeleteBoat = async (boatId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'daily_boats', boatId));
      toast({ title: 'Success', description: 'Boat deleted.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete boat.',
      });
    }
  };

  const handleSavePackage = async () => {
    if (!firestore || !packageState.name || !packageState.boatId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Package name and boat selection are required.',
      });
      return;
    }

    try {
      if (editingPackage?.id) {
        const packageRef = doc(
          firestore,
          'daily_travel_packages',
          editingPackage.id
        );
        await setDoc(packageRef, packageState);
        toast({ title: 'Success', description: 'Package updated.' });
      } else {
        await addDoc(
          collection(firestore, 'daily_travel_packages'),
          packageState
        );
        toast({ title: 'Success', description: 'Package created.' });
      }
      setIsPackageDialogOpen(false);
    } catch (error) {
      console.error('Failed to save package:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save package.',
      });
    }
  };

  const handleSaveBoat = async () => {
    if (!firestore || !boatState.name) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Boat name is required.',
      });
      return;
    }

    try {
      if (editingBoat?.id) {
        const boatRef = doc(firestore, 'daily_boats', editingBoat.id);
        await setDoc(boatRef, boatState);
        toast({ title: 'Success', description: 'Boat updated.' });
      } else {
        await addDoc(collection(firestore, 'daily_boats'), boatState);
        toast({ title: 'Success', description: 'Boat created.' });
      }
      setIsBoatDialogOpen(false);
    } catch (error) {
      console.error('Failed to save boat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save boat.',
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setPackageState(prev => ({
        ...prev,
        photoUrl: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePackageInputChange = (
    field: keyof DailyTravelPackage,
    value: any
  ) => {
    setPackageState(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (
    section: 'pricing' | 'terms',
    field: string,
    value: any
  ) => {
    setPackageState(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handlePriceAgeChange = (
    category: 'adults' | 'children' | 'seniors',
    field: 'price' | 'minAge' | 'maxAge',
    value: any
  ) => {
    setPackageState(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [category]: { ...prev.pricing[category], [field]: Number(value) || 0 },
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
              Daily Travel Control
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

        <TabsContent value="packages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Travel Packages</CardTitle>
                <CardDescription>
                  Manage options and pricing for daily travel excursions.
                </CardDescription>
              </div>
              <Button onClick={openNewPackageDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Package
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPackages ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  {packages?.map(pkg => (
                    <Card key={pkg.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                      <Image
                        src={
                          pkg.photoUrl ||
                          'https://placehold.co/600x400/E2E8F0/A0AEC0?text=No+Image'
                        }
                        alt={pkg.name}
                        width={100}
                        height={75}
                        className="rounded-md object-cover aspect-[4/3]"
                      />
                      <div className="flex-grow ml-6">
                        <CardTitle>{pkg.name}</CardTitle>
                        <CardDescription>{pkg.destination}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditPackageDialog(pkg)}
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
                                This will permanently delete the "{pkg.name}"
                                package.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePackage(pkg.id!)}
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
                  {packages?.length === 0 && !isLoadingPackages && (
                    <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-lg font-semibold text-muted-foreground">
                        No travel packages created yet.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Add New Package" to get started.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boats" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Travel Boats</CardTitle>
                <CardDescription>
                  Manage the boats used for daily excursions.
                </CardDescription>
              </div>
              <Button onClick={openNewBoatDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Boat
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingBoats ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  {boats?.map(boat => (
                    <Card key={boat.id} className="flex items-center p-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                      <div className="flex-grow">
                        <CardTitle>{boat.name}</CardTitle>
                        <CardDescription>
                          Capacity: {boat.capacity} people
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditBoatDialog(boat)}
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
                                This will permanently delete the "{boat.name}"
                                boat.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBoat(boat.id!)}
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
                  {boats?.length === 0 && !isLoadingBoats && (
                     <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                       <Ship className="h-10 w-10 text-muted-foreground mb-2"/>
                      <p className="text-lg font-semibold text-muted-foreground">
                        No daily travel boats created yet.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Click "Add New Boat" to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Package Dialog */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              {editingPackage ? 'Edit' : 'Add New'} Daily Travel Package
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* General Info */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">
                Package Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pkg-name">Package Name</Label>
                  <Input
                    id="pkg-name"
                    value={packageState.name}
                    onChange={e =>
                      handlePackageInputChange('name', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-boat">Boat</Label>
                  <Select
                    value={packageState.boatId}
                    onValueChange={value =>
                      handlePackageInputChange('boatId', value)
                    }
                  >
                    <SelectTrigger id="pkg-boat">
                      <SelectValue placeholder="Select a boat" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingBoats ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        boats?.map(boat => (
                          <SelectItem key={boat.id} value={boat.id}>
                            {boat.name} (Capacity: {boat.capacity})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-destination">Destination</Label>
                  <Input
                    id="pkg-destination"
                    value={packageState.destination}
                    onChange={e =>
                      handlePackageInputChange('destination', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-duration">Duration (hours)</Label>
                  <Input
                    id="pkg-duration"
                    type="number"
                    value={packageState.durationHours}
                    onChange={e =>
                      handlePackageInputChange(
                        'durationHours',
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <div className="flex items-center gap-4">
                  <Image
                    src={
                      packageState.photoUrl ||
                      'https://placehold.co/600x400/E2E8F0/A0AEC0?text=Image'
                    }
                    alt="Package Photo"
                    width={100}
                    height={75}
                    className="rounded-md object-cover aspect-[4/3] border"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">
                Pricing Model
              </h3>
              <RadioGroup
                value={packageState.pricing.type}
                onValueChange={value =>
                  handleNestedChange('pricing', 'type', value)
                }
                className="flex gap-4"
              >
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                    <h4 className="font-medium">Children</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min Age"
                        value={packageState.pricing.children.minAge}
                        onChange={e =>
                          handlePriceAgeChange('children', 'minAge', e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max Age"
                        value={packageState.pricing.children.maxAge}
                        onChange={e =>
                          handlePriceAgeChange('children', 'maxAge', e.target.value)
                        }
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder="Price (€)"
                      value={packageState.pricing.children.price}
                      onChange={e =>
                        handlePriceAgeChange('children', 'price', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                    <h4 className="font-medium">Adults</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min Age"
                        value={packageState.pricing.adults.minAge}
                        onChange={e =>
                          handlePriceAgeChange('adults', 'minAge', e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max Age"
                        value={packageState.pricing.adults.maxAge}
                        onChange={e =>
                          handlePriceAgeChange('adults', 'maxAge', e.target.value)
                        }
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder="Price (€)"
                      value={packageState.pricing.adults.price}
                      onChange={e =>
                        handlePriceAgeChange('adults', 'price', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                    <h4 className="font-medium">Seniors</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min Age"
                        value={packageState.pricing.seniors.minAge}
                        onChange={e =>
                          handlePriceAgeChange('seniors', 'minAge', e.target.value)
                        }
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder="Price (€)"
                      value={packageState.pricing.seniors.price}
                      onChange={e =>
                        handlePriceAgeChange('seniors', 'price', e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {packageState.pricing.type === 'exclusive' && (
                <div className="pt-2">
                  <Label htmlFor="pkg-total-price">
                    Total Package Price (€)
                  </Label>
                  <Input
                    id="pkg-total-price"
                    type="number"
                    value={packageState.pricing.totalPrice}
                    onChange={e =>
                      handleNestedChange(
                        'pricing',
                        'totalPrice',
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">
                Terms & Conditions
              </h3>
              <div className="space-y-2">
                <Label htmlFor="pkg-min-people">Minimum People</Label>
                <Input
                  id="pkg-min-people"
                  type="number"
                  value={packageState.terms.minimumPeople}
                  onChange={e =>
                    handleNestedChange(
                      'terms',
                      'minimumPeople',
                      Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-conditions">Additional Conditions</Label>
                <Textarea
                  id="pkg-conditions"
                  value={packageState.terms.conditions}
                  onChange={e =>
                    handleNestedChange('terms', 'conditions', e.target.value)
                  }
                  placeholder="e.g., Not available on holidays."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-background">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePackage}>Save Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boat Dialog */}
      <Dialog open={isBoatDialogOpen} onOpenChange={setIsBoatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoat ? 'Edit' : 'Add New'} Daily Boat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="boat-name">Boat Name</Label>
              <Input
                id="boat-name"
                value={boatState.name}
                onChange={e =>
                  setBoatState(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., River Explorer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boat-capacity">Capacity</Label>
              <Input
                id="boat-capacity"
                type="number"
                value={boatState.capacity}
                onChange={e =>
                  setBoatState(prev => ({
                    ...prev,
                    capacity: Number(e.target.value),
                  }))
                }
                placeholder="e.g., 12"
              />
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
