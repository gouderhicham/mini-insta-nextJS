import { formatTimeAgo } from "./formatDate";

/**
 * Formats the notification text and time based on its type.
 * @param {Object} notification - The notification object from Firestore
 * @returns {Object} - { text: string, time: string }
 */
export function formatNotification(notification) {
  const { type, actor_name, content, createdAt } = notification;
  let text = "";

  switch (type) {
    case "post_like":
      text = "liked your post";
      break;
    case "comment_like":
      text = "liked your comment";
      break;
    case "post_comment":
      text = `commented on your post: "${content}"`;
      break;
    case "new_follow":
      text = "started following you";
      break;
    case "message_received":
      text = "sent you a message";
      break;
    default:
      text = "performed an action";
  }

  return {
    fullText: `${actor_name} ${text}`,
    message: text,
    time: formatTimeAgo(createdAt),
  };
}
