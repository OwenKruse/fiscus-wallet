'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Dynamically import the settings content to prevent SSR issues
const SettingsPageContent = dynamic(
  () => import('@/components/settings/settings-page-content').then(mod => ({ default: mod.SettingsPageContent })),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Separator />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    ),
  }
);

export default function SettingsPage() {
  return <SettingsPageContent />;
}