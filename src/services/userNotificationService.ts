/**
 * User Notification Service
 * Manages user activity notifications (e.g., Gmail Connected, Password Updated, Profile Name Changed)
 * with persistence in localStorage and real-time custom event broadcasting across the application.
 */

export interface UserActivityNotification {
  id: string;
  title: string;
  msg: string;
  time: string;
  timestamp: number;
  sev: 'critical' | 'high' | 'medium' | 'info';
  category: 'intel' | 'auth' | 'system' | 'ticket';
  route: string;
  read?: boolean;
}

const KEY_PREFIX = 'sentinel_custom_user_notifs_';

export class UserNotificationService {
  /**
   * Retrieves all custom activity notifications stored for a specific user email.
   */
  static getUserNotifications(email: string): UserActivityNotification[] {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return [];
    try {
      const raw = localStorage.getItem(`${KEY_PREFIX}${clean}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse user notifications:', e);
    }
    return [];
  }

  /**
   * Adds and broadcasts a new user activity notification.
   */
  static addUserNotification(
    email: string,
    notif: Omit<UserActivityNotification, 'timestamp' | 'time'> & {
      timestamp?: number;
      time?: string;
    }
  ): UserActivityNotification {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return notif as UserActivityNotification;

    const fullNotif: UserActivityNotification = {
      ...notif,
      timestamp: notif.timestamp || Date.now(),
      time:
        notif.time ||
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      const existing = this.getUserNotifications(clean);
      // Filter out duplicate ID if present, prepend new notification, keep last 50
      const updated = [fullNotif, ...existing.filter((n) => n.id !== fullNotif.id)].slice(0, 50);
      localStorage.setItem(`${KEY_PREFIX}${clean}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist user notification to localStorage:', e);
    }

    // Broadcast in real-time to TopBar and other UI components
    try {
      window.dispatchEvent(
        new CustomEvent('sentinel_user_notification_dispatched', {
          detail: { ...fullNotif, userEmail: clean },
        })
      );
    } catch (e) {
      console.warn('Failed to broadcast user notification event:', e);
    }

    return fullNotif;
  }

  /**
   * Deletes a notification by its unique ID.
   */
  static deleteUserNotification(email: string, notifId: string): void {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return;
    try {
      const existing = this.getUserNotifications(clean);
      const updated = existing.filter((n) => n.id !== notifId);
      localStorage.setItem(`${KEY_PREFIX}${clean}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete user notification:', e);
    }
  }

  /**
   * Clears all notifications for a specific user email.
   */
  static clearUserNotifications(email: string): void {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return;
    try {
      localStorage.removeItem(`${KEY_PREFIX}${clean}`);
    } catch (e) {
      console.warn('Failed to clear user notifications:', e);
    }
  }
}
