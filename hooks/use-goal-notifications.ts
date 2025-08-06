// React hook for managing goal notifications

import { useState, useEffect, useCallback } from 'react';
import { GoalNotification } from '@/types';
import { useToast } from './use-toast';

interface UseGoalNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showToasts?: boolean;
}

interface UseGoalNotificationsReturn {
  notifications: GoalNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useGoalNotifications(
  options: UseGoalNotificationsOptions = {}
): UseGoalNotificationsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    showToasts = true
  } = options;

  const [notifications, setNotifications] = useState<GoalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const refreshNotifications = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/goals/notifications');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      if (data.success) {
        const newNotifications = data.notifications || [];
        
        // Show toast notifications for new unread notifications
        if (showToasts && notifications.length > 0) {
          const newUnreadNotifications = newNotifications.filter(
            (newNotif: GoalNotification) => 
              !notifications.some(existingNotif => existingNotif.id === newNotif.id)
          );

          newUnreadNotifications.forEach((notification: GoalNotification) => {
            toast({
              title: notification.title,
              description: notification.message,
              duration: 5000,
            });
          });
        }

        setNotifications(newNotifications);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch goal notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [notifications, showToasts, toast]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/goals/notifications/${notificationId}`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
      } else {
        throw new Error(data.error || 'Failed to mark notification as read');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to mark notification as read:', err);
      
      if (showToasts) {
        toast({
          title: 'Error',
          description: `Failed to mark notification as read: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    }
  }, [showToasts, toast]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/goals/notifications', {
        method: 'PUT',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }

      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );

        if (showToasts) {
          toast({
            title: 'Success',
            description: 'All notifications marked as read',
          });
        }
      } else {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to mark all notifications as read:', err);
      
      if (showToasts) {
        toast({
          title: 'Error',
          description: `Failed to mark notifications as read: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    }
  }, [showToasts, toast]);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshNotifications, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  };
}