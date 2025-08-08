# Design Document

## Overview

The global search command feature provides users with a unified search interface accessible from any page in the application. The feature leverages the existing Command UI component from shadcn/ui and integrates with the current API infrastructure to search across transactions, goals, and pages. The search command will be triggered by clicking on a search input in the top right of pages and will provide real-time search results with keyboard navigation support.

## Architecture

### Component Architecture

```
GlobalSearchCommand (Main Component)
├── SearchTrigger (Search input in header)
├── SearchDialog (Command dialog wrapper)
├── SearchInput (Command input component)
├── SearchResults (Results container)
│   ├── SearchResultsGroup (Category grouping)
│   │   ├── TransactionResult (Transaction item)
│   │   ├── GoalResult (Goal item)
│   │   └── PageResult (Page item)
│   └── RecentSearches (Recent searches display)
└── SearchProvider (Context for search state)
```

### Data Flow

1. User clicks search trigger → Opens search dialog
2. User types query → Debounced search API calls
3. API returns categorized results → Results displayed in groups
4. User selects result → Navigation occurs, dialog closes
5. Search query stored in recent searches

### Integration Points

- **API Layer**: Extends existing `api-client.ts` with search endpoints
- **UI Components**: Uses existing Command component from shadcn/ui
- **Navigation**: Integrates with Next.js router for result navigation
- **Layout**: Integrates with existing dashboard layout structure

## Components and Interfaces

### Core Components

#### SearchTrigger Component
```typescript
interface SearchTriggerProps {
  className?: string;
  placeholder?: string;
  onOpen: () => void;
}
```

Located in the top right of pages, this component renders a clickable search input that opens the search dialog.

#### GlobalSearchCommand Component
```typescript
interface GlobalSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Main component that manages the search dialog state and orchestrates all search functionality.

#### SearchResults Component
```typescript
interface SearchResultsProps {
  results: SearchResults;
  loading: boolean;
  onSelect: (result: SearchResult) => void;
  recentSearches: string[];
  onRecentSearchSelect: (query: string) => void;
}
```

Displays categorized search results with keyboard navigation support.

### API Interfaces

#### Search Request
```typescript
interface SearchRequest {
  query: string;
  categories?: ('transactions' | 'goals' | 'pages')[];
  limit?: number;
}
```

#### Search Response
```typescript
interface SearchResponse {
  transactions: TransactionSearchResult[];
  goals: GoalSearchResult[];
  pages: PageSearchResult[];
  totalResults: number;
}

interface TransactionSearchResult {
  id: string;
  name: string;
  amount: number;
  date: string;
  accountName: string;
  category: string[];
}

interface GoalSearchResult {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  status: string;
}

interface PageSearchResult {
  id: string;
  name: string;
  description: string;
  path: string;
  icon?: string;
}
```

### Context Interface

#### SearchContext
```typescript
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
}
```

## Data Models

### Search Result Types

The search functionality will work with existing data models:

- **Transactions**: Uses existing `TransactionsResponse` structure
- **Goals**: Uses existing `Goal` interface
- **Pages**: Static configuration of available pages

### Recent Searches Storage

Recent searches will be stored in localStorage with the following structure:

```typescript
interface RecentSearchStorage {
  searches: string[];
  maxItems: number;
  lastUpdated: string;
}
```

### Search Configuration

Static configuration for searchable pages:

```typescript
interface SearchablePage {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: string;
  keywords: string[];
}

const SEARCHABLE_PAGES: SearchablePage[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'Dashboard overview with account summaries',
    path: '/',
    icon: 'Home',
    keywords: ['dashboard', 'home', 'overview', 'summary']
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Financial analytics and insights',
    path: '/analytics',
    icon: 'BarChart3',
    keywords: ['analytics', 'charts', 'insights', 'reports']
  },
  // ... more pages
];
```

## Error Handling

### Search API Errors

- **Network Errors**: Display "Search temporarily unavailable" message
- **Timeout Errors**: Display "Search taking too long" with retry option
- **Server Errors**: Display generic error message with retry option
- **No Results**: Display category-specific "No [category] found" messages

### Input Validation

- Minimum query length: 2 characters
- Maximum query length: 100 characters
- Debounce delay: 300ms to prevent excessive API calls

### Error Recovery

- Automatic retry for network errors (max 3 attempts)
- Graceful degradation when search is unavailable
- Fallback to recent searches when API fails

## Testing Strategy

### Unit Tests

1. **SearchTrigger Component**
   - Renders correctly with different props
   - Calls onOpen when clicked
   - Handles keyboard shortcuts (Cmd+K)

2. **GlobalSearchCommand Component**
   - Opens and closes dialog correctly
   - Manages search state properly
   - Handles keyboard navigation

3. **Search API Functions**
   - Correctly formats search requests
   - Handles different response scenarios
   - Properly handles errors and timeouts

4. **SearchContext**
   - Manages search state correctly
   - Handles recent searches storage
   - Debounces search queries properly

### Integration Tests

1. **Search Flow**
   - Complete search workflow from trigger to result selection
   - Navigation to selected results
   - Recent searches functionality

2. **API Integration**
   - Search across all data types
   - Proper error handling
   - Performance under load

3. **Keyboard Navigation**
   - Arrow key navigation through results
   - Enter key selection
   - Escape key to close

### Performance Tests

1. **Search Response Time**
   - API response time under 500ms for typical queries
   - UI responsiveness during search
   - Memory usage with large result sets

2. **Debouncing**
   - Proper debouncing prevents excessive API calls
   - Search cancellation works correctly
   - No memory leaks from cancelled requests

### Accessibility Tests

1. **Keyboard Navigation**
   - Full keyboard accessibility
   - Proper focus management
   - Screen reader compatibility

2. **ARIA Labels**
   - Proper ARIA labels for search components
   - Accessible result announcements
   - Clear focus indicators

## Implementation Phases

### Phase 1: Core Infrastructure
- Create search API endpoints
- Implement basic search functionality for transactions and goals
- Set up search context and state management

### Phase 2: UI Components
- Implement SearchTrigger component
- Create GlobalSearchCommand dialog
- Build SearchResults display with basic styling

### Phase 3: Enhanced Features
- Add keyboard navigation
- Implement recent searches
- Add page search functionality

### Phase 4: Polish and Optimization
- Performance optimization
- Error handling improvements
- Accessibility enhancements
- Comprehensive testing

## Security Considerations

### Data Access Control

- Search results filtered by user authentication
- Tenant isolation for multi-tenant data
- No sensitive data exposed in search results

### Input Sanitization

- Query input sanitized to prevent XSS
- SQL injection prevention in search queries
- Rate limiting on search API endpoints

### Privacy

- Recent searches stored locally only
- No search query logging on server
- Option to clear search history

## Performance Considerations

### Search Optimization

- Database indexes on searchable fields
- Full-text search capabilities for transaction descriptions
- Result caching for common queries

### UI Performance

- Virtual scrolling for large result sets
- Debounced search input to reduce API calls
- Lazy loading of search results

### Caching Strategy

- Client-side caching of recent search results
- Server-side caching of popular queries
- Cache invalidation on data updates

## Monitoring and Analytics

### Search Metrics

- Search query frequency and patterns
- Result click-through rates
- Search performance metrics
- Error rates and types

### User Experience Metrics

- Time to first result
- Search abandonment rates
- Most popular search categories
- Keyboard vs mouse usage patterns