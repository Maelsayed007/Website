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
  CardFooter,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type WebsiteSettings = {
  pdf_terms_and_conditions?: string;
  pdf_other_details?: string;
};

const SETTINGS_DOC_ID = 'main';

export default function DocumentsSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [settings, setSettings] = useState<Partial<WebsiteSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('website_settings')
      .select('*')
      .eq('id', SETTINGS_DOC_ID)
      .single();

    if (data) {
      setSettings({
        pdf_terms_and_conditions: data.pdf_terms_and_conditions || '',
        pdf_other_details: data.pdf_other_details || ''
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, [supabase]);

  const handleInputChange = (field: keyof WebsiteSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('website_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', SETTINGS_DOC_ID);

      if (error) throw error;
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
            value={settings.pdf_terms_and_conditions || ''}
            onChange={(e) => handleInputChange('pdf_terms_and_conditions', e.target.value)}
            placeholder="Enter the terms and conditions paragraph..."
            className="min-h-[150px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf-details">Other Details (for Financial Summary)</Label>
          <Textarea
            id="pdf-details"
            value={settings.pdf_other_details || ''}
            onChange={(e) => handleInputChange('pdf_other_details', e.target.value)}
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
