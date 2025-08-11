'use client';

import React from 'react';
import { CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Loader2 } from 'lucide-react';
import type { SearchResponse, TransactionSearchResult, GoalSearchResult, PageSearchResult } from '@/types';
import { SearchResultsGroup } from './search-results-group';
import { TransactionResult } from './transaction-result';
import { GoalResult } from './goal-result';
import { PageResult } from './page-result';

interface SearchResultsProps {
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  onSelect: (result: TransactionSearchResult | GoalSearchResult | PageSearchResult, type: 'transaction' | 'goal' | 'page') => void;
  recentSearches: string[];
  onRecentSearchSelect: (query: string) => void;
  query: string;
  highlightedIndex: number;
}

export function SearchResults({
  results,
  loading,
  error,
  onSelect,
  recentSearches,
  onRecentSearchSelect,
  query,
  highlightedIndex
}: SearchResultsProps) {
  // Show recent searches when there's no query
  const showRecentSearches = !query.trim() && recentSearches.length > 0;
  
  // Show loading state
  if (loading) {
    return (
      <CommandList>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      </CommandList>
    );
  }

  // Show error state
  if (error) {
    return (
      <CommandList>
        <div className="py-6 text-center text-sm text-destructive">
          {error}
        </div>
      </CommandList>
    );
  }

  // Show recent searches
  if (showRecentSearches) {
    return (
      <CommandList>
        <CommandGroup heading="Recent Searches">
          {recentSearches.map((recentQuery, index) => (
            <CommandItem
              key={`recent-${recentQuery}-${index}`}
              value={recentQuery}
              onSelect={() => onRecentSearchSelect(recentQuery)}
              className={`cursor-pointer ${
                highlightedIndex === index ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <span>{recentQuery}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    );
  }

  // Show search results
  if (results && results.totalResults > 0) {
    let currentIndex = 0;
    
    return (
      <CommandList>
        {/* Transaction Results */}
        {results.transactions.length > 0 && (
          <SearchResultsGroup title="Transactions" count={results.transactions.length}>
            {results.transactions.map((transaction) => {
              const isHighlighted = highlightedIndex === currentIndex;
              currentIndex++;
              return (
                <TransactionResult
                  key={transaction.id}
                  transaction={transaction}
                  onSelect={(transaction) => onSelect(transaction, 'transaction')}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </SearchResultsGroup>
        )}

        {/* Goal Results */}
        {results.goals.length > 0 && (
          <SearchResultsGroup title="Goals" count={results.goals.length}>
            {results.goals.map((goal) => {
              const isHighlighted = highlightedIndex === currentIndex;
              currentIndex++;
              return (
                <GoalResult
                  key={goal.id}
                  goal={goal}
                  onSelect={(goal) => onSelect(goal, 'goal')}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </SearchResultsGroup>
        )}

        {/* Page Results */}
        {results.pages.length > 0 && (
          <SearchResultsGroup title="Pages" count={results.pages.length}>
            {results.pages.map((page) => {
              const isHighlighted = highlightedIndex === currentIndex;
              currentIndex++;
              return (
                <PageResult
                  key={page.id}
                  page={page}
                  onSelect={(page) => onSelect(page, 'page')}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </SearchResultsGroup>
        )}
      </CommandList>
    );
  }

  // Show no results state
  if (query.trim() && results && results.totalResults === 0) {
    return (
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>• No transactions found</p>
              <p>• No goals found</p>
              <p>• No pages found</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Try searching with different keywords
            </p>
          </div>
        </CommandEmpty>
      </CommandList>
    );
  }

  // Default empty state
  return (
    <CommandList>
      <CommandEmpty>
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Start typing to search transactions, goals, and pages
          </p>
        </div>
      </CommandEmpty>
    </CommandList>
  );
}