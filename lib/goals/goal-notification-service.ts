// Goal Notification Service for Progress Milestones and Achievements

import crypto from 'crypto';
import { getNileClient } from '../database/nile-client';
import { 
  Goal, 
  GoalNotification
} from '../../types';

export interface NotificationServiceOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface MilestoneDetectionResult {
  notifications: Omit<GoalNotification, 'id' | 'createdAt'>[];
  milestonesReached: number[];
}

export class GoalNotificationService {
  private dbClient = getNileClient();
  private options: Required<NotificationServiceOptions>;

  constructor(options: NotificationServiceOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.options.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Notification service operation failed, retrying... (${retries} attempts left)`, error);
        await this.delay(this.options.retryDelayMs);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    const retryableMessages = [
      'connection terminated',
      'server closed the connection',
      'timeout',
      'connection refused',
    ];

    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return retryableMessages.some(msg => message.includes(msg));
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Detects milestone achievements for a goal based on progress change
   * @param goal - The goal to check for milestones
   * @param previousAmount - Previous progress amount
   * @param currentAmount - Current progress amount
   * @returns Promise resolving to milestone detection result
   */
  async detectMilestones(
    goal: Goal, 
    previousAmount: number, 
    currentAmount: number
  ): Promise<MilestoneDetectionResult> {
    const notifications: Omit<GoalNotification, 'id' | 'createdAt'>[] = [];
    const milestonesReached: number[] = [];

    if (goal.targetAmount <= 0) {
      return { notifications, milestonesReached };
    }

    const previousPercentage = (previousAmount / goal.targetAmount) * 100;
    const currentPercentage = (currentAmount / goal.targetAmount) * 100;

    // Define milestone thresholds
    const milestones = [25, 50, 75, 100];

    for (const milestone of milestones) {
      // Check if we crossed this milestone
      if (previousPercentage < milestone && currentPercentage >= milestone) {
        milestonesReached.push(milestone);

        let notificationType: GoalNotification['type'];
        let title: string;
        let message: string;

        if (milestone === 100) {
          notificationType = 'completion';
          title = '🎉 Goal Completed!';
          message = `Congratulations! You've successfully completed your goal "${goal.title}".`;
        } else {
          notificationType = 'milestone';
          title = `🎯 ${milestone}% Milestone Reached!`;
          message = `Great progress! You've reached ${milestone}% of your goal "${goal.title}".`;
        }

