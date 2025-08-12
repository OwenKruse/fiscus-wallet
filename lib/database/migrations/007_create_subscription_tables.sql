-- Create subscriptions table
CREATE TABLE "public"."subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "tier" VARCHAR(20) NOT NULL DEFAULT 'STARTER' CHECK ("tier" IN ('STARTER', 'GROWTH', 'PRO')),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'TRIALING')),
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK ("billing_cycle" IN ('MONTHLY', 'YEARLY')),
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create usage_metrics table
CREATE TABLE "public"."usage_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_type" VARCHAR(50) NOT NULL,
    "current_value" INTEGER NOT NULL,
    "limit_value" INTEGER NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- Create billing_history table
CREATE TABLE "public"."billing_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(20) NOT NULL,
    "billing_reason" VARCHAR(50) NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "public"."subscriptions"("user_id");
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "public"."subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX "usage_metrics_subscription_id_metric_type_period_start_key" ON "public"."usage_metrics"("subscription_id", "metric_type", "period_start");

-- Create indexes for subscriptions table
CREATE INDEX "subscriptions_user_id_idx" ON "public"."subscriptions"("user_id");
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "public"."subscriptions"("stripe_customer_id");
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");
CREATE INDEX "subscriptions_tier_idx" ON "public"."subscriptions"("tier");

-- Create indexes for usage_metrics table
CREATE INDEX "usage_metrics_user_id_idx" ON "public"."usage_metrics"("user_id");
CREATE INDEX "usage_metrics_metric_type_idx" ON "public"."usage_metrics"("metric_type");
CREATE INDEX "usage_metrics_period_start_period_end_idx" ON "public"."usage_metrics"("period_start", "period_end");

-- Create indexes for billing_history table
CREATE INDEX "billing_history_user_id_idx" ON "public"."billing_history"("user_id");
CREATE INDEX "billing_history_subscription_id_idx" ON "public"."billing_history"("subscription_id");
CREATE INDEX "billing_history_status_idx" ON "public"."billing_history"("status");
CREATE INDEX "billing_history_created_at_idx" ON "public"."billing_history"("created_at");

-- Add foreign key constraints
ALTER TABLE "public"."usage_metrics" ADD CONSTRAINT "usage_metrics_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."billing_history" ADD CONSTRAINT "billing_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;