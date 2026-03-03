'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, KeyRound, Loader2, Lock, Ship, User } from 'lucide-react';

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data?.requiresMfa && data?.challengeToken) {
        setChallengeToken(String(data.challengeToken));
        setPendingUsername(String(data?.user?.username || username));
        setStep('mfa');
        setPassword('');
        return;
      }

      window.location.href = redirect;
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code: mfaCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'MFA verification failed');
        return;
      }

      window.location.href = redirect;
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setError('');
    setMfaCode('');
    setChallengeToken('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-4">
            <Ship className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Amieira Marina Management</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <form onSubmit={step === 'credentials' ? handlePasswordStep : handleMfaStep} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {step === 'credentials' && (
              <>
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
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {step === 'mfa' && (
              <div className="space-y-2">
                <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Verification Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-12 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20 tracking-[0.3em]"
                    placeholder="000000"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code from your authenticator app for {pendingUsername || username}.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                isLoading ||
                (step === 'credentials' ? !username || !password : mfaCode.length !== 6 || !challengeToken)
              }
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wider rounded-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {step === 'credentials' ? 'Checking credentials...' : 'Verifying code...'}
                </>
              ) : (
                step === 'credentials' ? 'Continue' : 'Verify and Sign In'
              )}
            </Button>

            {step === 'mfa' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToCredentials}
                className="w-full h-11 rounded-xl border-slate-200"
              >
                Back
              </Button>
            )}
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">Authorized personnel only</p>
      </div>
    </div>
  );
}
