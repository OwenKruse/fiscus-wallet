import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { SearchProvider } from '../../contexts/search-context';
import { useSearch } from '../use-search';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

// Test component that uses the search hook
function TestComponent({ autoSearch = true, minQueryLength = 2 }) {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    search,
    clearResults,
    resetSearch,
    handleResultSelect,
    handleRecentSearchSelect,
    hasResults,
    hasTransactionResults,
    hasGoalResults,
    hasPageResults,
    flatResults,
    minQueryLength: hookMinQueryLength,
  } = useSearch({ autoSearch, minQueryLength });

  return (
    <div>
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button data-testid="search-button" onClick={() => search()}>
        Search
      </button>
      <button data-testid="reset-button" onClick={resetSearch}>
        Reset
      </button>
      
      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      
      <div data-testid="has-results">{hasResults ? 'true' : 'false'}</div>
      <div data-testid="has-transaction-results">{hasTransactionResults ? 'true' : 'false'}</div>
      <div data-testid="has-goal-results">{hasGoalResults ? 'true' : 'false'}</div>
      <div data-testid="has-page-results">{hasPageResults ? 'true' : 'false'}</div>
      <div data-testid="min-query-length">{hookMinQueryLength}</div>
      <div data-testid="flat-results-count">{flatResults.length}</div>
      
      {results && (
        <div data-testid="results">
          {results.transactions.map((transaction) => (
            <button
              key={transaction.id}
              data-testid={`transaction-${transaction.id}`}
              onClick={() => handleResultSelect(transaction, 'transaction')}
            >
              {transaction.name}
            </button>
          ))}
          {results.goals.map((goal) => (
            <button
              key={goal.id}
              data-testid={`goal-${goal.id}`}
              onClick={() => handleResultSelect(goal, 'goal')}
            >
              {goal.title}
            </button>
          ))}
          {results.pages.map((page) => (
            <button
              key={page.id}
              data-testid={`page-${page.id}`}
              onClick={() => handleResultSelect(page, 'page')}
            >
              {page.name}
            </button>
          ))}
        </div>
      )}
      
      <div data-testid="recent-searches">
        {recentSearches.map((search, index) => (
          <button
            key={index}
            data-testid={`recent-${index}`}
            onClick={() => handleRecentSearchSelect(search)}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

describe('useSearch hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should provide search functionality with default options', () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId('search-input')).toHaveValue('');
    expect(screen.getByTestId('has-results')).toHaveTextContent('false');
    expect(screen.getByTestId('min-query-length')).toHaveTextContent('2');
  });

  it('should auto-search when query changes and meets minimum length', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const mockResponse = {
      transactions: [
        {
          id: '1',
          name: 'Test Transaction',
          amount: 100,
          date: '2024-01-01',
          accountName: 'Test Account',
          category: ['Food'],
        },
      ],
      goals: [],
      pages: [],
      totalResults: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    // Advance timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('has-results')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('has-transaction-results')).toHaveTextContent('true');
    expect(screen.getByTestId('has-goal-results')).toHaveTextContent('false');
    expect(screen.getByTestId('has-page-results')).toHaveTextContent('false');
    expect(screen.getByTestId('flat-results-count')).toHaveTextContent('1');
  });

  it('should not auto-search when autoSearch is disabled', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <SearchProvider>
        <TestComponent autoSearch={false} />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('has-results')).toHaveTextContent('false');
  });

  it('should handle manual search when autoSearch is disabled', async () => {
    const user = userEvent.setup();

    const mockResponse = {
      transactions: [],
      goals: [],
      pages: [],
      totalResults: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent autoSearch={false} />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    await user.type(input, 'test');
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should respect custom minimum query length', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <SearchProvider>
        <TestComponent minQueryLength={3} />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    
    // Type 2 characters (below minimum)
    await user.type(input, 'te');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockFetch).not.toHaveBeenCalled();

    // Type 3 characters (meets minimum)
    await user.type(input, 's');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('min-query-length')).toHaveTextContent('3');
  });

  it('should handle transaction result selection', async () => {
    const user = userEvent.setup();

    const mockResponse = {
      transactions: [
        {
          id: '1',
          name: 'Test Transaction',
          amount: 100,
          date: '2024-01-01',
          accountName: 'Test Account',
          category: ['Food'],
        },
      ],
      goals: [],
      pages: [],
      totalResults: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    // Trigger search first
    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('transaction-1')).toBeInTheDocument();
    });

    // Click on transaction result
    await user.click(screen.getByTestId('transaction-1'));

    expect(mockPush).toHaveBeenCalledWith('/transactions?highlight=1');
  });

  it('should handle goal result selection', async () => {
    const user = userEvent.setup();

    const mockResponse = {
      transactions: [],
      goals: [
        {
          id: '1',
          title: 'Test Goal',
          description: 'Test Description',
          targetAmount: 1000,
          currentAmount: 500,
          progress: 50,
          status: 'active',
        },
      ],
      pages: [],
      totalResults: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('goal-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('goal-1'));

    expect(mockPush).toHaveBeenCalledWith('/goals?focus=1');
  });

  it('should handle page result selection', async () => {
    const user = userEvent.setup();

    const mockResponse = {
      transactions: [],
      goals: [],
      pages: [
        {
          id: '1',
          name: 'Test Page',
          description: 'Test Page Description',
          path: '/test',
          icon: 'TestIcon',
        },
      ],
      totalResults: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('page-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('page-1'));

    expect(mockPush).toHaveBeenCalledWith('/test');
  });

  it('should handle recent search selection', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // Mock localStorage to return existing recent searches
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        searches: ['recent search'],
        maxItems: 5,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      })
    );

    const mockResponse = {
      transactions: [],
      goals: [],
      pages: [],
      totalResults: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    await user.click(screen.getByTestId('recent-0'));

    expect(screen.getByTestId('search-input')).toHaveValue('recent search');

    // Should trigger auto-search
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should reset search state', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const mockResponse = {
      transactions: [],
      goals: [],
      pages: [],
      totalResults: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    // Set query and trigger search
    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Reset search
    await user.click(screen.getByTestId('reset-button'));

    expect(screen.getByTestId('search-input')).toHaveValue('');
    expect(screen.getByTestId('has-results')).toHaveTextContent('false');
  });

  it('should provide correct flat results for keyboard navigation', async () => {
    const user = userEvent.setup();

    const mockResponse = {
      transactions: [
        {
          id: '1',
          name: 'Transaction 1',
          amount: 100,
          date: '2024-01-01',
          accountName: 'Account 1',
          category: ['Food'],
        },
      ],
      goals: [
        {
          id: '1',
          title: 'Goal 1',
          description: 'Goal Description',
          targetAmount: 1000,
          currentAmount: 500,
          progress: 50,
          status: 'active',
        },
      ],
      pages: [
        {
          id: '1',
          name: 'Page 1',
          description: 'Page Description',
          path: '/page1',
          icon: 'PageIcon',
        },
      ],
      totalResults: 3,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('flat-results-count')).toHaveTextContent('3');
    });

    expect(screen.getByTestId('has-transaction-results')).toHaveTextContent('true');
    expect(screen.getByTestId('has-goal-results')).toHaveTextContent('true');
    expect(screen.getByTestId('has-page-results')).toHaveTextContent('true');
  });
});