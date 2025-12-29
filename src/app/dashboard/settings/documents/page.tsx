'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type WebsiteSettings = {
  pdfTermsAndConditions?: string;
  pdfOtherDetails?: string;
};

const SETTINGS_DOC_ID = 'main';

export default function DocumentsSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [settings, setSettings] = useState<Partial<WebsiteSettings>>({});
  const [isSaving, setIsSaving] = useState(false);

  const settingsDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'website_settings', SETTINGS_DOC_ID);
  }, [firestore]);

  const { data: fetchedSettings, isLoading } =
    useDoc<WebsiteSettings>(settingsDocRef);

  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        pdfTermsAndConditions: fetchedSettings.pdfTermsAndConditions || '',
        pdfOtherDetails: fetchedSettings.pdfOtherDetails || ''
      });
    }
  }, [fetchedSettings]);

  const handleInputChange = (field: keyof WebsiteSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, 'website_settings', SETTINGS_DOC_ID),
        settings,
        { merge: true }
      );
      toast({ title: 'Success', description: 'Document settings updated.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save document settings.',
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
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
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
          <FileText className="h-5 w-5" />
          PDF Document Settings
        </CardTitle>
        <CardDescription>
          Manage the content of text blocks used in generated PDF documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pdf-terms">Terms &amp; Responsibility (for Check-in Manifest)</Label>
          <Textarea
            id="pdf-terms"
            value={settings.pdfTermsAndConditions || ''}
            onChange={(e) => handleInputChange('pdfTermsAndConditions', e.target.value)}
            placeholder="Enter the terms and conditions paragraph..."
            className="min-h-[150px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf-details">Other Details (for Financial Summary)</Label>
           <Textarea
            id="pdf-details"
            value={settings.pdfOtherDetails || ''}
            onChange={(e) => handleInputChange('pdfOtherDetails', e.target.value)}
            placeholder="Enter any additional details or notes..."
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Document Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
}
