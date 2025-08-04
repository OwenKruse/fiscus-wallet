-- Add password_hash field to users table
ALTER TABLE users.users ADD COLUMN password_hash VARCHAR(255);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users.users(email);

-- Add unique constraint on email
ALTER TABLE users.users ADD CONSTRAINT unique_users_email UNIQUE (email); 