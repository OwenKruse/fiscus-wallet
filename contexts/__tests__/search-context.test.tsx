import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { SearchProvider, useSearch } from '../search-context';

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

// Test component that uses the search context
function TestComponent() {
  const {
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
  } = useSearch();

  return (
    <div>
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button data-testid="search-button" onClick={() => search(query)}>
        Search
      </button>
      <button data-testid="clear-button" onClick={clearResults}>
        Clear
      </button>
      <button data-testid="add-recent" onClick={() => addRecentSearch('test query')}>
        Add Recent
      </button>
      <button data-testid="clear-recent" onClick={clearRecentSearches}>
        Clear Recent
      </button>
      
      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {results && (
        <div data-testid="results">
          <div data-testid="total-results">{results.totalResults}</div>
          <div data-testid="transaction-count">{results.transactions.length}</div>
          <div data-testid="goal-count">{results.goals.length}</div>
          <div data-testid="page-count">{results.pages.length}</div>
        </div>
      )}
      
      <div data-testid="recent-searches">
        {recentSearches.map((search, index) => (
          <div key={index} data-testid={`recent-${index}`}>
            {search}
          </div>
        ))}
      </div>
    </div>
  );
}

describe('SearchContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should provide initial search state', () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId('search-input')).toHaveValue('');
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('results')).not.toBeInTheDocument();
  });

  it('should update query state', async () => {
    const user = userEvent.setup();
    
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test query');

    expect(input).toHaveValue('test query');
  });

  it('should perform search and display results', async () => {
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
      pages: [
        {
          id: '1',
          name: 'Test Page',
          description: 'Test Page Description',
          path: '/test',
          icon: 'TestIcon',
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

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    // Advance timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('results')).toBeInTheDocument();
    });

    expect(screen.getByTestId('total-results')).toHaveTextContent('3');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
    expect(screen.getByTestId('goal-count')).toHaveTextContent('1');
    expect(screen.getByTestId('page-count')).toHaveTextContent('1');
  });

  it('should handle search errors', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockFetch.mockRejectedValueOnce(new Error('Search failed'));

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Search failed');
  });

  it('should debounce search queries', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        transactions: [],
        goals: [],
        pages: [],
        totalResults: 0,
      }),
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    
    // Type multiple characters quickly
    await user.type(input, 'test');

    // Only advance timer once - should only make one API call
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should manage recent searches', async () => {
    const user = userEvent.setup();

    // Mock localStorage to return existing recent searches
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        searches: ['existing search'],
        maxItems: 5,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      })
    );

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    // Should load existing recent searches
    expect(screen.getByTestId('recent-0')).toHaveTextContent('existing search');

    // Add new recent search
    await user.click(screen.getByTestId('add-recent'));

    expect(screen.getByTestId('recent-0')).toHaveTextContent('test query');
    expect(screen.getByTestId('recent-1')).toHaveTextContent('existing search');

    // Clear recent searches
    await user.click(screen.getByTestId('clear-recent'));

    expect(screen.queryByTestId('recent-0')).not.toBeInTheDocument();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('global-search-recent');
  });

  it('should clear results', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
        goals: [],
        pages: [],
        totalResults: 0,
      }),
    });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    // Perform search first
    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('results')).toBeInTheDocument();
    });

    // Clear results
    await user.click(screen.getByTestId('clear-button'));

    expect(screen.queryByTestId('results')).not.toBeInTheDocument();
  });

  it('should not search for queries shorter than 2 characters', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    await user.type(input, 'a');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should cancel previous requests when new search is initiated', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const abortSpy = jest.fn();
    const mockAbortController = {
      abort: abortSpy,
      signal: { aborted: false },
    };

    // Mock AbortController
    global.AbortController = jest.fn(() => mockAbortController) as any;

    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    
    // Start first search
    await user.type(input, 'test1');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Start second search
    await user.clear(input);
    await user.type(input, 'test2');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should have aborted the first request
    expect(abortSpy).toHaveBeenCalled();
  });

  it('should throw error when useSearch is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSearch must be used within a SearchProvider');

    consoleSpy.mockRestore();
  });
});