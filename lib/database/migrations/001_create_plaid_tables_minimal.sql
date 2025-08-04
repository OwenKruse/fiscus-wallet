-- Create plaid_connections table
CREATE TABLE IF NOT EXISTS plaid_connections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    institution_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    accounts TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_item UNIQUE(user_id, item_id)
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    plaid_account_id VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    official_name VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50) NOT NULL,
    balance_available DECIMAL(12,2),
    balance_current DECIMAL(12,2) NOT NULL,
    balance_limit DECIMAL(12,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_plaid_account UNIQUE(user_id, plaid_account_id)
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
    category TEXT[] DEFAULT '{}',
    subcategory VARCHAR(255),
    pending BOOLEAN DEFAULT FALSE,
    account_owner VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_plaid_transaction UNIQUE(user_id, plaid_transaction_id)
);