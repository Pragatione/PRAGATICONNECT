/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Real-Time Firestore Notification System
 * Handles:
 *  1. Firestore `notifications` collection
 *  2. Company sends enquiry → notifies contractor
 *  3. Contractor applies for work → notifies company
 *  4. Application status changes → notifies contractor
 *  5. Bell icon in navbar with real-time unread badge
 *  6. Interactive dropdown with recent notifications
 *  7. Icon, message, timestamp, read/unread status
 *  8. Click to mark as read & navigate
 *  9. Real-time updates via Firestore onSnapshot
 */

import { auth, db, isFirebaseLive } from './firebase-config.js';
import { getCollection, updateDocument, addDocument } from './common.js';
import { t, applyTranslations } from './i18n.js';

const STORAGE_KEY_NOTIFICATIONS = 'pragati_notifications';

/**
 * Format relative time (e.g., 'Just now', '5m ago', '2h ago', 'Yesterday', '3d ago')
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return t('notif_just_now', 'Just now');
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay === 1) {
    return 'Yesterday';
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Fetch all notifications for a specific user ID
 */
export async function getUserNotifications(userId) {
  if (!userId) return [];
  const allNotifs = await getCollection('notifications');
  const userNotifs = allNotifs.filter(n => n.recipientUid === userId);
  return userNotifs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

/**
 * Create a new notification in Firestore and notify subscribers
 * @param {Object} options
 * @param {string} options.recipientUid - Target user UID (contractor or company)
 * @param {string} options.senderUid - Sender user UID
 * @param {string} options.senderName - Sender display or firm name
 * @param {'enquiry'|'application'|'status_change'} options.type - Notification type
 * @param {string} options.title - Short notification title
 * @param {string} options.message - Detailed descriptive message
 * @param {string} [options.icon] - Bootstrap icon class (e.g. 'bi-envelope-paper-fill text-primary')
 * @param {string} [options.link] - Deep link URL
 * @param {Object} [options.metadata] - Extra metadata (e.g. enquiryId, applicationId)
 */
export async function createNotification({
  recipientUid,
  senderUid,
  senderName,
  type,
  title,
  message,
  icon,
  link,
  metadata = {}
}) {
  if (!recipientUid) {
    console.warn("⚠️ Cannot create notification without recipientUid");
    return null;
  }

  // Determine standard icon if not provided
  let defaultIcon = 'bi-bell-fill text-primary';
  if (type === 'enquiry') defaultIcon = 'bi-envelope-paper-fill text-primary';
  else if (type === 'application') defaultIcon = 'bi-briefcase-fill text-warning';
  else if (type === 'status_change') {
    if (metadata.status === 'awarded') defaultIcon = 'bi-trophy-fill text-success';
    else if (metadata.status === 'shortlisted') defaultIcon = 'bi-star-fill text-primary';
    else if (metadata.status === 'rejected') defaultIcon = 'bi-x-circle-fill text-danger';
    else defaultIcon = 'bi-info-circle-fill text-info';
  }

  const notificationData = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipientUid,
    senderUid: senderUid || 'system',
    senderName: senderName || 'Pragati Connect',
    type: type || 'general',
    title: title || 'New Notification',
    message: message || '',
    icon: icon || defaultIcon,
    link: link || '',
    read: false,
    createdAt: new Date().toISOString(),
    metadata
  };

  // 1. Save to Firestore (and fallback local store)
  await addDocument('notifications', notificationData);

  // 2. Dispatch custom events for immediate reactivity
  try {
    window.dispatchEvent(new CustomEvent('pragati_notification_created', { detail: notificationData }));
  } catch (e) {
    console.error("Error dispatching notification created event:", e);
  }

  console.log(`🔔 Notification dispatched to [${recipientUid}]:`, title);
  return notificationData;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;

  try {
    await updateDocument('notifications', notificationId, { read: true });
    window.dispatchEvent(new CustomEvent('pragati_notification_updated', {
      detail: { id: notificationId, read: true }
    }));
  } catch (err) {
    console.error(`Failed to mark notification ${notificationId} as read:`, err);
  }
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return;

  const notifs = await getUserNotifications(userId);
  const unread = notifs.filter(n => !n.read);

  for (const notif of unread) {
    await updateDocument('notifications', notif.id, { read: true });
  }

  window.dispatchEvent(new CustomEvent('pragati_notification_updated', {
    detail: { userId, allRead: true }
  }));
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications(userId) {
  if (!userId) return;

  const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
  if (raw) {
    try {
      const all = JSON.parse(raw);
      const remaining = all.filter(n => n.recipientUid !== userId);
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(remaining));
    } catch (e) {
      console.warn("Failed to clear local notifications:", e);
    }
  }

  window.dispatchEvent(new CustomEvent('pragati_notification_updated', {
    detail: { userId, cleared: true }
  }));
}

