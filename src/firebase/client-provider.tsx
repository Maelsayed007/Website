'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseApp, auth, firestore } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * FirebaseClientProvider is a client-side component that wraps its children
 * with the FirebaseProvider. It ensures that Firebase services are initialized
 * once and passed down, providing a stable context for all Firebase hooks.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The Firebase services are imported from the memoized instance in '@/firebase/index.ts'.
  // This ensures they are initialized only once.
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