        notifications.push({
          userId: goal.userId,
          goalId: goal.id,
          type: notificationType,
          title,
          message,
          data: {
            milestone,
            progressPercentage: Math.round(currentPercentage * 100) / 100,
            daysRemaining: this.calculateDaysRemaining(goal.targetDate)
          },
          read: false
        });
      }
    }

    return { notifications, milestonesReached };
  }

  /**
   * Detects if a goal is behind or ahead of schedule
   * @param goal - The goal to check
   * @returns Promise resolving to schedule notification if applicable
   */
  async detectScheduleStatus(goal: Goal): Promise<Omit<GoalNotification, 'id' | 'createdAt'> | null> {
    const currentPercentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const daysRemaining = this.calculateDaysRemaining(goal.targetDate);
    const totalDays = this.calculateTotalDays(goal.createdAt, goal.targetDate);
    const daysPassed = totalDays - daysRemaining;
    
    if (totalDays <= 0 || daysPassed <= 0) {
      return null; // Can't determine schedule status
    }

    const expectedPercentage = (daysPassed / totalDays) * 100;
    const scheduleVariance = currentPercentage - expectedPercentage;

    // Only notify if significantly behind or ahead (more than 15% variance)
    if (Math.abs(scheduleVariance) < 15) {
      return null;
    }

    let notificationType: GoalNotification['type'];
    let title: string;
    let message: string;

    if (scheduleVariance < -15) {
      // Behind schedule
      notificationType = 'behind_schedule';
      title = '⚠️ Goal Behind Schedule';
      message = `Your goal "${goal.title}" is behind schedule. Consider increasing your efforts to stay on track.`;
    } else {
      // Ahead of schedule
      notificationType = 'ahead_schedule';
      title = '🚀 Goal Ahead of Schedule';
      message = `Excellent work! Your goal "${goal.title}" is ahead of schedule.`;
    }

    return {
      userId: goal.userId,
      goalId: goal.id,
      type: notificationType,
      title,
      message,
      data: {
        progressPercentage: Math.round(currentPercentage * 100) / 100,
        daysRemaining
      },
      read: false
    };
  }

  /**
   * Detects if a goal deadline is approaching
   * @param goal - The goal to check
   * @returns Promise resolving to deadline notification if applicable
   */
  async detectDeadlineApproaching(goal: Goal): Promise<Omit<GoalNotification, 'id' | 'createdAt'> | null> {
    const daysRemaining = this.calculateDaysRemaining(goal.targetDate);
    const currentPercentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    // Notify when 7 days or less remaining and goal is not completed
    if (daysRemaining <= 7 && daysRemaining > 0 && currentPercentage < 100) {
      return {
        userId: goal.userId,
        goalId: goal.id,
        type: 'deadline_approaching',
        title: '⏰ Goal Deadline Approaching',
        message: `Your goal "${goal.title}" is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Current progress: ${Math.round(currentPercentage)}%.`,
        data: {
          progressPercentage: Math.round(currentPercentage * 100) / 100,
          daysRemaining
        },
        read: false
      };
    }

    return null;
  }

  /**
   * Processes goal progress change and generates appropriate notifications
   * @param goal - The goal that was updated
   * @param previousAmount - Previous progress amount
   * @param currentAmount - Current progress amount
   * @returns Promise resolving to array of generated notifications
   */
  async processGoalProgressChange(
    goal: Goal, 
    previousAmount: number, 
    currentAmount: number
  ): Promise<GoalNotification[]> {
    return this.executeWithRetry(async () => {
      const allNotifications: Omit<GoalNotification, 'id' | 'createdAt'>[] = [];

      // Detect milestone achievements
      const milestoneResult = await this.detectMilestones(goal, previousAmount, currentAmount);
      allNotifications.push(...milestoneResult.notifications);

      // Only check schedule status and deadline for active goals
      if (goal.status === 'active') {
        // Detect schedule status (but not too frequently - only on significant progress changes)
        const progressChange = Math.abs(currentAmount - previousAmount);
        const significantChange = progressChange >= (goal.targetAmount * 0.05); // 5% of target

        if (significantChange) {
          const scheduleNotification = await this.detectScheduleStatus(goal);
          if (scheduleNotification) {
            allNotifications.push(scheduleNotification);
          }
        }

        // Check deadline approaching
        const deadlineNotification = await this.detectDeadlineApproaching(goal);
        if (deadlineNotification) {
          allNotifications.push(deadlineNotification);
        }
      }

      // Save notifications to database
      const savedNotifications: GoalNotification[] = [];
      for (const notification of allNotifications) {
        try {
          const savedNotification = await this.saveNotification(notification);
          savedNotifications.push(savedNotification);
        } catch (error) {
          console.error(`Failed to save notification for goal ${goal.id}:`, error);
        }
      }

      return savedNotifications;
    });
  }

  /**
   * Saves a notification to the database
   * @param notification - The notification to save
   * @returns Promise resolving to the saved notification
   */
  private async saveNotification(
    notification: Omit<GoalNotification, 'id' | 'createdAt'>
  ): Promise<GoalNotification> {
    return this.executeWithRetry(async () => {
      const notificationId = crypto.randomUUID();
      
      await this.dbClient.query(`
        INSERT INTO goal_notifications (
          id, user_id, goal_id, type, title, message, data, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        notificationId,
        notification.userId,
        notification.goalId,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
        notification.read
      ]);

      const savedNotification = await this.dbClient.queryOne<GoalNotification>(`
        SELECT 
          id,
          user_id as "userId",
          goal_id as "goalId",
          type,
          title,
          message,
          data,
          read,
          created_at as "createdAt"
        FROM goal_notifications
        WHERE id = $1
      `, [notificationId]);

      if (!savedNotification) {
        throw new Error('Failed to retrieve saved notification');
      }

      // Parse JSON data field
      if (savedNotification.data && typeof savedNotification.data === 'string') {
        savedNotification.data = JSON.parse(savedNotification.data);
      }

      return savedNotification;
    });
  }

  /**
   * Gets unread notifications for a user
   * @param userId - The user ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise resolving to array of unread notifications
   */
  async getUnreadNotifications(userId: string, limit: number = 50): Promise<GoalNotification[]> {
    return this.executeWithRetry(async () => {
      const notifications = await this.dbClient.query<GoalNotification>(`
        SELECT 
          id,
          user_id as "userId",
          goal_id as "goalId",
          type,
          title,
          message,
          data,
          read,
          created_at as "createdAt"
        FROM goal_notifications
        WHERE user_id = $1 AND read = false
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      if (!notifications || !Array.isArray(notifications)) {
        return [];
      }

      // Parse JSON data fields
      return notifications.map(notification => ({
        ...notification,
        data: notification.data && typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data
      }));
    });
  }

  /**
   * Marks a notification as read
   * @param notificationId - The notification ID
   * @param userId - The user ID (for security)
   * @returns Promise that resolves when the notification is marked as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.dbClient.query(`
        UPDATE goal_notifications 
        SET read = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);
    });
  }

  /**
   * Marks all notifications as read for a user
   * @param userId - The user ID
   * @returns Promise that resolves when all notifications are marked as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.dbClient.query(`
        UPDATE goal_notifications 
        SET read = true, updated_at = NOW()
        WHERE user_id = $1 AND read = false
      `, [userId]);
    });
  }

  /**
   * Calculates days remaining until target date
   * @param targetDate - The target date string
   * @returns Number of days remaining (can be negative if overdue)
   */
  private calculateDaysRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const today = new Date();
    const timeDiff = target.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Calculates total days between two dates
   * @param startDate - The start date string
   * @param endDate - The end date string
   * @returns Total number of days
   */
  private calculateTotalDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

// Singleton instance
let notificationServiceInstance: GoalNotificationService | null = null;

export function getGoalNotificationService(options?: NotificationServiceOptions): GoalNotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new GoalNotificationService(options);
  }
  return notificationServiceInstance;
}

// Export for testing
export { GoalNotificationService as _GoalNotificationService };