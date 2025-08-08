'use client';

import React from 'react';
import { CommandGroup } from '@/components/ui/command';

interface SearchResultsGroupProps {
  title: string;
  children: React.ReactNode;
  count?: number;
}

export function SearchResultsGroup({ title, children, count }: SearchResultsGroupProps) {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;
  
  return (
    <CommandGroup heading={displayTitle}>
      {children}
    </CommandGroup>
  );
}