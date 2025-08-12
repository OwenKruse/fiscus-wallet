# Implementation Plan

- [x] 1. Set up database schema and core models
  - Create Prisma schema extensions for subscription, usage metrics, and billing history tables
  - Add enums for SubscriptionTier, SubscriptionStatus, and BillingCycle
  - Generate and run database migrations
  - _Requirements: 1.1, 2.1, 3.1, 6.1, 6.4_

- [x] 2. Install and configure Stripe integration
  - Add Stripe SDK to package.json dependencies
  - Create Stripe configuration service with environment variables
  - Set up Stripe webhook endpoint structure
  - _Requirements: 5.5, 5.6, 7.3_

- [x] 3. Implement core subscription service
  - Create SubscriptionService class with CRUD operations
  - Implement tier configuration constants and helper functions
  - Add methods for subscription creation, updates, and cancellation
  - Write unit tests for subscription service methods
  - _Requirements: 1.1, 2.1, 3.1, 6.5, 7.1, 7.2_

- [x] 4. Build usage tracking system
  - Create UsageMetric model operations and tracking service
  - Implement usage increment and limit checking functions
  - Add usage metrics calculation and aggregation methods
  - Write unit tests for usage tracking functionality
  - _Requirements: 1.2, 1.3, 2.2, 3.2, 6.1, 6.2_

- [x] 5. Create tier enforcement middleware
  - Implement TierEnforcementService with limit checking methods
  - Create middleware to enforce account, balance, and feature limits
  - Add helper functions for tier-based access control
  - Write unit tests for tier enforcement logic
  - _Requirements: 1.2, 1.3, 2.2, 3.2, 6.1, 6.2_

- [x] 6. Build subscription API endpoints
  - Create POST /api/subscriptions endpoint for subscription creation
  - Implement GET /api/subscriptions endpoint for fetching user subscription
  - Add PUT /api/subscriptions endpoint for subscription updates
  - Create DELETE /api/subscriptions endpoint for cancellation
  - Add POST /api/subscriptions/upgrade and /api/subscriptions/downgrade endpoints
  - Write integration tests for all subscription API endpoints
  - _Requirements: 5.5, 5.6, 6.5, 7.1, 7.2, 7.4_

- [x] 7. Implement usage tracking API endpoints
  - Create GET /api/usage endpoint to fetch current usage metrics
  - Add POST /api/usage/track endpoint for tracking usage events
  - Implement GET /api/usage/limits endpoint for tier limits and usage
  - Write integration tests for usage API endpoints
  - _Requirements: 6.1, 6.2, 6.6_

- [x] 8. Build Stripe integration service
  - Create StripeService class with customer and subscription management
  - Implement payment intent creation and processing methods
  - Add subscription creation, update, and cancellation via Stripe API
  - Write unit tests for Stripe service methods
  - _Requirements: 5.5, 5.6, 7.3_

- [x] 9. Create Stripe webhook handler
  - Implement POST /api/webhooks/stripe endpoint
  - Add webhook signature verification and event processing
  - Handle subscription status changes, payment events, and cancellations
  - Write integration tests for webhook processing
  - _Requirements: 6.4, 6.5, 7.4, 7.5_

- [x] 10. Build pricing page components
  - Create PricingPage component with tier comparison layout
  - Implement PricingCard component for individual tier display
  - Add pricing information, features, and call-to-action buttons
  - Style components with Tailwind CSS and ensure responsive design
  - Write unit tests for pricing page components
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement upgrade prompt system
  - Create UpgradePrompt component for modal/banner display
  - Add trigger logic for account, balance, and feature limit prompts
  - Implement dismissible and non-intrusive prompt behavior
  - Write unit tests for upgrade prompt components and logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Build subscription management interface
  - Create SubscriptionSettings component for plan management
  - Implement current plan display with billing cycle and next payment date
  - Add plan change functionality with upgrade/downgrade options
  - Write unit tests for subscription management components
  - _Requirements: 7.1, 7.2_

- [x] 13. Create billing and payment components
  - Implement BillingHistory component to display payment history
  - Create PaymentMethodForm component for updating payment methods
  - Add PlanChangeConfirmation dialog for plan changes
  - Write unit tests for billing and payment components
  - _Requirements: 7.1, 7.3_

- [x] 14. Build usage indicator components
  - Create UsageIndicator component with progress bars for limits
  - Implement AccountLimitBanner for account limit status display
  - Add BalanceLimitWarning component for balance limit warnings
  - Write unit tests for usage indicator components
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 15. Integrate tier enforcement into existing features
  - Add tier checking to account connection functionality
  - Implement balance limit enforcement in account sync
  - Add feature gates to export, insights, and advanced features
  - Update existing API endpoints to check tier permissions
  - _Requirements: 1.2, 1.3, 2.2, 3.2, 6.1, 6.2_

- [x] 16. Add subscription initialization for new users
  - Update user registration flow to create default Starter subscription
  - Implement automatic Stripe customer creation for new users
  - Add subscription status to user authentication context
  - Write integration tests for user registration with subscription
  - _Requirements: 1.1_

- [x] 17. Create billing history and invoice system
  - Implement GET /api/billing/history endpoint
  - Create BillingHistory model operations for invoice tracking
  - Add invoice generation and PDF export functionality
  - Write integration tests for billing history features
  - _Requirements: 3.4, 7.1_

- [ ] 18. Build subscription analytics and reporting
  - Create subscription metrics tracking and aggregation
  - Implement conversion rate and churn analysis
  - Add admin dashboard for subscription analytics
  - Write unit tests for analytics calculations
  - _Requirements: 6.6_

- [ ] 19. Implement email notifications for subscription events
  - Create email templates for subscription confirmations, cancellations
  - Add email sending for payment failures and subscription renewals
  - Implement reminder emails before subscription downgrades
  - Write integration tests for email notification system
  - _Requirements: 7.5, 7.6_

- [ ] 20. Add comprehensive error handling and validation
  - Implement custom error classes for tier limits and payment failures
  - Add proper error handling in all subscription API endpoints
  - Create user-friendly error messages and fallback behaviors
  - Write unit tests for error handling scenarios
  - _Requirements: 4.4, 6.2, 7.3_

- [ ] 21. Integrate subscription status into app navigation
  - Update app sidebar to show current subscription tier
  - Add subscription status indicators in dashboard header
  - Implement conditional navigation based on tier permissions
  - Write integration tests for navigation updates
  - _Requirements: 5.4, 6.1_

- [ ] 22. Create end-to-end subscription flow tests
  - Write E2E tests for complete upgrade/downgrade flows
  - Test payment processing with Stripe test mode
  - Verify tier limit enforcement across the application
  - Test webhook processing and subscription status updates
  - _Requirements: 5.5, 5.6, 6.5, 7.2_