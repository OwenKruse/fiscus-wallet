'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// Types for search functionality
export interface TransactionSearchResult {
  id: string;
  name: string;
  amount: number;
  date: string;
  accountName: string;
  category: string[];
}

export interface GoalSearchResult {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  status: string;
}

export interface PageSearchResult {
  id: string;
  name: string;
  description: string;
  path: string;
  icon?: string;
}

export interface SearchResponse {
  transactions: TransactionSearchResult[];
  goals: GoalSearchResult[];
  pages: PageSearchResult[];
  totalResults: number;
}

export interface SearchRequest {
  query: string;
  categories?: ('transactions' | 'goals' | 'pages')[];
  limit?: number;
}

interface RecentSearchStorage {
  searches: string[];
  maxItems: number;
  lastUpdated: string;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  recentSearches: string[];
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  // Keyboard navigation
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  selectHighlighted: () => void;
  resetHighlight: () => void;
  setOnSelect: (callback: ((result: any, type: string) => void) | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const RECENT_SEARCHES_KEY = 'global-search-recent';
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_DELAY = 300;

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const onSelectRef = useRef<((result: any, type: string) => void) | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const data: RecentSearchStorage = JSON.parse(stored);
        setRecentSearches(data.searches || []);
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: string[]) => {
    try {
      const data: RecentSearchStorage = {
        searches,
        maxItems: MAX_RECENT_SEARCHES,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save recent searches:', error);
    }
  }, []);

  // Add a search query to recent searches
  const addRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return updated;
    });
  }, [saveRecentSearches]);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.warn('Failed to clear recent searches:', error);
    }
  }, []);

  // Perform search API call
  const performSearch = useCallback(async (searchQuery: string): Promise<SearchResponse> => {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
      } as SearchRequest),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the API response format (success/error wrapper)
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error?.message || 'Search failed');
    }
  }, []);

  // Debounced search function
  const search = useCallback(async (searchQuery: string) => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear error state
    setError(null);

    // If query is empty, clear results
    if (!searchQuery.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    // If query is too short, don't search
    if (searchQuery.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    // Set loading state
    setLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await performSearch(searchQuery);
        setResults(searchResults);
        setError(null);
        setHighlightedIndex(-1); // Reset highlight when new results come in
        
        // Add to recent searches if we got results
        if (searchResults.totalResults > 0) {
          addRecentSearch(searchQuery);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, [performSearch, addRecentSearch]);

  // Get flattened results for keyboard navigation
  const getFlatResults = useCallback(() => {
    if (!results) return [];
    
    const flatResults: Array<{
      item: TransactionSearchResult | GoalSearchResult | PageSearchResult;
      type: 'transaction' | 'goal' | 'page';
      category: string;
    }> = [];

    // Add transactions
    results.transactions.forEach(transaction => {
      flatResults.push({
        item: transaction,
        type: 'transaction',
        category: 'Transactions'
      });
    });

    // Add goals
    results.goals.forEach(goal => {
      flatResults.push({
        item: goal,
        type: 'goal',
        category: 'Goals'
      });
    });

    // Add pages
    results.pages.forEach(page => {
      flatResults.push({
        item: page,
        type: 'page',
        category: 'Pages'
      });
    });

    return flatResults;
  }, [results]);

  // Get recent searches as flat results for navigation
  const getFlatRecentSearches = useCallback(() => {
    return recentSearches.map((search, index) => ({
      item: { query: search, index },
      type: 'recent' as const,
      category: 'Recent Searches'
    }));
  }, [recentSearches]);

  // Get all navigable items (results or recent searches)
  const getNavigableItems = useCallback(() => {
    if (query.trim() && results) {
      return getFlatResults();
    } else if (!query.trim() && recentSearches.length > 0) {
      return getFlatRecentSearches();
    }
    return [];
  }, [query, results, getFlatResults, getFlatRecentSearches, recentSearches]);

  // Keyboard navigation functions
  const navigateUp = useCallback(() => {
    const items = getNavigableItems();
    if (items.length === 0) return;
    
    setHighlightedIndex(prev => {
      if (prev <= 0) return items.length - 1;
      return prev - 1;
    });
  }, [getNavigableItems]);

  const navigateDown = useCallback(() => {
    const items = getNavigableItems();
    if (items.length === 0) return;
    
    setHighlightedIndex(prev => {
      if (prev >= items.length - 1) return 0;
      return prev + 1;
    });
  }, [getNavigableItems]);

  const selectHighlighted = useCallback(() => {
    const items = getNavigableItems();
    if (highlightedIndex < 0 || highlightedIndex >= items.length) return;
    
    const selectedItem = items[highlightedIndex];
    
    if (selectedItem.type === 'recent') {
      const recentQuery = (selectedItem.item as any).query;
      setQuery(recentQuery);
      search(recentQuery);
    } else if (onSelectRef.current) {
      onSelectRef.current(selectedItem.item, selectedItem.type);
    }
  }, [getNavigableItems, highlightedIndex, search]);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  const setOnSelect = useCallback((callback: ((result: any, type: string) => void) | null) => {
    onSelectRef.current = callback;
  }, []);

  // Clear search results
  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setLoading(false);
    setHighlightedIndex(-1);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const value: SearchContextType = {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    search,
    clearResults,
    addRecentSearch,
    clearRecentSearches,
    highlightedIndex,
    setHighlightedIndex,
    navigateUp,
    navigateDown,
    selectHighlighted,
    resetHighlight,
    setOnSelect,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}