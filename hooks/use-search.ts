'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch as useSearchContext } from '@/contexts/search-context';
import type { TransactionSearchResult, GoalSearchResult, PageSearchResult } from '@/contexts/search-context';

export interface UseSearchOptions {
  autoSearch?: boolean;
  minQueryLength?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    autoSearch = true,
    minQueryLength = 2,
  } = options;

  const router = useRouter();
  const searchContext = useSearchContext();

  // Auto-search when query changes (if enabled)
  useEffect(() => {
    if (autoSearch && searchContext.query.length >= minQueryLength) {
      searchContext.search(searchContext.query);
    } else if (searchContext.query.length < minQueryLength) {
      searchContext.clearResults();
    }
  }, [searchContext.query, autoSearch, minQueryLength, searchContext]);

  // Handle result selection and navigation
  const handleResultSelect = useCallback((
    result: TransactionSearchResult | GoalSearchResult | PageSearchResult,
    type: 'transaction' | 'goal' | 'page'
  ) => {
    switch (type) {
      case 'transaction':
        // Navigate to transactions page with selected transaction highlighted
        router.push(`/transactions?highlight=${result.id}`);
        break;
      
      case 'goal':
        // Navigate to goals page with selected goal focused
        router.push(`/goals?focus=${result.id}`);
        break;
      
      case 'page':
        const pageResult = result as PageSearchResult;
        // Navigate directly to the page
        router.push(pageResult.path);
        break;
    }
    
    // Clear search results after navigation
    searchContext.clearResults();
  }, [router, searchContext]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((recentQuery: string) => {
    searchContext.setQuery(recentQuery);
    if (autoSearch) {
      searchContext.search(recentQuery);
    }
  }, [searchContext, autoSearch]);

  // Perform manual search (useful when autoSearch is disabled)
  const performSearch = useCallback((query?: string) => {
    const searchQuery = query || searchContext.query;
    if (searchQuery.length >= minQueryLength) {
      searchContext.search(searchQuery);
    }
  }, [searchContext, minQueryLength]);

  // Reset search state
  const resetSearch = useCallback(() => {
    searchContext.setQuery('');
    searchContext.clearResults();
  }, [searchContext]);

  // Check if there are any results
  const hasResults = searchContext.results && searchContext.results.totalResults > 0;
  
  // Check if there are results for specific categories
  const hasTransactionResults = searchContext.results && searchContext.results.transactions.length > 0;
  const hasGoalResults = searchContext.results && searchContext.results.goals.length > 0;
  const hasPageResults = searchContext.results && searchContext.results.pages.length > 0;

  // Get flattened results for keyboard navigation
  const flatResults = useCallback(() => {
    if (!searchContext.results) return [];
    
    const results: Array<{
      item: TransactionSearchResult | GoalSearchResult | PageSearchResult;
      type: 'transaction' | 'goal' | 'page';
      category: string;
    }> = [];

    // Add transactions
    searchContext.results.transactions.forEach(transaction => {
      results.push({
        item: transaction,
        type: 'transaction',
        category: 'Transactions'
      });
    });

    // Add goals
    searchContext.results.goals.forEach(goal => {
      results.push({
        item: goal,
        type: 'goal',
        category: 'Goals'
      });
    });

    // Add pages
    searchContext.results.pages.forEach(page => {
      results.push({
        item: page,
        type: 'page',
        category: 'Pages'
      });
    });

    return results;
  }, [searchContext.results]);

  return {
    // Search state
    query: searchContext.query,
    setQuery: searchContext.setQuery,
    results: searchContext.results,
    loading: searchContext.loading,
    error: searchContext.error,
    
    // Recent searches
    recentSearches: searchContext.recentSearches,
    clearRecentSearches: searchContext.clearRecentSearches,
    
    // Search actions
    search: performSearch,
    clearResults: searchContext.clearResults,
    resetSearch,
    
    // Result handling
    handleResultSelect,
    handleRecentSearchSelect,
    
    // Keyboard navigation
    highlightedIndex: searchContext.highlightedIndex,
    setHighlightedIndex: searchContext.setHighlightedIndex,
    navigateUp: searchContext.navigateUp,
    navigateDown: searchContext.navigateDown,
    selectHighlighted: searchContext.selectHighlighted,
    resetHighlight: searchContext.resetHighlight,
    setOnSelect: searchContext.setOnSelect,
    
    // Computed properties
    hasResults,
    hasTransactionResults,
    hasGoalResults,
    hasPageResults,
    flatResults: flatResults(),
    
    // Configuration
    minQueryLength,
  };
}