"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../notifications/notifications.module.css";
import { formatNotification } from "../lib/notifications";
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "../actions/notifications";
import { useRouter } from "next/navigation";
import { db } from "../lib/firebase/firebase-client";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function NotificationsClient({ initialNotifications, userId }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("target_user_id", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const realTimeNotifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
      });
      setNotifications(realTimeNotifications);
    }, (error) => {
      console.error("Realtime notifications error:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAsRead = async (id) => {
    // Optimistic UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await markNotificationAsRead(id, userId);
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(userId);
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await handleMarkAsRead(n.id);
    }
    if (n.notification_url) {
      router.push(n.notification_url);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Don't trigger the notification click/read
    // Optimistic UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id, userId);
  };

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className={styles.list}>
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.notificationItem} ${!n.isRead ? styles.unread : ""}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div 
                className={styles.avatar} 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering notification click when clicking avatar
                  router.push(`/profile/${n.actor_id}`);
                }}
              >
                {n.actor_profile_pic ? (
                  <img src={n.actor_profile_pic} alt={n.actor_name} />
                ) : (
                  <span>{n.actor_name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div className={styles.content}>
                <p className={styles.text}>
                  <span 
                    className={styles.actorName}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${n.actor_id}`);
                    }}
                  >
                    {n.actor_name}
                  </span>{" "}
                  {formatNotification(n).message}
                </p>
                <span className={styles.time}>{formatNotification(n).time}</span>
              </div>

              <div className={styles.actions}>
                {!n.isRead && <div className={styles.unreadDot} />}
                <button 
                  className={styles.deleteBtn} 
                  onClick={(e) => handleDelete(e, n.id)}
                  title="Delete notification"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>No notifications yet.</div>
        )}
      </div>
    </>
  );
}
