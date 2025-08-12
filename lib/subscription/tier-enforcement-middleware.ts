import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { SubscriptionService } from './subscription-service'
import { TierEnforcementService } from './tier-enforcement-service'
import { TierLimitExceededError, FeatureNotAvailableError } from './types'

export interface TierEnforcementOptions {
  feature?: string
  requireAccountLimit?: boolean
  requireBalanceLimit?: number
  customCheck?: (userId: string, enforcementService: TierEnforcementService) => Promise<boolean>
}

/**
 * Middleware factory for tier enforcement
 */
export function withTierEnforcement(options: TierEnforcementOptions = {}) {
  return function tierEnforcementMiddleware(
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest, context: any): Promise<NextResponse> {
      try {
        // Extract user ID from request (assuming it's in headers or context)
        const userId = req.headers.get('x-user-id') || context?.params?.userId
        
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID required for tier enforcement' },
            { status: 401 }
          )
        }

        const prisma = new PrismaClient()
        const subscriptionService = new SubscriptionService(prisma)
        const enforcementService = new TierEnforcementService(prisma, subscriptionService)

        // Check feature access if specified
        if (options.feature) {
          await enforcementService.checkFeatureAccessWithThrow(userId, options.feature)
        }

        // Check account limit if specified
        if (options.requireAccountLimit) {
          await enforcementService.checkAccountLimitWithThrow(userId)
        }

        // Check balance limit if specified
        if (options.requireBalanceLimit !== undefined) {
          await enforcementService.checkBalanceLimitWithThrow(userId, options.requireBalanceLimit)
        }

        // Run custom check if provided
        if (options.customCheck) {
          const customResult = await options.customCheck(userId, enforcementService)
          if (!customResult) {
            return NextResponse.json(
              { error: 'Custom tier enforcement check failed' },
              { status: 403 }
            )
          }
        }

        // If all checks pass, proceed with the original handler
        return handler(req, context)

      } catch (error) {
        if (error instanceof TierLimitExceededError) {
          return NextResponse.json(
            {
              error: 'Tier limit exceeded',
              message: error.message,
              limitType: error.limitType,
              currentValue: error.currentValue,
              limitValue: error.limitValue,
              requiredTier: error.requiredTier
            },
            { status: 403 }
          )
        }

        if (error instanceof FeatureNotAvailableError) {
          return NextResponse.json(
            {
              error: 'Feature not available',
              message: error.message,
              feature: error.feature,
              requiredTier: error.requiredTier
            },
            { status: 403 }
          )
        }

        // Re-throw other errors
        throw error
      }
    }
  }
}

/**
 * Express-style middleware for tier enforcement
 */
export async function tierEnforcementMiddleware(
  req: any,
  res: any,
  next: any,
  options: TierEnforcementOptions = {}
) {
  try {
    const userId = req.user?.id || req.headers['x-user-id']
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required for tier enforcement' })
    }

    const prisma = new PrismaClient()
    const subscriptionService = new SubscriptionService(prisma)
    const enforcementService = new TierEnforcementService(prisma, subscriptionService)

    // Check feature access if specified
    if (options.feature) {
      await enforcementService.checkFeatureAccessWithThrow(userId, options.feature)
    }

    // Check account limit if specified
    if (options.requireAccountLimit) {
      await enforcementService.checkAccountLimitWithThrow(userId)
    }

    // Check balance limit if specified
    if (options.requireBalanceLimit !== undefined) {
      await enforcementService.checkBalanceLimitWithThrow(userId, options.requireBalanceLimit)
    }

    // Run custom check if provided
    if (options.customCheck) {
      const customResult = await options.customCheck(userId, enforcementService)
      if (!customResult) {
        return res.status(403).json({ error: 'Custom tier enforcement check failed' })
      }
    }

    // Attach enforcement service to request for use in handlers
    req.tierEnforcement = enforcementService
    
    next()

  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      return res.status(403).json({
        error: 'Tier limit exceeded',
        message: error.message,
        limitType: error.limitType,
        currentValue: error.currentValue,
        limitValue: error.limitValue,
        requiredTier: error.requiredTier
      })
    }

    if (error instanceof FeatureNotAvailableError) {
      return res.status(403).json({
        error: 'Feature not available',
        message: error.message,
        feature: error.feature,
        requiredTier: error.requiredTier
      })
    }

    next(error)
  }
}

/**
 * Helper function to create tier-aware API responses
 */
export function createTierAwareResponse(
  data: any,
  userTier: string,
  availableFeatures: string[]
) {
  return {
    data,
    tier: {
      current: userTier,
      availableFeatures
    }
  }
}

/**
 * Decorator for tier enforcement (for use with class-based handlers)
 */
export function TierEnforced(options: TierEnforcementOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const [req] = args
      const userId = req.user?.id || req.headers['x-user-id']
      
      if (!userId) {
        throw new Error('User ID required for tier enforcement')
      }

      const prisma = new PrismaClient()
      const subscriptionService = new SubscriptionService(prisma)
      const enforcementService = new TierEnforcementService(prisma, subscriptionService)

      // Perform tier checks
      if (options.feature) {
        await enforcementService.checkFeatureAccessWithThrow(userId, options.feature)
      }

      if (options.requireAccountLimit) {
        await enforcementService.checkAccountLimitWithThrow(userId)
      }

      if (options.requireBalanceLimit !== undefined) {
        await enforcementService.checkBalanceLimitWithThrow(userId, options.requireBalanceLimit)
      }

      if (options.customCheck) {
        const customResult = await options.customCheck(userId, enforcementService)
        if (!customResult) {
          throw new Error('Custom tier enforcement check failed')
        }
      }

      return method.apply(this, args)
    }

    return descriptor
  }
}