'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SettingsPage() {
  useEffect(() => {
    redirect('/dashboard/settings/general');
  }, []);

  return null;
}
