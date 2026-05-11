"use server";

import { db } from "../lib/firebase/firebase.admin";
import admin from "firebase-admin";

/**
 * Creates a new notification in Firestore.
 * @param {Object} data - Notification data
 * @param {string} data.type - 'post_like', 'comment_like', 'post_comment', 'new_follow'
 * @param {string} data.actor_id - UID of the user who performed the action
 * @param {string} data.target_user_id - UID of the user who will receive the notification
 * @param {string} [data.post_id] - ID of the relevant post
 * @param {string} [data.comment_id] - ID of the relevant comment
 * @param {string} [data.content] - Preview text or extra content
 */
export async function createNotification(data) {
  try {
    const { type, actor_id, target_user_id, post_id, comment_id, content } =
      data;

    // Don't notify if the actor is the target (e.g., liking your own post)
    if (actor_id === target_user_id) return { success: true, skipped: true };

    // Fetch actor details to denormalize
    const actorDoc = await db.collection("users").doc(actor_id).get();
    if (!actorDoc.exists) return { error: "Actor not found" };

    const actorData = actorDoc.data();

    // Generate deep-link URL
    let notification_url = "";
    if (type === "post_like") {
      notification_url = `/post/${post_id}`;
    } else if (type === "post_comment" || type === "comment_like") {
      notification_url = `/post/${post_id}?commentId=${comment_id}`;
    } else if (type === "new_follow") {
      notification_url = `/profile/${actor_id}`; // Follow notification takes you to actor profile
    }

    const notificationData = {
      type,
      actor_id,
      actor_name: actorData.fullName || actorData.username || "Unknown",
      actor_username: actorData.username || "",
      actor_profile_pic: actorData.profilePic || "",
      target_user_id,
      post_id: post_id || "",
      comment_id: comment_id || "",
      content: content || "",
      notification_url,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = db.collection("notifications").doc();
    const userRef = db.collection("users").doc(target_user_id);

    await db.runTransaction(async (transaction) => {
      transaction.set(docRef, notificationData);
      transaction.update(userRef, {
        unread_notification_count: admin.firestore.FieldValue.increment(1),
      });
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { error: "Failed to create notification" };
  }
}

export async function getNotifications(userId) {
  try {
    const snapshot = await db
      .collection("notifications")
      .where("target_user_id", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate().toISOString() ||
        new Date().toISOString(),
    }));

    return { notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { error: "Failed to fetch notifications" };
  }
}

export async function markNotificationAsRead(notificationId, userId) {
  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(notificationRef);
      if (doc.exists && !doc.data().isRead) {
        transaction.update(notificationRef, { isRead: true });
        transaction.update(userRef, {
          unread_notification_count: admin.firestore.FieldValue.increment(-1),
        });
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { error: "Failed to update notification" };
  }
}

export async function markAllNotificationsAsRead(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const snapshot = await db
      .collection("notifications")
      .where("target_user_id", "==", userId)
      .where("isRead", "==", false)
      .get();

    if (snapshot.empty) return { success: true };

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });

    // Reset the counter to 0
    batch.update(userRef, { unread_notification_count: 0 });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { error: "Failed to update notifications" };
  }
}

export async function getUnreadNotificationsCount(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return { count: 0 };

    return { count: userDoc.data().unread_notification_count || 0 };
  } catch (error) {
    console.error("Error getting unread count:", error);
    return { count: 0 };
  }
}

export async function deleteNotification(notificationId, userId) {
  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(notificationRef);
      if (doc.exists) {
        const isRead = doc.data().isRead;
        transaction.delete(notificationRef);
        
        // If it was unread, we should also decrement the user's unread counter
        if (!isRead) {
          transaction.update(userRef, {
            unread_notification_count: admin.firestore.FieldValue.increment(-1)
          });
        }
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { error: "Failed to delete notification" };
  }
}
