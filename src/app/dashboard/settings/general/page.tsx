'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  Camera,
  Building,
  Mail,
  Phone,
  Clock,
  Instagram,
  Facebook,
  Music,
  MapPin,
  Link as LinkIcon,
  Wallet,
  Image as ImageIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type SocialLinks = {
  tiktok?: string;
  facebook?: string;
  instagram?: string;
};

type WebsiteSettings = {
  companyName: string;
  logoUrl: string;
  heroImageUrl?: string;
  contactEmail: string;
  restaurantEmail: string;
  contactPhone1: string;
  contactPhone2: string;
  workingHours: string;
  socialLinks: SocialLinks;
  address: string;
  websiteUrl: string;
  paymentInstructions?: string;
};

const SETTINGS_KEY = 'main';

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Partial<WebsiteSettings>>({
    socialLinks: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', SETTINGS_KEY)
        .single();

      if (data && data.data) {
        setSettings(data.data);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [supabase]);


  const handleInputChange = (field: keyof WebsiteSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (
    platform: keyof SocialLinks,
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        [platform]: value,
      },
    }));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'heroImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      handleInputChange(field, event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: SETTINGS_KEY, data: settings });

      if (error) throw error;

      toast({ title: 'Success', description: 'Website settings updated.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-sm mt-2" />
        </CardHeader>
        <CardContent className="space-y-8">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-24 w-full max-w-md" />
          <Skeleton className="h-10 w-full max-w-md" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          General Website Settings
        </CardTitle>
        <CardDescription>
          Manage your company details, logo, and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="space-y-6 p-6 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">Company Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="company-name"
                    className="flex items-center gap-2"
                  >
                    <Building className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input
                    id="company-name"
                    value={settings.companyName || ''}
                    onChange={e => handleInputChange('companyName', e.target.value)}
                    placeholder="e.g., Amieira Getaways"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Company Logo
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center">
                      {settings.logoUrl ? (
                        <Image
                          src={settings.logoUrl}
                          alt="Company Logo"
                          width={96}
                          height={96}
                          className="object-contain rounded-lg"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No Logo
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={(e) => handleImageUpload(e, 'logoUrl')}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">
                Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Reservations Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={settings.contactEmail || ''}
                    onChange={e =>
                      handleInputChange('contactEmail', e.target.value)
                    }
                    placeholder="reservations@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="restaurant-email"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Restaurant Email
                  </Label>
                  <Input
                    id="restaurant-email"
                    type="email"
                    value={settings.restaurantEmail || ''}
                    onChange={e =>
                      handleInputChange('restaurantEmail', e.target.value)
                    }
                    placeholder="restaurant@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-phone1"
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Primary Phone
                  </Label>
                  <Input
                    id="contact-phone1"
                    value={settings.contactPhone1 || ''}
                    onChange={e =>
                      handleInputChange('contactPhone1', e.target.value)
                    }
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-phone2"
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Secondary Phone
                  </Label>
                  <Input
                    id="contact-phone2"
                    value={settings.contactPhone2 || ''}
                    onChange={e =>
                      handleInputChange('contactPhone2', e.target.value)
                    }
                    placeholder="+1 098 765 432"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={settings.address || ''}
                    onChange={e => handleInputChange('address', e.target.value)}
                    placeholder="e.g., 123 Marina Ave, Amieira"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="space-y-6 p-6 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">Visuals</h3>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Homepage Hero Image
                </Label>
                <div className="flex flex-col items-start gap-4">
                  <div className="w-full aspect-video rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                    {settings.heroImageUrl ? (
                      <Image
                        src={settings.heroImageUrl}
                        alt="Hero Image Preview"
                        width={300}
                        height={169}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No Hero Image Set
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={heroInputRef}
                    onChange={(e) => handleImageUpload(e, 'heroImageUrl')}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => heroInputRef.current?.click()}
                  >
                    Upload New Hero
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6 border rounded-lg">
              <h3 className="font-semibold text-lg border-b pb-2">Social Media</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tiktok" className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    TikTok URL
                  </Label>
                  <Input
                    id="tiktok"
                    value={settings.socialLinks?.tiktok || ''}
                    onChange={e => handleSocialLinkChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@your-profile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    Facebook URL
                  </Label>
                  <Input
                    id="facebook"
                    value={settings.socialLinks?.facebook || ''}
                    onChange={e =>
                      handleSocialLinkChange('facebook', e.target.value)
                    }
                    placeholder="https://facebook.com/your-page"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram URL
                  </Label>
                  <Input
                    id="instagram"
                    value={settings.socialLinks?.instagram || ''}
                    onChange={e =>
                      handleSocialLinkChange('instagram', e.target.value)
                    }
                    placeholder="https://instagram.com/your-profile"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
}
