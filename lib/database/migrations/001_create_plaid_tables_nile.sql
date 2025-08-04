-- Migration: Create Plaid Integration Tables (Nile DB Compatible)
-- Description: Creates tables for plaid_connections, accounts, and transactions
-- Requirements: 3.2, 4.1

-- Create plaid_connections table
CREATE TABLE IF NOT EXISTS plaid_connections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted access token
    institution_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    accounts TEXT[] DEFAULT '{}', -- Array of Plaid account IDs
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_item UNIQUE(user_id, item_id),
    CONSTRAINT valid_status CHECK (status IN ('active', 'error', 'disconnected'))
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    plaid_account_id VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    official_name VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('depository', 'credit', 'loan', 'investment')),
    subtype VARCHAR(50) NOT NULL,
    balance_available DECIMAL(12,2),
    balance_current DECIMAL(12,2) NOT NULL,
    balance_limit DECIMAL(12,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_plaid_account UNIQUE(user_id, plaid_account_id),
    CONSTRAINT valid_account_type CHECK (type IN ('depository', 'credit', 'loan', 'investment')),
    CONSTRAINT positive_balance_current CHECK (balance_current IS NOT NULL)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plaid_transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255),
    category TEXT[] DEFAULT '{}', -- Array of category strings
    subcategory VARCHAR(255),
    pending BOOLEAN DEFAULT FALSE,
    account_owner VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_plaid_transaction UNIQUE(user_id, plaid_transaction_id),
    CONSTRAINT valid_transaction_date CHECK (date IS NOT NULL),
    CONSTRAINT valid_transaction_name CHECK (name IS NOT NULL AND LENGTH(name) > 0)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_plaid_connections_user_id ON plaid_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_status ON plaid_connections(status);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_last_sync ON plaid_connections(last_sync);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_connection_id ON accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_last_updated ON accounts(last_updated);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(pending);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions USING GIN(category);

-- Add comments for documentation
COMMENT ON TABLE plaid_connections IS 'Stores Plaid connection information for each user';
COMMENT ON TABLE accounts IS 'Stores bank account information retrieved from Plaid';
COMMENT ON TABLE transactions IS 'Stores transaction data retrieved from Plaid and cached locally';

COMMENT ON COLUMN plaid_connections.access_token IS 'Encrypted Plaid access token for API calls';
COMMENT ON COLUMN plaid_connections.accounts IS 'Array of Plaid account IDs associated with this connection';
COMMENT ON COLUMN accounts.balance_available IS 'Available balance (may be null for some account types)';
COMMENT ON COLUMN accounts.balance_current IS 'Current balance (required for all accounts)';
COMMENT ON COLUMN transactions.category IS 'Array of Plaid category strings';
COMMENT ON COLUMN transactions.pending IS 'Whether the transaction is still pending';