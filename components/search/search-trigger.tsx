'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchTriggerProps {
  className?: string;
  placeholder?: string;
  onOpen: () => void;
}

export function SearchTrigger({ 
  className, 
  placeholder = "Search...", 
  onOpen 
}: SearchTriggerProps) {
  const handleClick = () => {
    onOpen();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Enter and Space keys for accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-background border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Open search"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{placeholder}</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  );
}