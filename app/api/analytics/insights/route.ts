import { NextRequest, NextResponse } from 'next/server';
import { getCacheService } from '../../../../lib/cache/cache-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { TierEnforcementService } from '../../../../lib/subscription/tier-enforcement-service';
import { FeatureNotAvailableError } from '../../../../lib/subscription/types';

export interface SpendingInsight {
  category: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendAnalysis {
  period: string;
  totalSpending: number;
  averageTransaction: number;
  transactionCount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface InsightsResponse {
  spendingInsights: SpendingInsight[];
  trendAnalysis: TrendAnalysis[];
  recommendations: string[];
  generatedAt: string;
}

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Generate spending insights from transaction data
function generateSpendingInsights(transactions: any[]): SpendingInsight[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Group transactions by category and month
  const categorySpending: { [category: string]: { current: number; previous: number } } = {};

  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    const transactionMonth = transactionDate.getMonth();
    const transactionYear = transactionDate.getFullYear();
    const amount = Math.abs(transaction.amount || 0);
    const category = transaction.category?.[0] || 'Other';

    if (!categorySpending[category]) {
      categorySpending[category] = { current: 0, previous: 0 };
    }

    if (transactionYear === currentYear && transactionMonth === currentMonth) {
      categorySpending[category].current += amount;
    } else if (transactionYear === previousYear && transactionMonth === previousMonth) {
      categorySpending[category].previous += amount;
    }
  });

  // Convert to insights format
  return Object.entries(categorySpending).map(([category, spending]) => {
    const change = spending.current - spending.previous;
    const changePercentage = spending.previous > 0 ? (change / spending.previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    return {
      category,
      currentMonth: spending.current,
      previousMonth: spending.previous,
      change,
      changePercentage,
      trend
    };
  }).filter(insight => insight.currentMonth > 0 || insight.previousMonth > 0);
}

// Generate trend analysis from transaction data
function generateTrendAnalysis(transactions: any[]): TrendAnalysis[] {
  const periods = ['last_30_days', 'last_90_days'];
  const now = new Date();

  return periods.map(period => {
    const daysBack = period === 'last_30_days' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const periodTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate;
    });

    const totalSpending = periodTransactions.reduce((sum, transaction) => {
      return sum + Math.abs(transaction.amount || 0);
    }, 0);

    const categoryTotals: { [category: string]: number } = {};
    periodTransactions.forEach(transaction => {
      const category = transaction.category?.[0] || 'Other';
      const amount = Math.abs(transaction.amount || 0);
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      period,
      totalSpending,
      averageTransaction: periodTransactions.length > 0 ? totalSpending / periodTransactions.length : 0,
      transactionCount: periodTransactions.length,
      topCategories
    };
  });
}

// Generate recommendations based on insights
function generateRecommendations(insights: SpendingInsight[], trends: TrendAnalysis[]): string[] {
  const recommendations: string[] = [];

  // Check for significant spending increases
  const increasingCategories = insights.filter(insight => 
    insight.trend === 'up' && insight.changePercentage > 20
  );

  if (increasingCategories.length > 0) {
    recommendations.push(
      `Your spending increased significantly in ${increasingCategories.map(c => c.category).join(', ')}. Consider reviewing these expenses.`
    );
  }

  // Check for high spending categories
  const lastMonthTrend = trends.find(t => t.period === 'last_30_days');
  if (lastMonthTrend && lastMonthTrend.topCategories.length > 0) {
    const topCategory = lastMonthTrend.topCategories[0];
    if (topCategory.percentage > 30) {
      recommendations.push(
        `${topCategory.category} represents ${topCategory.percentage.toFixed(1)}% of your spending. Consider setting a budget for this category.`
      );
    }
  }

  // Default recommendation if no specific insights
  if (recommendations.length === 0) {
    recommendations.push('Your spending patterns look stable. Keep tracking to identify optimization opportunities.');
  }

  return recommendations;
}

// Main handler for fetching spending insights
async function getInsightsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;

    // Check tier enforcement for spending insights feature
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    try {
      await tierEnforcementService.checkFeatureAccessWithThrow(user.id, 'spending_insights');
    } catch (error) {
      if (error instanceof FeatureNotAvailableError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: error.message,
            feature: error.feature,
            requiredTier: error.requiredTier,
            upgradeRequired: true
          }
        }, { status: 403 });
      }
      throw error;
    }

    // Get transaction data for analysis
    const cacheService = getCacheService();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

    const transactionsResponse = await cacheService.getTransactions(user.id, {
      startDate,
      endDate,
      limit: 5000, // Large limit for analysis
    });

    const transactions = transactionsResponse.transactions || [];

    // Generate insights
    const spendingInsights = generateSpendingInsights(transactions);
    const trendAnalysis = generateTrendAnalysis(transactions);
    const recommendations = generateRecommendations(spendingInsights, trendAnalysis);

    const response: InsightsResponse = {
      spendingInsights,
      trendAnalysis,
      recommendations,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get insights error:', error);

    // Handle specific error types
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    if (error.message?.includes('cache')) {
      return createErrorResponse('Cache service error', 503, 'CACHE_ERROR');
    }

    return createErrorResponse('Failed to generate insights', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getInsightsHandler, { requireAuth: true, requireTenant: false }),
  'GET_INSIGHTS'
);