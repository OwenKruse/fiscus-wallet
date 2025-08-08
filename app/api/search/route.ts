import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware';
import { getCacheService } from '../../../lib/cache/cache-service';
import { getGoalService } from '../../../lib/goals/goal-service';
import { 
  SearchRequest, 
  SearchResponse,
  TransactionSearchResult,
  GoalSearchResult,
  PageSearchResult,
  ApiResponse 
} from '../../../types';

// Searchable pages configuration
const SEARCHABLE_PAGES: PageSearchResult[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'Dashboard overview with account summaries',
    path: '/',
    icon: 'Home'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Financial analytics and insights',
    path: '/analytics',
    icon: 'BarChart3'
  },
  {
    id: 'transactions',
    name: 'Transactions',
    description: 'View and manage your transactions',
    path: '/transactions',
    icon: 'Receipt'
  },
  {
    id: 'goals',
    name: 'Goals',
    description: 'Track and manage your financial goals',
    path: '/goals',
    icon: 'Target'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Manage your account and preferences',
    path: '/settings',
    icon: 'Settings'
  }
];

// Create error response helper
function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    } as ApiResponse,
    { status }
  );
}

// Create success response helper
function createSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>);
}

// Parse and validate search request
async function parseSearchRequest(request: NextRequest): Promise<SearchRequest> {
  let query: string;
  let limit: number;
  let categories: SearchRequest['categories'];

  if (request.method === 'GET') {
    // Handle GET request with query parameters
    const { searchParams } = new URL(request.url);
    
    query = searchParams.get('query') || '';
    limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);
    
    // Parse categories filter
    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const categoryList = categoriesParam.split(',').map(c => c.trim());
      const validCategories = ['transactions', 'goals', 'pages'];
      const filteredCategories = categoryList.filter(c => validCategories.includes(c)) as SearchRequest['categories'];
      
      if (filteredCategories.length > 0) {
        categories = filteredCategories;
      }
    }
  } else if (request.method === 'POST') {
    // Handle POST request with JSON body
    try {
      const body = await request.json();
      query = body.query || '';
      limit = Math.min(body.limit || 5, 20);
      categories = body.categories;
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  } else {
    throw new Error('Method not allowed');
  }

  if (!query) {
    throw new Error('Query parameter is required');
  }

  if (query.length < 2) {
    throw new Error('Query must be at least 2 characters long');
  }

  if (query.length > 100) {
    throw new Error('Query must be less than 100 characters');
  }

  const searchRequest: SearchRequest = {
    query: query.trim(),
    limit,
    categories
  };

  return searchRequest;
}

// Search transactions
async function searchTransactions(
  userId: string, 
  query: string, 
  limit: number
): Promise<TransactionSearchResult[]> {
  try {
    const cacheService = getCacheService();
    
    // Use existing transaction search functionality
    const transactionsResponse = await cacheService.getTransactions(userId, {
      search: query,
      limit,
      page: 1
    });

    return transactionsResponse.transactions.map(transaction => ({
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount,
      date: transaction.date,
      accountName: transaction.accountName,
      category: transaction.category
    }));
  } catch (error) {
    console.error('Error searching transactions:', error);
    return [];
  }
}

// Search goals
async function searchGoals(
  userId: string, 
  query: string, 
  limit: number
): Promise<GoalSearchResult[]> {
  try {
    const goalService = getGoalService();
    
    // Use existing goal search functionality
    const goalsResponse = await goalService.getGoals(userId, {
      search: query,
      limit
    });

    return goalsResponse.map(goal => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      status: goal.status
    }));
  } catch (error) {
    console.error('Error searching goals:', error);
    return [];
  }
}

// Search pages
function searchPages(query: string, limit: number): PageSearchResult[] {
  const lowerQuery = query.toLowerCase();
  
  return SEARCHABLE_PAGES
    .filter(page => 
      page.name.toLowerCase().includes(lowerQuery) ||
      page.description.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
}

// Main search handler
async function searchHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    // Parse and validate request
    let searchRequest: SearchRequest;
    try {
      searchRequest = await parseSearchRequest(request);
    } catch (error: any) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    const { query, categories, limit = 5 } = searchRequest;
    
    // Determine which categories to search
    const searchCategories = categories || ['transactions', 'goals', 'pages'];
    
    // Perform searches in parallel
    const searchPromises: Promise<any>[] = [];
    
    if (searchCategories.includes('transactions')) {
      searchPromises.push(searchTransactions(user.id, query, limit));
    } else {
      searchPromises.push(Promise.resolve([]));
    }
    
    if (searchCategories.includes('goals')) {
      searchPromises.push(searchGoals(user.id, query, limit));
    } else {
      searchPromises.push(Promise.resolve([]));
    }
    
    if (searchCategories.includes('pages')) {
      searchPromises.push(Promise.resolve(searchPages(query, limit)));
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    const [transactions, goals, pages] = await Promise.all(searchPromises);

    const response: SearchResponse = {
      transactions,
      goals,
      pages,
      totalResults: transactions.length + goals.length + pages.length
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Search error:', error);

    // Handle specific error types
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Search service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    if (error.message?.includes('validation')) {
      return createErrorResponse('Invalid search parameters', 400, 'VALIDATION_ERROR');
    }

    return createErrorResponse('Search failed', 500, 'SEARCH_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(searchHandler, { requireAuth: true, requireTenant: false }),
  'SEARCH'
);

export const POST = withApiLogging(
  withApiAuth(searchHandler, { requireAuth: true, requireTenant: false }),
  'SEARCH'
);