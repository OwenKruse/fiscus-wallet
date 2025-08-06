// Tests for Goal Notification Service

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoalNotificationService } from '../goal-notification-service';
import { Goal } from '../../../types';

// Mock the database client
const mockDbClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
};

vi.mock('../../database/nile-client', () => ({
  getNileClient: () => mockDbClient,
}));

describe('GoalNotificationService', () => {
  let notificationService: GoalNotificationService;
  let mockGoal: Goal;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new GoalNotificationService();
    
    mockGoal = {
      id: 'goal-123',
      userId: 'user-123',
      title: 'Save for vacation',
      description: 'Save $5000 for vacation',
      goalType: 'savings',
      category: 'travel',
      targetAmount: 5000,
      currentAmount: 1000,
      targetDate: '2024-12-31',
      status: 'active',
      priority: 'medium',
      isPrimary: false,
      trackingAccountIds: [],
      trackingMethod: 'manual',
      trackingConfig: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
  });

  describe('detectMilestones', () => {
    it('should detect 25% milestone', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 1000, 1250);
      
      expect(result.milestonesReached).toContain(25);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('milestone');
      expect(result.notifications[0].title).toContain('25%');
    });

    it('should detect 50% milestone', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 1000, 2500);
      
      expect(result.milestonesReached).toContain(25);
      expect(result.milestonesReached).toContain(50);
      expect(result.notifications).toHaveLength(2); // Both 25% and 50% milestones
      expect(result.notifications.some(n => n.title.includes('50%'))).toBe(true);
    });

    it('should detect 75% milestone', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 3500, 3750);
      
      expect(result.milestonesReached).toContain(75);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('milestone');
      expect(result.notifications[0].title).toContain('75%');
    });

    it('should detect completion (100%)', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 4000, 5000);
      
      expect(result.milestonesReached).toContain(100);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('completion');
      expect(result.notifications[0].title).toContain('Completed');
    });

    it('should detect multiple milestones in one jump', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 500, 4000);
      
      expect(result.milestonesReached).toContain(25);
      expect(result.milestonesReached).toContain(50);
      expect(result.milestonesReached).toContain(75);
      expect(result.notifications).toHaveLength(3);
    });

    it('should not detect milestones when going backwards', async () => {
      const result = await notificationService.detectMilestones(mockGoal, 3000, 2000);
      
      expect(result.milestonesReached).toHaveLength(0);
      expect(result.notifications).toHaveLength(0);
    });

    it('should handle zero target amount', async () => {
      const zeroTargetGoal = { ...mockGoal, targetAmount: 0 };
      const result = await notificationService.detectMilestones(zeroTargetGoal, 0, 100);
      
      expect(result.milestonesReached).toHaveLength(0);
      expect(result.notifications).toHaveLength(0);
    });
  });

  describe('detectScheduleStatus', () => {
    it('should detect behind schedule status', async () => {
      // Goal created 6 months ago, target date in 6 months, but only 10% complete
      const behindGoal = {
        ...mockGoal,
        currentAmount: 500, // 10% of 5000
        createdAt: '2024-01-01T00:00:00Z',
        targetDate: '2024-12-31T00:00:00Z'
      };

      const result = await notificationService.detectScheduleStatus(behindGoal);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('behind_schedule');
      expect(result?.title).toContain('Behind Schedule');
    });

    it('should detect ahead of schedule status', async () => {
      // Goal created recently but already 90% complete
      const aheadGoal = {
        ...mockGoal,
        currentAmount: 4500, // 90% of 5000
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        targetDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString() // 300 days from now
      };

      const result = await notificationService.detectScheduleStatus(aheadGoal);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('ahead_schedule');
      expect(result?.title).toContain('Ahead of Schedule');
    });

    it('should return null for on-track goals', async () => {
      // Goal with reasonable progress for time elapsed
      const onTrackGoal = {
        ...mockGoal,
        currentAmount: 2500, // 50% of 5000
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days from now
      };

      const result = await notificationService.detectScheduleStatus(onTrackGoal);
      
      expect(result).toBeNull();
    });
  });

  describe('detectDeadlineApproaching', () => {
    it('should detect approaching deadline', async () => {
      const approachingGoal = {
        ...mockGoal,
        currentAmount: 3000, // 60% complete
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
      };

      const result = await notificationService.detectDeadlineApproaching(approachingGoal);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('deadline_approaching');
      expect(result?.title).toContain('Deadline Approaching');
      expect(result?.data?.daysRemaining).toBe(5);
    });

    it('should not notify for completed goals', async () => {
      const completedGoal = {
        ...mockGoal,
        currentAmount: 5000, // 100% complete
        targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      };

      const result = await notificationService.detectDeadlineApproaching(completedGoal);
      
      expect(result).toBeNull();
    });

    it('should not notify for distant deadlines', async () => {
      const distantGoal = {
        ...mockGoal,
        currentAmount: 3000, // 60% complete
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };

      const result = await notificationService.detectDeadlineApproaching(distantGoal);
      
      expect(result).toBeNull();
    });
  });

  describe('processGoalProgressChange', () => {
    beforeEach(() => {
      // Mock successful database operations
      mockDbClient.query.mockResolvedValue([]);
      mockDbClient.queryOne.mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        goalId: 'goal-123',
        type: 'milestone',
        title: '25% Milestone Reached!',
        message: 'Great progress!',
        data: '{"milestone": 25}',
        read: false,
        createdAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should process milestone notifications', async () => {
      const notifications = await notificationService.processGoalProgressChange(
        mockGoal,
        1000, // previous amount
        1250  // current amount (crosses 25% milestone)
      );

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.type === 'milestone')).toBe(true);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO goal_notifications'),
        expect.arrayContaining(['user-123', 'goal-123', 'milestone'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDbClient.query.mockRejectedValue(new Error('Database error'));

      const notifications = await notificationService.processGoalProgressChange(
        mockGoal,
        1000,
        1250
      );

      // Should return empty array on error, not throw
      expect(notifications).toHaveLength(0);
    });
  });

  describe('getUnreadNotifications', () => {
    it('should retrieve unread notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          userId: 'user-123',
          goalId: 'goal-123',
          type: 'milestone',
          title: '25% Milestone',
          message: 'Great progress!',
          data: '{"milestone": 25}',
          read: false,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockDbClient.query.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUnreadNotifications('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notification-1');
      expect(result[0].data).toEqual({ milestone: 25 });
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND read = false'),
        ['user-123', 50]
      );
    });

    it('should handle empty results', async () => {
      mockDbClient.query.mockResolvedValue([]);

      const result = await notificationService.getUnreadNotifications('user-123');

      expect(result).toHaveLength(0);
    });

    it('should handle null/undefined results', async () => {
      mockDbClient.query.mockResolvedValue(null);

      const result = await notificationService.getUnreadNotifications('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockDbClient.query.mockResolvedValue([]);

      await notificationService.markNotificationAsRead('notification-123', 'user-123');

      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE goal_notifications'),
        ['notification-123', 'user-123']
      );
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockDbClient.query.mockResolvedValue([]);

      await notificationService.markAllNotificationsAsRead('user-123');

      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE goal_notifications'),
        ['user-123']
      );
    });
  });
});