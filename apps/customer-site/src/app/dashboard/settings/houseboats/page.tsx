'use client';

import { useState, useEffect, useRef } from 'react';
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
  DialogDescription,
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
  Ship,
  PlusCircle,
  Trash2,
  Camera,
  Pencil,
  BedDouble,
  BedSingle,
  Users,
  Maximize,
  CookingPot,
  Bath,
  DoorClosed,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { amenityDetails, type Amenity } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { getAIDescription } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';

// Data Types
type Tariff = {
  id: string;
  name: string;
};

type HouseboatModelPrice = {
  id?: string;
  tariff_id: string;
  model_id?: string;
  weekday_price: number;
  weekend_price: number;
};

type Houseboat = {
  id?: string;
  name: string;
  model_id?: string;
};

type HouseboatModel = {
  id: string; // text in DB
  name: string;
  description: string;
  optimal_capacity: number;
  maximum_capacity: number;
  kitchens: number;
  bathrooms: number;
  bedrooms: number;
  single_beds: number;
  double_beds: number;
  amenities: Amenity[];
  image_urls: string[];
  fuel_rate_per_hour?: number;
};

type FullHouseboatModel = HouseboatModel & {
  prices: HouseboatModelPrice[];
  boats: Houseboat[];
};

export default function HouseboatsSettingsPage() {
  const { toast } = useToast();
  const { supabase, session } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // Data State
  const [houseboatModels, setHouseboatModels] = useState<HouseboatModel[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true);

  // Helper: Fetch Data
  const fetchData = async () => {
    if (!supabase) return;
    setIsLoadingModels(true);
    setIsLoadingTariffs(true);

    try {
      // Fetch Models
      const { data: modelsData, error: modelsError } = await supabase
        .from('houseboat_models')
        .select('*');
      if (modelsError) throw modelsError;
      setHouseboatModels(modelsData || []);

      // Fetch Tariffs
      const { data: tariffsData, error: tariffsError } = await supabase
        .from('tariffs')
        .select('id, name');
      if (tariffsError) throw tariffsError;
      setTariffs(tariffsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data.',
      });
    } finally {
      setIsLoadingModels(false);
      setIsLoadingTariffs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);


  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<FullHouseboatModel | null>(null);

  // Form State
  const [modelState, setModelState] = useState<Partial<HouseboatModel>>({});
  const [pricesState, setPricesState] = useState<Partial<HouseboatModelPrice>[]>([]);
  const [boatsState, setBoatsState] = useState<Partial<Houseboat>[]>([{ name: '' }]);

  const openNewModelDialog = () => {
    if (!session) return;
    setEditingModel(null);
    setModelState({
      name: '',
      description: '',
      optimal_capacity: 2,
      maximum_capacity: 2,
      kitchens: 1,
      bathrooms: 1,
      bedrooms: 1,
      single_beds: 0,
      double_beds: 1,
      amenities: [],
      image_urls: [],
      fuel_rate_per_hour: 0,
    });
    setPricesState(
      (tariffs || []).map(t => ({
        tariff_id: t.id,
        weekday_price: 0,
        weekend_price: 0,
      }))
    );
    setBoatsState([{ name: '' }]);
    setIsModelDialogOpen(true);
  };

  const openEditModelDialog = async (model: HouseboatModel) => {
    if (!supabase || !session) return;
    setEditingModel(null);
    setIsModelDialogOpen(true);
    setModelState(model); // Set basic details

    try {
      // Fetch prices
      const { data: prices, error: pricesError } = await supabase
        .from('houseboat_prices')
        .select('*')
        .eq('model_id', model.id);

      if (pricesError) throw pricesError;

      // Fetch boats
      const { data: boats, error: boatsError } = await supabase
        .from('boats')
        .select('*')
        .eq('model_id', model.id);

      if (boatsError) throw boatsError;

      // Merge prices with tariffs to ensure all tariffs are represented
      const fullPrices = (tariffs || []).map(t => {
        const existingPrice = prices?.find(p => p.tariff_id === t.id);
        return existingPrice ? {
          id: existingPrice.id,
          tariff_id: existingPrice.tariff_id,
          model_id: existingPrice.model_id,
          weekday_price: existingPrice.weekday_price,
          weekend_price: existingPrice.weekend_price
        } : {
          tariff_id: t.id,
          weekday_price: 0,
          weekend_price: 0
        };
      });

      setPricesState(fullPrices);
      setBoatsState(boats && boats.length > 0 ? boats : [{ name: '' }]);
      setEditingModel({ ...model, prices: prices || [], boats: boats || [] });

    } catch (error) {
      console.error('Error fetching model details:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch model details.' });
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!supabase || !session) return;

    try {
      const { error } = await supabase
        .from('houseboat_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Houseboat model deleted.' });
      setHouseboatModels(prev => prev.filter(m => m.id !== modelId));
    } catch (error) {
      console.error('Failed to delete model:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete houseboat model.',
      });
    }
  };

  const handleAmenityChange = (amenity: Amenity, checked: boolean) => {
    setModelState(prev => {
      const currentAmenities = prev.amenities || [];
      const newAmenities = checked
        ? [...currentAmenities, amenity]
        : currentAmenities.filter(a => a !== amenity);
      return { ...prev, amenities: newAmenities };
    });
  };

  const handlePriceChange = (
    tariffId: string,
    field: 'weekday_price' | 'weekend_price',
    value: string
  ) => {
    const numValue = Number(value);
    setPricesState(prevPrices =>
      prevPrices.map(p =>
        p.tariff_id === tariffId ? { ...p, [field]: numValue } : p
      )
    );
  };

  const handleBoatNameChange = (index: number, name: string) => {
    setBoatsState(prevBoats => {
      const newBoats = [...prevBoats];
      newBoats[index] = { ...newBoats[index], name };
      return newBoats;
    });
  };

  const addBoatInput = () => {
    setBoatsState(prev => [...prev, { name: '' }]);
  };

  const removeBoatInput = (index: number) => {
    setBoatsState(prev => prev.filter((_, i) => i !== index));
  };

  // Note: For real file uploads, we'd use Supabase Storage.
  // For the migration, we'll keep the current "Data URI" behavior or existing URLs.
  // Ideally, this should be refactored to upload to 'boat-images' bucket.
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const dataUri = e.target?.result as string;
      setModelState(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), dataUri],
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (urlToRemove: string) => {
    setModelState(prev => ({
      ...prev,
      image_urls: (prev.image_urls || []).filter(url => url !== urlToRemove),
    }));
  };

  const handleGenerateDescription = async () => {
    if (!modelState.name || !modelState.optimal_capacity) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter a model name and capacity first.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const features = [
        `${modelState.bedrooms} bedroom(s)`,
        `${modelState.bathrooms} bathroom(s)`,
        `${modelState.kitchens} kitchen(s)`,
        ...(modelState.amenities || []),
      ].join(', ');

      const result = await getAIDescription({
        boatName: modelState.name,
        capacity: modelState.optimal_capacity,
        features: features,
      });

      if (result.success && result.description) {
        setModelState(prev => ({ ...prev, description: result.description }));
        toast({
          title: "Description Generated!",
          description: "The AI-powered description has been filled in.",
        })
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || "Could not generate a description.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveModel = async () => {
    if (!supabase || !session) return;
    if (!modelState.name) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Model name is required.',
      });
      return;
    }

    try {
      // 1. Upsert Model
      // Generate ID if new (using uuidv4 or letting DB do it if we used uuid, but here ID is text so we must generate/sanitize name or use random)
      // Since schema says ID is text, let's use a slug-like ID or UUID. The schema allows UUID func default only if type is UUID. 
      // The schema I wrote says "id text primary key". I should stick to that or use UUID.
      // Let's use UUID for new models.
      const modelId = editingModel?.id || uuidv4();

      const modelData = {
        id: modelId,
        name: modelState.name,
        description: modelState.description || '',
        optimal_capacity: modelState.optimal_capacity || 0,
        maximum_capacity: modelState.maximum_capacity || 0,
        kitchens: modelState.kitchens || 0,
        bathrooms: modelState.bathrooms || 0,
        bedrooms: modelState.bedrooms || 0,
        single_beds: modelState.single_beds || 0,
        double_beds: modelState.double_beds || 0,
        amenities: modelState.amenities || [],
        image_urls: modelState.image_urls || [],
        fuel_rate_per_hour: modelState.fuel_rate_per_hour || 0,
        // slug: ... generate if needed
      };

      const { error: modelError } = await supabase
        .from('houseboat_models')
        .upsert(modelData);

      if (modelError) throw modelError;

      // 2. Handle Prices
      // Delete existing prices for this model first (simplest strategy)
      await supabase.from('houseboat_prices').delete().eq('model_id', modelId);

      const validPrices = pricesState.filter(
        p => p.tariff_id && (p.weekday_price || 0) >= 0 && (p.weekend_price || 0) >= 0
      );

      if (validPrices.length > 0) {
        const pricesToInsert = validPrices.map(p => ({
          model_id: modelId,
          tariff_id: p.tariff_id,
          weekday_price: p.weekday_price,
          weekend_price: p.weekend_price
        }));
        const { error: pricesError } = await supabase.from('houseboat_prices').insert(pricesToInsert);
        if (pricesError) throw pricesError;
      }

      // 3. Handle Boats
      // Delete existing boats (simplest strategy, though less ideal if they have history, 
      // but for this app structure it seems fine as IDs were likely auto-gen anyway)
      await supabase.from('boats').delete().eq('model_id', modelId);

      const validBoats = boatsState.filter(b => b.name && b.name.trim() !== '');
      if (validBoats.length > 0) {
        const boatsToInsert = validBoats.map(b => ({
          model_id: modelId,
          name: b.name
        }));
        const { error: boatsError } = await supabase.from('boats').insert(boatsToInsert);
        if (boatsError) throw boatsError;
      }

      toast({
        title: 'Success',
        description: `Houseboat model ${editingModel ? 'updated' : 'created'} successfully.`,
      });
      setIsModelDialogOpen(false);
      fetchData(); // Refresh list

    } catch (error: any) {
      console.error('Failed to save model:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save houseboat model.',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Houseboat Configuration
            </CardTitle>
            <CardDescription>
              Manage houseboat models, individual boat units, and their specific
              details.
            </CardDescription>
          </div>
          <Button onClick={openNewModelDialog} disabled={isLoadingTariffs}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Model
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingModels ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {houseboatModels.map(model => (
                <Card key={model.id} className="flex items-center p-4 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                  <div className="flex-shrink-0">
                    <Image
                      src={model.image_urls?.[0] || 'https://placehold.co/600x400/E2E8F0/A0AEC0?text=No+Image'}
                      alt={model.name}
                      width={150}
                      height={100}
                      className="rounded-md object-cover aspect-[3/2]"
                    />
                  </div>
                  <div className="flex-grow ml-6">
                    <CardTitle>{model.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">{model.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditModelDialog(model)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Model</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Model</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{model.name}" model
                            and all its data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteModel(model.id)}
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
              {houseboatModels.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                  <Ship className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold text-muted-foreground">
                    No houseboat models created yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Click "Add New Model" to get started.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              {editingModel ? 'Edit Houseboat Model' : 'Add New Houseboat Model'}
            </DialogTitle>
            <DialogDescription>
              Manage the specifications, photos, pricing, and units for this model.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="photos">Photos &amp; Amenities</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="units">Boat Units</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-grow overflow-y-auto p-6">
                <TabsContent value="details" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="model-name">Model Name</Label>
                    <Input
                      id="model-name"
                      value={modelState.name || ''}
                      onChange={e =>
                        setModelState(prev => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Aqua Cruiser Series 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="model-description">Description</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                    </div>
                    <Textarea
                      id="model-description"
                      value={modelState.description || ''}
                      onChange={e =>
                        setModelState(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="A short, client-facing description of the model."
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Users size={16} />Optimal Capacity</Label>
                      <Input type="number" value={modelState.optimal_capacity || ''} onChange={e => setModelState(prev => ({ ...prev, optimal_capacity: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Maximize size={16} />Max Capacity</Label>
                      <Input type="number" value={modelState.maximum_capacity || ''} onChange={e => setModelState(prev => ({ ...prev, maximum_capacity: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><BedDouble size={16} />Double Beds</Label>
                      <Input type="number" value={modelState.double_beds || ''} onChange={e => setModelState(prev => ({ ...prev, double_beds: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><BedSingle size={16} />Single Beds</Label>
                      <Input type="number" value={modelState.single_beds || ''} onChange={e => setModelState(prev => ({ ...prev, single_beds: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><DoorClosed size={16} />Bedrooms</Label>
                      <Input type="number" value={modelState.bedrooms || ''} onChange={e => setModelState(prev => ({ ...prev, bedrooms: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Bath size={16} />Bathrooms</Label>
                      <Input type="number" value={modelState.bathrooms || ''} onChange={e => setModelState(prev => ({ ...prev, bathrooms: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><CookingPot size={16} />Kitchens</Label>
                      <Input type="number" value={modelState.kitchens || ''} onChange={e => setModelState(prev => ({ ...prev, kitchens: Number(e.target.value) }))} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Model Photos</h3>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {(modelState.image_urls || []).map((url, index) => (
                        <div
                          key={index}
                          className="relative aspect-[3/2] rounded-lg overflow-hidden group shadow-sm"
                        >
                          <Image
                            src={url}
                            alt="Houseboat model photo"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removePhoto(url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="aspect-[3/2] flex-col gap-2 border-2 border-dashed hover:border-primary hover:text-primary transition-colors"
                        onClick={triggerPhotoUpload}
                      >
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs font-medium text-center">Add Photo</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Amenities</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                      {(Object.keys(amenityDetails) as Amenity[]).map(key => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${key}`}
                            checked={modelState.amenities?.includes(key)}
                            onCheckedChange={checked =>
                              handleAmenityChange(key, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`amenity-${key}`}
                            className="text-sm font-normal"
                          >
                            {amenityDetails[key].name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="mt-0 space-y-4">
                  {isLoadingTariffs ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      {(tariffs || []).map(tariff => (
                        <div key={tariff.id} className="p-4 border rounded-lg bg-muted/50">
                          <p className="font-semibold mb-3 text-primary">{tariff.name}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label>Weekday Price (€)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 350"
                                value={
                                  pricesState.find(p => p.tariff_id === tariff.id)
                                    ?.weekday_price || ''
                                }
                                onChange={e =>
                                  handlePriceChange(
                                    tariff.id,
                                    'weekday_price',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Weekend Price (€)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 400"
                                value={
                                  pricesState.find(p => p.tariff_id === tariff.id)
                                    ?.weekend_price || ''
                                }
                                onChange={e =>
                                  handlePriceChange(
                                    tariff.id,
                                    'weekend_price',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {tariffs?.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">
                          No tariffs created. Please create tariffs first in the Settings tab.
                        </p>
                      )}
                    </>
                  )}

                  <div className="p-4 border rounded-lg bg-orange-50 mt-4 border-orange-100">
                    <p className="font-semibold mb-3 text-orange-800 flex items-center gap-2">
                      <CookingPot className="w-4 h-4" /> Fuel Policy
                    </p>
                    <div className="space-y-1">
                      <Label>Hourly Fuel Rate (€)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 15"
                        value={modelState.fuel_rate_per_hour || ''}
                        onChange={e => setModelState(prev => ({ ...prev, fuel_rate_per_hour: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-stone-500">Charged at checkout based on engine hours consumed.</p>
                    </div>
                  </div>

                </TabsContent>

                <TabsContent value="units" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground">List the specific boat units that belong to this model.</p>
                  <div className="space-y-2">
                    {boatsState.map((boat, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder={`e.g., ${modelState.name || 'Boat'} ${index + 1}`}
                          value={boat.name || ''}
                          onChange={e => handleBoatNameChange(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBoatInput(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addBoatInput} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          <div className="p-6 border-t bg-background">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModelDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveModel}>Save Model</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
