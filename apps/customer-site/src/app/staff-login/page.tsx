'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User, AlertCircle, Ship } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/dashboard';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            // Force full page reload to ensure cookies are sent to server middleware
            window.location.href = redirect;
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-4">
                        <Ship className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Portal</h1>
                    <p className="text-slate-500 text-sm mt-1">Amieira Marina Management</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600 text-sm">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Username</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wider rounded-xl transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-slate-400 text-xs mt-6">
                    Authorized personnel only
                </p>
            </div>
        </div>
    );
}
