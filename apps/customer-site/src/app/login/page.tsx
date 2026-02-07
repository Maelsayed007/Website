'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/logo';
import { Loader2, ArrowRight, UserPlus, LogIn, Mail, Lock, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [websiteSettings, setWebsiteSettings] = useState<{ logoUrl?: string; companyName?: string } | null>(null);

  useEffect(() => {
    if (user) {
      checkRedirect();
    }
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'main')
        .single();
      if (data?.data) setWebsiteSettings(data.data);
    };
    fetchSettings();
  }, [supabase]);

  const checkRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', user.id)
      .single();

    // Database-driven permission check (no hardcoded emails)
    const hasDashboardAccess =
      profile?.permissions?.canViewDashboard ||
      profile?.permissions?.isSuperAdmin;

    if (hasDashboardAccess) {
      router.push('/dashboard/houseboat-reservations');
    } else {
      router.push('/my-bookings');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // New users get client role with no dashboard access by default
          // Super admin can grant permissions via dashboard
          await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username: username || email.split('@')[0],
            email: email,
            role: 'client',
            permissions: {
              isSuperAdmin: false,
              canViewDashboard: false,
              canViewHouseboatReservations: false,
              canEditHouseboatReservations: false,
              canManageStaff: false,
              canManageClients: false
            }
          });
          toast({ title: 'Welcome!', description: 'Your account has been created.' });
        }
      }

      await checkRedirect();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: isLogin ? 'Login Failed' : 'Signup Failed',
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 pt-44 pb-12 font-sans px-4">
      <div className="w-full max-w-[340px] bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">

        <div className="mb-4">
          <h1 className="text-3xl font-normal tracking-tight text-[#18230F] font-display mb-1">
            Sign in
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[15px] font-bold text-[#18230F] ml-0.5 font-headline">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#34C759]" />
              <Input
                id="email"
                type="email"
                className="pl-11 h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-[15px] font-bold text-[#18230F] ml-0.5 font-headline">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#34C759]" />
              <Input
                id="password"
                type="password"
                className="pl-11 h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-normal rounded-full transition-all shadow-md active:scale-[0.98] tracking-tight text-[20px] font-display border-none mt-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Sign in
              </div>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[15px] font-normal text-[#18230F] font-headline">
            <span className="bg-white px-4">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          className="w-full h-11 border-slate-200 text-[#18230F] hover:bg-slate-50 rounded-full font-bold transition-all text-sm tracking-tight font-headline"
        >
          <svg className="mr-3 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>

        <div className="mt-6 flex items-baseline justify-center gap-1.5 font-bold font-headline text-[16px]">
          <span className="text-[#18230F]/60">Don&apos;t have an account?</span>
          <Link
            href="/register"
            className="text-[#34C759] hover:text-[#2DA64D] transition-all hover:underline underline-offset-4 decoration-[#34C759] font-bold"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
