# Tier Enforcement Integration

This document describes the tier enforcement integration that has been implemented across the existing API endpoints.

## Overview

Tier enforcement has been integrated into 9 key API endpoints to ensure users can only access features and resources within their subscription tier limits. The integration includes:

- Account connection limits
- Balance tracking limits  
- Feature access controls
- Sync frequency enforcement
- Transaction history limits
- Usage tracking

## Integrated Endpoints

### 1. Account Connection (`POST /api/plaid/exchange-token`)

**Enforcement:**
- Checks account limit before allowing new connections
- Tracks account usage after successful connection
- Returns upgrade prompts when limit exceeded

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LIMIT_EXCEEDED",
    "message": "Connected accounts limit exceeded: 3/3. Upgrade to GROWTH required.",
    "limitType": "Connected accounts",
    "currentValue": 3,
    "limitValue": 3,
    "requiredTier": "GROWTH",
    "upgradeRequired": true
  }
}
```

### 2. Data Sync (`POST /api/sync`)

**Enforcement:**
- Enforces sync frequency limits (daily for Starter tier)
- Sets sync priority based on tier (low/normal/high)
- Prevents frequent syncs for Starter tier users

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "SYNC_FREQUENCY_LIMIT_EXCEEDED",
    "message": "Starter tier allows daily syncs only. Next sync available at 2025-08-13T16:56:29.339Z",
    "nextAllowedSync": "2025-08-13T16:56:29.339Z",
    "currentTier": "STARTER",
    "requiredTier": "GROWTH",
    "upgradeRequired": true
  }
}
```

### 3. Data Export (`POST /api/settings/export`)

**Enforcement:**
- Requires Growth tier or higher for data export
- Tracks export usage
- Blocks export for Starter tier users

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "Feature csv_export requires GROWTH tier",
    "feature": "csv_export",
    "requiredTier": "GROWTH",
    "upgradeRequired": true
  }
}
```

### 4. Transaction History (`GET /api/transactions`)

**Enforcement:**
- Limits transaction history based on tier (12 months for Starter)
- Automatically adjusts date range to respect tier limits
- No error thrown, silently enforces limits

### 5. Account Balances (`GET /api/accounts`)

**Enforcement:**
- Tracks total balance usage
- Checks balance limits
- Adds tier information to response

**Response Enhancement:**
```json
{
  "success": true,
  "data": {
    "accounts": [...],
    "tierInfo": {
      "currentTier": "STARTER",
      "balanceLimit": 15000,
      "totalBalance": 12500,
      "canTrackBalance": true,
      "usage": {
        "accounts": { "current": 2, "limit": 3, "percentage": 67 },
        "balance": { "current": 12500, "limit": 15000, "percentage": 83 }
      }
    }
  }
}
```

### 6. Transaction Export (`GET /api/transactions/export`)

**Enforcement:**
- Requires Growth tier for CSV export
- Applies transaction history limits
- Tracks export usage

### 7. Investment Tracking (`GET /api/investments`)

**Enforcement:**
- Requires Pro tier for investment tracking
- Blocks access for Growth and Starter tiers

### 8. Analytics Insights (`GET /api/analytics/insights`)

**Enforcement:**
- Requires Growth tier for spending insights
- Blocks access for Starter tier users

### 9. Plaid Sync (`POST /api/plaid/sync`)

**Enforcement:**
- Checks balance limits before sync
- Updates usage metrics after sync
- Warns but doesn't block if balance exceeds limits

## Helper Functions

The integration uses helper functions from `lib/subscription/tier-enforcement-helpers.ts`:

- `checkFeatureAccess()` - Validates feature access
- `checkAccountLimit()` - Validates account limits
- `checkBalanceLimit()` - Validates balance limits
- `trackUsage()` - Safely tracks usage metrics
- `addTierInfoToResponse()` - Adds tier info to responses

## Usage Tracking

The following metrics are tracked:

- `connected_accounts` - Number of connected accounts
- `total_balance` - Total tracked balance across accounts
- `transaction_exports` - Number of export operations
- `sync_requests` - Number of sync operations

## Error Handling

All tier enforcement errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "TIER_LIMIT_EXCEEDED" | "FEATURE_NOT_AVAILABLE",
    "message": "Human readable error message",
    "limitType": "Connected accounts", // For limit errors
    "currentValue": 3, // For limit errors
    "limitValue": 3, // For limit errors
    "feature": "csv_export", // For feature errors
    "requiredTier": "GROWTH",
    "upgradeRequired": true
  }
}
```

## Testing

A verification script is available at `scripts/verify-tier-enforcement-integration.ts` that checks:

- All required imports are present
- Tier enforcement calls are implemented
- Error handling is properly configured

Run with: `npx tsx scripts/verify-tier-enforcement-integration.ts`

## Requirements Satisfied

This implementation satisfies the following requirements from the pricing system spec:

- **1.2**: Account limits enforced (3 for Starter, 10 for Growth, unlimited for Pro)
- **1.3**: Balance limits enforced ($15K for Starter, $100K for Growth, unlimited for Pro)
- **2.2**: Feature access controls (CSV export requires Growth+)
- **3.2**: Advanced features gated (investments require Pro)
- **6.1**: Tier limits checked before actions
- **6.2**: Upgrade prompts shown when limits exceeded

## Next Steps

1. Test the integration with real user scenarios
2. Monitor usage metrics and tier enforcement effectiveness
3. Add more granular feature gates as needed
4. Implement client-side tier awareness for better UX