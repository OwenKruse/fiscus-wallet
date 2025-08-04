// Test setup for Vitest
import { beforeAll, afterAll } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NILEDB_URL = 'postgres://test:test@localhost:5432/test_db';
  process.env.NILEDB_API_URL = 'https://test.api.thenile.dev/v2/databases/test';
  process.env.NILEDB_USER = 'test_user';
  process.env.NILEDB_PASSWORD = 'test_password';
  process.env.NILEDB_DATABASE = 'test_db';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Clean up any test resources
});