'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    UserPlus,
    Mail,
    Lock,
    ChevronRight,
    ChevronLeft,
    Globe,
    Settings2,
    ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PasswordStrengthMeter from '@/components/auth/password-strength-meter';
import PhoneInput from '@/components/auth/phone-input';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const steps = [
    { id: 'method', title: 'Choose Method' },
    { id: 'essentials', title: 'Essentials' },
    { id: 'profile', title: 'Profile' },
];

export default function RegisterPage() {
    const { user } = useAuth();
    const { supabase } = useSupabase();
    const router = useRouter();
    const { toast } = useToast();

    // Navigation state
    const [currentStep, setCurrentStep] = useState(0);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [language, setLanguage] = useState('en');
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [showPreferences, setShowPreferences] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            checkRedirect();
        }
    }, [user]);

    const checkRedirect = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('permissions')
            .eq('id', currentUser.id)
            .single();

        const hasDashboardAccess =
            profile?.permissions?.canViewDashboard ||
            profile?.permissions?.isSuperAdmin;

        if (hasDashboardAccess) {
            router.push('/dashboard/houseboat-reservations');
        } else {
            router.push('/my-bookings');
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted || !privacyAccepted) {
            toast({
                variant: 'destructive',
                title: 'Validation Failed',
                description: 'Please accept the Terms and Privacy Policy to continue.'
            });
            return;
        }

        setIsLoading(true);

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        full_name: `${firstName} ${lastName}`.trim()
                    }
                },
            });

            if (signUpError) throw signUpError;

            if (signUpData.user) {
                // Extended Profile Sync
                await supabase.from('profiles').insert({
                    id: signUpData.user.id,
                    username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}` || email.split('@')[0],
                    email: email,
                    role: 'client',
                    permissions: {
                        isSuperAdmin: false,
                        canViewDashboard: false,
                        canViewHouseboatReservations: false,
                        canEditHouseboatReservations: false,
                        canManageStaff: false,
                        canManageClients: false
                    },
                    metadata: {
                        first_name: firstName,
                        last_name: lastName,
                        phone,
                        preferred_language: language,
                        marketing_opt_in: marketingOptIn,
                        dietary_restrictions: dietaryRestrictions
                    }
                });
                toast({ title: 'Welcome to the Club!', description: 'Please check your email to activate your account.' });
                // Redirect to waiting page for email confirmation
                router.push(`/confirm-email?email=${encodeURIComponent(email)}`);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: error.message || 'Please check your information.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sign-in failed', description: e.message });
        }
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 pt-40 pb-12 font-sans px-4">

            {/* Progress Bar */}
            <div className="absolute top-28 left-1/2 -translate-x-1/2 flex items-center gap-4 w-full max-w-[320px]">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex-1 space-y-2.5">
                        <div className={cn(
                            "h-1 rounded-full transition-all duration-500",
                            idx <= currentStep ? "bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.3)]" : "bg-slate-200"
                        )} />
                        <div className={cn(
                            "text-lg font-normal font-display text-center tracking-tight transition-colors duration-500",
                            idx === currentStep ? "text-[#18230F]" : "text-[#18230F]/30"
                        )}>
                            {s.title}
                        </div>
                    </div>
                ))}
            </div>

            <div className="w-full max-w-[380px] bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                        <motion.div
                            key="step-0"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            <div className="text-center">
                                <h1 className="text-4xl font-normal tracking-tight text-[#18230F] font-display mb-2">
                                    Join the Club
                                </h1>
                                <p className="text-[#18230F]/70 font-headline font-medium text-base">Select your preferred method</p>
                            </div>

                            <div className="grid gap-3">
                                <Button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    className="w-full h-12 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-full font-bold shadow-sm transition-all flex items-center justify-center gap-3 font-headline"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continue with Google
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                                <div className="relative flex justify-center text-[11px] font-bold text-[#18230F]/60">
                                    <span className="bg-white px-4">or continue with email</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleNext}
                                className="w-full h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-normal rounded-full transition-all shadow-md flex items-center justify-center gap-2 group tracking-tight text-[20px] font-display border-none"
                            >
                                Join with Email <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div
                            key="step-1"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-3xl font-normal tracking-tight text-[#18230F] font-display mb-1">
                                    Essentials
                                </h1>
                                <p className="text-[#18230F]/70 font-headline font-medium text-sm">Tell us who you are</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">First Name</Label>
                                    <Input
                                        placeholder="Jane"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Last Name</Label>
                                    <Input
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#18230F]/40" />
                                    <Input
                                        type="email"
                                        placeholder="jane@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-11 h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Create Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#18230F]/40" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-11 h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                                    />
                                </div>
                                <PasswordStrengthMeter password={password} />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="h-12 w-12 rounded-full border-slate-200 p-0 flex items-center justify-center text-[#18230F]/60 hover:bg-slate-50"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <Button
                                    disabled={!firstName || !lastName || !email || password.length < 6}
                                    onClick={handleNext}
                                    className="flex-1 h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-normal rounded-full transition-all shadow-md flex items-center justify-center gap-2 group tracking-tight text-[20px] font-display border-none"
                                >
                                    Continue <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            key="step-2"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-3xl font-normal tracking-tight text-[#18230F] font-display mb-1">
                                    Profile
                                </h1>
                                <p className="text-[#18230F]/70 font-headline font-medium text-sm">Help us serve you better</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Language</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger className="h-11 border-slate-200 rounded-xl font-medium focus:border-2 focus:border-[#34C759]">
                                            <SelectValue placeholder="English" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="en">English (EN)</SelectItem>
                                            <SelectItem value="pt">Portuguese (PT)</SelectItem>
                                            <SelectItem value="es">Spanish (ES)</SelectItem>
                                            <SelectItem value="fr">French (FR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <div className="flex items-center gap-2 h-11 px-3 border border-slate-200 rounded-xl bg-white">
                                        <Globe className="w-4 h-4 text-slate-400" />
                                        <span className="text-[13px] font-medium font-headline text-[#18230F]">Auto-detect</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Phone Number</Label>
                                <PhoneInput value={phone} onChange={setPhone} />
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPreferences(!showPreferences)}
                                    className="flex items-center gap-2 text-[#34C759] font-bold text-sm font-headline group"
                                >
                                    <Settings2 className={cn("w-4 h-4 transition-transform", showPreferences && "rotate-180")} />
                                    {showPreferences ? 'Hide Preferences' : 'Help us personalize your trip'}
                                </button>

                                <AnimatePresence>
                                    {showPreferences && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 space-y-1.5">
                                                <Label className="text-[13px] font-bold text-[#18230F] ml-0.5 font-headline">Dietary Restrictions</Label>
                                                <Input
                                                    placeholder="e.g. Vegetarian, Gluten-free"
                                                    value={dietaryRestrictions}
                                                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                                                    className="h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl space-y-3 shadow-inner text-[#18230F]">
                                <div className="flex items-start gap-3">
                                    <Checkbox id="marketing" checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(!!v)} className="mt-1 border-slate-300 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]" />
                                    <Label htmlFor="marketing" className="text-[12px] font-medium leading-short text-[#18230F]/70 font-headline cursor-pointer">
                                        I wish to receive exclusive offers for future cruises or events.
                                    </Label>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} className="mt-1 border-slate-300 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]" />
                                    <Label htmlFor="terms" className="text-[12px] font-medium leading-short text-[#18230F]/70 font-headline cursor-pointer">
                                        I accept the <Link href="/terms" className="text-[#34C759] underline underline-offset-2 hover:text-[#2DA64D]">Terms & Conditions</Link>.
                                    </Label>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(v) => setPrivacyAccepted(!!v)} className="mt-1 border-slate-300 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]" />
                                    <Label htmlFor="privacy" className="text-[12px] font-medium leading-short text-[#18230F]/70 font-headline cursor-pointer">
                                        I agree to the <Link href="/privacy" className="text-[#34C759] underline underline-offset-2 hover:text-[#2DA64D]">Privacy Policy</Link>.
                                    </Label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="h-12 w-12 rounded-full border-slate-200 p-0 flex items-center justify-center text-[#18230F]/60 hover:bg-slate-50"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <Button
                                    disabled={isLoading || !termsAccepted || !privacyAccepted}
                                    onClick={handleAuth}
                                    className="flex-1 h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-normal rounded-full transition-all shadow-md flex items-center justify-center gap-2 group tracking-tight text-[20px] font-display border-none"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                        <>Join the Club <ShieldCheck className="w-5 h-5 transition-all group-hover:scale-110" /></>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="mt-10 text-center text-[13px] font-bold font-headline">
                    <span className="text-[#18230F]/60">Already a member? </span>
                    <Link
                        href="/login"
                        className="text-[#34C759] hover:text-[#2DA64D] transition-colors underline underline-offset-4 font-bold"
                    >
                        Log in here
                    </Link>
                </p>

            </div>
        </div>
    );
}
