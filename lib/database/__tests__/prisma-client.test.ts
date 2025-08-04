// Prisma Client Tests
// Tests for Prisma database client functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../prisma-client', async () => {
  const actual = await vi.importActual('../prisma-client');
  return {
    ...actual,
    prisma: {
      $queryRaw: vi.fn(),
      $queryRawUnsafe: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

import { PrismaHelpers, prisma } from '../prisma-client';

describe('PrismaHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await PrismaHelpers.testConnection();

      expect(result).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should return false when connection fails', async () => {
      const error = new Error('Connection failed');
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await PrismaHelpers.testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Database connection test failed:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('getHealthInfo', () => {
    it('should return healthy status when database responds', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await PrismaHelpers.getHealthInfo();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when database fails', async () => {
      const error = new Error('Database error');
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(error);

      const result = await PrismaHelpers.getHealthInfo();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database error');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('executeRaw', () => {
    it('should execute raw SQL successfully', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce(mockResult);

      const result = await PrismaHelpers.executeRaw('SELECT * FROM test WHERE id = ?', 1);

      expect(result).toEqual(mockResult);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', 1);
    });

    it('should handle raw SQL execution errors', async () => {
      const error = new Error('SQL error');
      vi.mocked(prisma.$queryRawUnsafe).mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(PrismaHelpers.executeRaw('INVALID SQL')).rejects.toThrow('SQL error');
      expect(consoleSpy).toHaveBeenCalledWith('Raw SQL execution failed:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('getConnectionStats', () => {
    it('should return connection statistics', async () => {
      const mockStats = [{
        total_connections: BigInt(10),
        active_connections: BigInt(5),
        idle_connections: BigInt(5),
      }];
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(mockStats);

      const result = await PrismaHelpers.getConnectionStats();

      expect(result).toEqual({
        total: 10,
        active: 5,
        idle: 5,
      });
    });

    it('should handle connection stats errors', async () => {
      const error = new Error('Stats error');
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await PrismaHelpers.getConnectionStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        idle: 0,
        error: 'Stats error',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get connection stats:', error);
      
      consoleSpy.mockRestore();
    });

    it('should handle empty stats result', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

      const result = await PrismaHelpers.getConnectionStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        idle: 0,
      });
    });
  });
});