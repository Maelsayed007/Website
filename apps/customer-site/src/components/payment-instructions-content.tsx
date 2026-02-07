'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type PaymentInstructionsContentProps = {
    dictionary: {
        title: string;
        subtitle: string;
        instructionsTitle: string;
        instructionsSubtitle: string;
        noInstructions: string;
        returnHome: string;
    };
};

type WebsiteSettings = {
    payment_instructions?: string;
}

export default function PaymentInstructionsContent({ dictionary }: PaymentInstructionsContentProps) {
    const { supabase } = useSupabase();
    const [settings, setSettings] = useState<WebsiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!supabase) return;
        const fetchSettings = async () => {
            setIsLoading(true);
            const { data: record } = await supabase
                .from('site_settings')
                .select('data')
                .eq('key', 'main')
                .single();

            if (record && record.data) {
                setSettings(record.data as any);
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [supabase]);

    return (
        <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
            <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl" style={{ color: '#010a1f' }}>
                    {dictionary.title}
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    {dictionary.subtitle}
                </p>
            </div>

            <Card className="mt-12 rounded-2xl border-gray-100 shadow-xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2" style={{ color: '#010a1f' }}>
                        <Wallet className="h-5 w-5 text-emerald-600" />
                        {dictionary.instructionsTitle}
                    </CardTitle>
                    <CardDescription>
                        {dictionary.instructionsSubtitle}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    ) : settings?.payment_instructions ? (
                        <div className="prose prose-sm max-w-none text-[#010a1f] whitespace-pre-wrap font-medium leading-relaxed">
                            {settings.payment_instructions}
                        </div>
                    ) : (
                        <p className="text-muted-foreground italic">
                            {dictionary.noInstructions}
                        </p>
                    )}
                </CardContent>
            </Card>
            <div className="mt-10 text-center">
                <Button asChild className="rounded-full px-8 h-12 font-bold bg-[#18230F] hover:bg-[#25351a] text-white shadow-lg transition-all hover:shadow-xl">
                    <Link href="/">{dictionary.returnHome}</Link>
                </Button>
            </div>
        </div>
    );
}
