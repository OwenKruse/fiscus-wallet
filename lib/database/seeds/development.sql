-- Development Seed Data
-- Creates sample data for development and testing purposes
-- This file should only be run in development/test environments

-- Note: This assumes users table exists and is managed by Nile DB
-- We'll use placeholder user IDs that should be replaced with actual user IDs

-- Clear existing test data (be careful in production!)
DELETE FROM transactions WHERE user_id IN (
  SELECT user_id FROM plaid_connections WHERE institution_name LIKE 'Test%'
);
DELETE FROM accounts WHERE user_id IN (
  SELECT user_id FROM plaid_connections WHERE institution_name LIKE 'Test%'
);
DELETE FROM plaid_connections WHERE institution_name LIKE 'Test%';

-- Insert test Plaid connections
INSERT INTO plaid_connections (
  id,
  user_id,
  item_id,
  access_token,
  institution_id,
  institution_name,
  accounts,
  status,
  last_sync
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000', -- Replace with actual user ID
  'test_item_1',
  'encrypted_access_token_1', -- This would be encrypted in real usage
  'ins_109508',
  'Test Bank 1',
  ARRAY['test_account_1', 'test_account_2'],
  'active',
  NOW() - INTERVAL '1 hour'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000', -- Same user, different bank
  'test_item_2',
  'encrypted_access_token_2',
  'ins_109509',
  'Test Credit Union',
  ARRAY['test_account_3'],
  'active',
  NOW() - INTERVAL '30 minutes'
);

-- Insert test accounts
INSERT INTO accounts (
  id,
  user_id,
  plaid_account_id,
  connection_id,
  name,
  official_name,
  type,
  subtype,
  balance_available,
  balance_current,
  balance_limit,
  last_updated
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440000',
  'test_account_1',
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Checking',
  'Test Bank Checking Account',
  'depository',
  'checking',
  2450.75,
  2450.75,
  NULL,
  NOW() - INTERVAL '1 hour'
),
(
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440000',
  'test_account_2',
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Savings',
  'Test Bank High Yield Savings',
  'depository',
  'savings',
  15000.00,
  15000.00,
  NULL,
  NOW() - INTERVAL '1 hour'
),
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440000',
  'test_account_3',
  '550e8400-e29b-41d4-a716-446655440002',
  'Test Credit Card',
  'Test Credit Union Rewards Card',
  'credit',
  'credit card',
  4750.00,
  -1250.00,
  6000.00,
  NOW() - INTERVAL '30 minutes'
);

-- Insert test transactions
INSERT INTO transactions (
  id,
  user_id,
  account_id,
  plaid_transaction_id,
  amount,
  date,
  name,
  merchant_name,
  category,
  subcategory,
  pending,
  account_owner
) VALUES 
-- Checking account transactions
(
  '550e8400-e29b-41d4-a716-446655440020',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_1',
  -45.67,
  CURRENT_DATE - INTERVAL '1 day',
  'Grocery Store Purchase',
  'Fresh Market',
  ARRAY['Food and Drink', 'Groceries'],
  'Groceries',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_2',
  -12.50,
  CURRENT_DATE - INTERVAL '2 days',
  'Coffee Shop',
  'Local Coffee Co',
  ARRAY['Food and Drink', 'Restaurants'],
  'Coffee Shop',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_3',
  2500.00,
  CURRENT_DATE - INTERVAL '3 days',
  'Salary Deposit',
  'Test Company Inc',
  ARRAY['Deposit', 'Payroll'],
  'Payroll',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440023',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_4',
  -89.99,
  CURRENT_DATE - INTERVAL '4 days',
  'Gas Station',
  'Shell',
  ARRAY['Transportation', 'Gas Stations'],
  'Gas Stations',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440024',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_5',
  -25.00,
  CURRENT_DATE,
  'Pending ATM Withdrawal',
  'ATM',
  ARRAY['Transfer', 'ATM'],
  'ATM',
  true,
  'Test User'
),

-- Savings account transactions
(
  '550e8400-e29b-41d4-a716-446655440025',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440011',
  'test_txn_6',
  500.00,
  CURRENT_DATE - INTERVAL '5 days',
  'Transfer from Checking',
  NULL,
  ARRAY['Transfer', 'Internal Transfer'],
  'Internal Transfer',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440026',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440011',
  'test_txn_7',
  15.25,
  CURRENT_DATE - INTERVAL '30 days',
  'Interest Payment',
  'Test Bank',
  ARRAY['Deposit', 'Interest'],
  'Interest',
  false,
  'Test User'
),

-- Credit card transactions
(
  '550e8400-e29b-41d4-a716-446655440027',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440012',
  'test_txn_8',
  -150.00,
  CURRENT_DATE - INTERVAL '1 day',
  'Online Shopping',
  'Amazon',
  ARRAY['Shops', 'Online'],
  'Online',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440028',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440012',
  'test_txn_9',
  -75.50,
  CURRENT_DATE - INTERVAL '3 days',
  'Restaurant',
  'Fine Dining',
  ARRAY['Food and Drink', 'Restaurants'],
  'Restaurants',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440029',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440012',
  'test_txn_10',
  -35.00,
  CURRENT_DATE,
  'Pending Gas Purchase',
  'Chevron',
  ARRAY['Transportation', 'Gas Stations'],
  'Gas Stations',
  true,
  'Test User'
);

-- Add some older transactions for testing date ranges
INSERT INTO transactions (
  user_id,
  account_id,
  plaid_transaction_id,
  amount,
  date,
  name,
  merchant_name,
  category,
  subcategory,
  pending,
  account_owner
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_old_1',
  -1200.00,
  CURRENT_DATE - INTERVAL '35 days',
  'Rent Payment',
  'Property Management Co',
  ARRAY['Payment', 'Rent'],
  'Rent',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_old_2',
  -85.00,
  CURRENT_DATE - INTERVAL '40 days',
  'Utility Bill',
  'Electric Company',
  ARRAY['Payment', 'Utilities'],
  'Electric',
  false,
  'Test User'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'test_txn_old_3',
  2500.00,
  CURRENT_DATE - INTERVAL '33 days',
  'Previous Salary Deposit',
  'Test Company Inc',
  ARRAY['Deposit', 'Payroll'],
  'Payroll',
  false,
  'Test User'
);

-- Print summary of seeded data
DO $$
DECLARE
    connection_count INTEGER;
    account_count INTEGER;
    transaction_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO connection_count FROM plaid_connections WHERE institution_name LIKE 'Test%';
    SELECT COUNT(*) INTO account_count FROM accounts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
    SELECT COUNT(*) INTO transaction_count FROM transactions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
    
    RAISE NOTICE 'Development seed data created:';
    RAISE NOTICE '  - % Plaid connections', connection_count;
    RAISE NOTICE '  - % accounts', account_count;
    RAISE NOTICE '  - % transactions', transaction_count;
END $$;