/**
 * Subscribe to notifications in real-time.
 * Uses Firestore `onSnapshot` if live Firebase is configured;
 * seamlessly combines with reactive local event listeners so updates are immediate.
 * 
 * @param {string} userId
 * @param {function(Array): void} callback
 * @returns {function(): void} unsubscribe cleanup function
 */
export function subscribeToNotifications(userId, callback) {
  if (!userId || typeof callback !== 'function') {
    return () => {};
  }

  let firestoreUnsubscribe = null;
  let isSubscribed = true;

  // Function to pull latest local state and trigger callback
  const fetchAndPushLocal = async () => {
    if (!isSubscribed) return;
    try {
      const items = await getUserNotifications(userId);
      callback(items);
    } catch (e) {
      console.warn("Failed to get local notifications:", e);
    }
  };

  // Initial immediate call with cached / local data
  fetchAndPushLocal();

  // Attempt real-time Firestore onSnapshot listener
  if (isFirebaseLive && db) {
    (async () => {
      try {
        const { collection, query, where, onSnapshot } = await import(
          "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
        );

        if (!isSubscribed) return;

        const notifsQuery = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', userId)
        );

        firestoreUnsubscribe = onSnapshot(notifsQuery, (snapshot) => {
          if (!isSubscribed) return;
          const liveList = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));

          // Sort newest first
          liveList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          // Merge into local cache
          try {
            const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS) || '[]';
            const localAll = JSON.parse(raw);
            const others = localAll.filter(n => n.recipientUid !== userId);
            localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([...liveList, ...others]));
          } catch (e) {
            console.warn("Could not sync local storage cache:", e);
          }

          callback(liveList);
        }, (err) => {
          console.warn("🔥 Firestore onSnapshot error on 'notifications':", err);
          // Fall back to local reactive polling/events
          fetchAndPushLocal();
        });

        console.log(`🔥 Firestore onSnapshot subscribed for notifications [${userId}]`);
      } catch (err) {
        console.warn("Could not establish Firestore onSnapshot for notifications:", err);
      }
    })();
  }

  // Cross-component and cross-tab reactive listeners
  const onCreated = (e) => {
    if (e.detail && e.detail.recipientUid === userId) {
      fetchAndPushLocal();
    }
  };

  const onUpdated = () => {
    fetchAndPushLocal();
  };

  const onStorage = (e) => {
    if (e.key === STORAGE_KEY_NOTIFICATIONS) {
      fetchAndPushLocal();
    }
  };

  window.addEventListener('pragati_notification_created', onCreated);
  window.addEventListener('pragati_notification_updated', onUpdated);
  window.addEventListener('storage', onStorage);

  // Return comprehensive cleanup function
  return () => {
    isSubscribed = false;
    if (typeof firestoreUnsubscribe === 'function') {
      try {
        firestoreUnsubscribe();
      } catch (e) {
        console.warn("Error unhooking onSnapshot:", e);
      }
    }
    window.removeEventListener('pragati_notification_created', onCreated);
    window.removeEventListener('pragati_notification_updated', onUpdated);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Initialize navbar notification UI component
 * Attaches real-time listeners, renders badge and dropdown items
 */
let currentNotificationSubscription = null;

export function setupNavbarNotifications(currentUser) {
  if (currentNotificationSubscription) {
    currentNotificationSubscription();
    currentNotificationSubscription = null;
  }

  const badgeEl = document.getElementById('notificationBadge');
  const countPill = document.getElementById('notificationUnreadCountPill');
  const listContainer = document.getElementById('notificationListContainer');
  const markAllBtn = document.getElementById('markAllReadBtn');
  const clearAllBtn = document.getElementById('clearAllNotifsBtn');

  if (!currentUser || !badgeEl || !listContainer) {
    return;
  }

  // Handle Mark All Read
  if (markAllBtn) {
    markAllBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await markAllNotificationsAsRead(currentUser.uid);
    };
  }

  // Handle Clear All
  if (clearAllBtn) {
    clearAllBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await clearAllNotifications(currentUser.uid);
    };
  }

  // Subscribe to real-time updates
  currentNotificationSubscription = subscribeToNotifications(currentUser.uid, (notifications) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    // 1. Update Badge
    if (unreadCount > 0) {
      badgeEl.classList.remove('d-none');
      badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badgeEl.classList.add('pulse-badge');
    } else {
      badgeEl.classList.add('d-none');
      badgeEl.textContent = '0';
      badgeEl.classList.remove('pulse-badge');
    }

    // 2. Update Count Pill
    if (countPill) {
      countPill.textContent = unreadCount;
      if (unreadCount === 0) {
        countPill.classList.replace('bg-primary', 'bg-secondary');
      } else {
        countPill.classList.replace('bg-secondary', 'bg-primary');
      }
    }

    // 3. Render Items
    renderNotificationList(notifications, listContainer);
  });
}

