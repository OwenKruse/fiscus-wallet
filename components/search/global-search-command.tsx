'use client';

import React, { useEffect, useCallback } from 'react';
import { CommandDialog } from '@/components/ui/command';
import { useSearch } from '@/hooks/use-search';
import { SearchInput } from './search-input';
import { SearchResults } from './search-results';

interface GlobalSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchCommand({ open, onOpenChange }: GlobalSearchCommandProps) {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    handleResultSelect,
    handleRecentSearchSelect,
    resetSearch,
    navigateUp,
    navigateDown,
    selectHighlighted,
    resetHighlight,
    highlightedIndex,
    setOnSelect
  } = useSearch({ autoSearch: true });

  // Handle result selection
  const handleSelect = useCallback((result: any, type: 'transaction' | 'goal' | 'page') => {
    handleResultSelect(result, type);
    onOpenChange(false);
  }, [handleResultSelect, onOpenChange]);

  // Set the onSelect callback for keyboard navigation
  useEffect(() => {
    setOnSelect(handleSelect);
    return () => setOnSelect(null);
  }, [setOnSelect, handleSelect]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      resetSearch();
      resetHighlight();
    }
  }, [open, resetSearch, resetHighlight]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  // Handle keyboard navigation within the search dialog
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigateUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDown();
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            navigateUp();
          } else {
            navigateDown();
          }
          break;
        case 'Enter':
          e.preventDefault();
          selectHighlighted();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, navigateUp, navigateDown, selectHighlighted]);

  const handleRecentSelect = (recentQuery: string) => {
    handleRecentSearchSelect(recentQuery);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <SearchInput
        value={query}
        onChange={setQuery}
        autoFocus={open}
      />
      <SearchResults
        results={results}
        loading={loading}
        error={error}
        onSelect={handleSelect}
        recentSearches={recentSearches}
        onRecentSearchSelect={handleRecentSelect}
        query={query}
        highlightedIndex={highlightedIndex}
      />
    </CommandDialog>
  );
}