'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type SupabaseContextType = {
    supabase: SupabaseClient;
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export default function SupabaseProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Sync session across tabs using storage events
        const handleStorageChange = (e: StorageEvent) => {
            // Supabase stores auth state with keys starting with 'sb-'
            if (e.key?.startsWith('sb-') && e.key?.includes('auth-token')) {
                // Session changed in another tab, refresh this tab's state
                router.refresh();
            }
        };

        // Listen for storage changes from other tabs
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorageChange);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (event === 'SIGNED_IN') {
                router.refresh();
            }
            if (event === 'SIGNED_OUT') {
                router.refresh();
                router.push('/');
            }
            if (event === 'TOKEN_REFRESHED') {
                // Session was refreshed, update state
                setSession(session);
            }
        });

        return () => {
            subscription.unsubscribe();
            if (typeof window !== 'undefined') {
                window.removeEventListener('storage', handleStorageChange);
            }
        };
    }, [router, supabase]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <SupabaseContext.Provider value={{ supabase, user, session, isLoading, signOut }}>
            {children}
        </SupabaseContext.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};

// Compatibility hook for existing code
export const useAuth = () => {
    const { user, isLoading, signOut } = useSupabase();
    return {
        user,
        isUserLoading: isLoading,
        signOut,
    };
};

// Hook for accessing Supabase client (replaces useFirestore)
export const useFirestore = () => {
    const { supabase } = useSupabase();
    return supabase;
};
