'use client';

import { useMemo } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
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
    paymentInstructions?: string;
}

export default function PaymentInstructionsContent({ dictionary }: PaymentInstructionsContentProps) {
    const firestore = useFirestore();

    const settingsDocRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'website_settings', 'main');
    }, [firestore]);

    const { data: settings, isLoading } = useDoc<WebsiteSettings>(settingsDocRef);

    return (
        <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
            <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
                    {dictionary.title}
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    {dictionary.subtitle}
                </p>
            </div>

            <Card className="mt-12">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5"/>
                        {dictionary.instructionsTitle}
                    </CardTitle>
                    <CardDescription>
                        {dictionary.instructionsSubtitle}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    ) : settings?.paymentInstructions ? (
                        <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
                           {settings.paymentInstructions}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">
                            {dictionary.noInstructions}
                        </p>
                    )}
                </CardContent>
            </Card>
            <div className="mt-8 text-center">
                <Button asChild>
                    <Link href="/">{dictionary.returnHome}</Link>
                </Button>
            </div>
        </div>
    );
}
