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
      checkRedirect(user.email || '');
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

  const checkRedirect = async (email: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Strict Check: Only if they have canViewDashboard or are the primary admin email
    const isAdminEmail = email === 'myasserofficial@gmail.com';
    const hasDashboardAccess = profile?.permissions?.canViewDashboard || profile?.permissions?.isSuperAdmin;

    if (isAdminEmail || hasDashboardAccess) {
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
          const isAdminEmail = email === 'myasserofficial@gmail.com';

          await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username: username || email.split('@')[0],
            email: email,
            role: isAdminEmail ? 'admin' : 'client', // Clear role distinction
            permissions: {
              isSuperAdmin: isAdminEmail,
              canViewDashboard: isAdminEmail,
              canViewHouseboatReservations: isAdminEmail,
              canEditHouseboatReservations: isAdminEmail,
              canManageStaff: isAdminEmail,
              canManageClients: isAdminEmail // New permission
            }
          });
          toast({ title: 'Welcome!', description: 'Your account has been created.' });
        }
      }

      await checkRedirect(email);
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
    <div className="min-h-screen flex bg-white font-sans text-slate-900 pt-16">

      {/* Left Column: Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-24">
        <div className="w-full max-w-sm">

          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-tighter mb-1">
              {isLogin ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-slate-500 text-sm font-semibold">
              {isLogin ? 'Welcome back to Amieira Getaways' : 'Start your journey with us today'}
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleAuth}>
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="username" className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Username</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="username"
                    placeholder="explorer_01"
                    className="pl-11 h-11 border-slate-300 focus:border-green-600 focus:ring-green-600/5 rounded-xl text-md font-medium"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-11 h-11 border-slate-300 focus:border-green-600 focus:ring-green-600/5 rounded-xl text-md font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-11 border-slate-300 focus:border-green-600 focus:ring-green-600/5 rounded-xl text-md font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#010a1f] hover:bg-black text-white font-black rounded-xl transition-all shadow-md active:scale-[0.98] uppercase tracking-wider text-xs"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isLogin ? 'Continue' : 'Create account'}
                </div>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-400">
              <span className="bg-white px-4">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            className="w-full h-11 border-slate-300 text-slate-900 hover:bg-slate-50 rounded-xl font-black transition-all text-xs uppercase tracking-wide"
          >
            <svg className="mr-3 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-8 text-center text-[13px] font-bold">
            <span className="text-slate-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-600 hover:text-green-700 font-black transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Showcase */}
      <div className="hidden lg:block relative flex-1">
        <Image
          src="/showcase.png"
          alt="Amieira Getaways Showcase"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="absolute bottom-16 left-16 right-16">
          <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-4">
            Experience Serenity
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4 max-w-lg tracking-tighter shadow-sm">
            Rediscover nature from the comfort of your house boat.
          </h2>
          <p className="text-white/90 text-lg font-bold max-w-md">
            The Alqueva lake awaits. Join our community and manage your bookings seamlessly.
          </p>
        </div>
      </div>
    </div>
  );
}