/**
 * Render the list of notifications inside the dropdown
 */
function renderNotificationList(notifications, container) {
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center text-muted empty-notifications-state">
        <i class="bi bi-bell-slash fs-2 text-secondary mb-2 d-block opacity-50"></i>
        <div class="fw-semibold small" data-i18n="notif_empty">${t('notif_empty', 'No notifications yet')}</div>
        <p class="small text-muted mb-0 mt-1" style="font-size: 0.78rem;" data-i18n="notif_empty_sub">
          ${t('notif_empty_sub', "You'll be notified here when bids are submitted, enquiries sent, or status changes.")}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(notif => {
    const isUnread = !notif.read;
    const timeFormatted = formatRelativeTime(notif.createdAt);
    
    // Choose appropriate badge styling based on type
    let iconClass = notif.icon || 'bi-bell-fill text-primary';
    let iconBg = 'bg-primary-subtle';
    if (notif.type === 'enquiry') iconBg = 'bg-primary-subtle';
    else if (notif.type === 'application') iconBg = 'bg-warning-subtle';
    else if (notif.type === 'status_change') {
      if (notif.metadata?.status === 'awarded') iconBg = 'bg-success-subtle';
      else if (notif.metadata?.status === 'rejected') iconBg = 'bg-danger-subtle';
      else iconBg = 'bg-info-subtle';
    }

    return `
      <div class="notification-item p-3 border-bottom d-flex gap-3 align-items-start ${isUnread ? 'unread-notification' : 'read-notification'}" 
           data-id="${notif.id}" 
           data-link="${notif.link || ''}"
           role="button"
           tabindex="0">
        <div class="notification-icon-box rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${iconBg}" style="width: 38px; height: 38px;">
          <i class="bi ${iconClass} fs-5"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between align-items-baseline mb-1">
            <span class="fw-semibold text-dark text-truncate small ${isUnread ? 'fw-bold' : ''}" style="max-width: 190px;" title="${notif.title}">
              ${notif.title}
            </span>
            <span class="text-muted" style="font-size: 0.72rem; white-space: nowrap;">
              ${timeFormatted}
            </span>
          </div>
          <p class="small text-secondary mb-1 line-clamp-2" style="font-size: 0.8rem; line-height: 1.35;" title="${notif.message}">
            ${notif.message}
          </p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="text-muted" style="font-size: 0.7rem;">
              <i class="bi bi-person me-1"></i>${notif.senderName}
            </span>
            ${isUnread ? `
              <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-1 py-0" style="font-size: 0.65rem;">
                New
              </span>
            ` : `
              <span class="text-muted" style="font-size: 0.7rem;"><i class="bi bi-check2 text-muted"></i></span>
            `}
          </div>
        </div>
        ${isUnread ? `
          <div class="unread-dot flex-shrink-0 align-self-center">
            <span class="badge rounded-circle bg-primary p-1" style="width: 8px; height: 8px; display: inline-block;"></span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  applyTranslations(container);

  // Attach click listeners to each item
  container.querySelectorAll('.notification-item').forEach(itemEl => {
    itemEl.addEventListener('click', async (e) => {
      const id = itemEl.getAttribute('data-id');
      const link = itemEl.getAttribute('data-link');

      // 1. Mark as read in background
      await markNotificationAsRead(id);

      // 2. Visually update immediately
      itemEl.classList.remove('unread-notification');
      itemEl.classList.add('read-notification');
      const dot = itemEl.querySelector('.unread-dot');
      if (dot) dot.remove();

      // 3. Navigate if link provided
      if (link && link.trim() !== '') {
        // Small delay so mark-as-read is preserved and UX feels smooth
        setTimeout(() => {
          window.location.href = link;
        }, 150);
      }
    });
  });
}
