# Firestore Database Schema - Social Media Mini App

This document outlines the final database structure optimized for scalability, cost-efficiency (minimized Reads), and performance using the **JWT Authentication Strategy**.

## 1. Root Collection: `users`
Stores user profile information and global stats.
- **Path:** `/users/{uid}`
- **ID:** The Firebase Auth UID.

| Field | Type | Description |
| :--- | :--- | :--- |
| `username` | string | Unique handle (e.g., @hicham_dev). |
| `fullName` | string | User's real or display name. |
| `email` | string | Verified email address. |
| `profilePic` | string | URL link to the profile image. |
| `bio` | string | Optional short biography. |
| `followerCount` | number | Denormalized count for fast UI rendering. |
| `followingCount`| number | Denormalized count for fast UI rendering. |
| `createdAt` | timestamp | Account creation date. |

---

## 2. Root Collection: `posts`
Each post is a top-level entity to avoid document size limits.
- **Path:** `/posts/{postId}`
- **ID:** Auto-generated.

| Field | Type | Description |
| :--- | :--- | :--- |
| `authorId` | string | Reference to the user's UID. |
| `authorName` | string | Denormalized: User's name at time of posting. |
| `authorPic` | string | Denormalized: User's pic at time of posting. |
| `content` | string | The text content of the post. |
| `imageUrl` | string? | Optional URL for an attached image. |
| `likeCount` | number | Aggregated total likes. |
| `commentCount`| number | Aggregated total comments. |
| `createdAt` | timestamp | Post creation date (used for feed sorting). |

---

## 3. Sub-collection: `comments`
Nested under posts for logical grouping and cascading deletes.
- **Path:** `/posts/{postId}/comments/{commentId}`
- **ID:** Auto-generated.

| Field | Type | Description |
| :--- | :--- | :--- |
| `authorId` | string | UID of the commenter. |
| `authorName` | string | Denormalized commenter name. |
| `text` | string | The comment text. |
| `likeCount` | number | Aggregated total likes on this comment. |
| `createdAt` | timestamp | Comment creation date. |

---

## 4. Sub-collections: `likes`
Used to track "who liked what" without hitting the 1MB document limit.
- **Post Likes:** `/posts/{postId}/likes/{uid}`
- **Comment Likes:** `/posts/{postId}/comments/{commentId}/likes/{uid}`
- **Fields:**
    - `createdAt`: timestamp

*Note: Use the User's UID as the Document ID to make "Check if I liked this" a simple `exists()` check.*

---

## 5. Root Collection: `social_graph`
Manages following/follower relationships.
- **Path:** `/social_graph/{followerId_followingId}`
- **ID:** Composite ID (e.g., `UserA_UserB`).

| Field | Type | Description |
| :--- | :--- | :--- |
| `followerId` | string | UID of the person following. |
| `followingId`| string | UID of the person being followed. |
| `createdAt` | timestamp | Relationship creation date. |

---

## 6. Root Collection: `usernames` (Utility)
Ensures username uniqueness across the platform.
- **Path:** `/usernames/{username_string}`
- **ID:** The lowercase username itself.
- **Fields:**
    - `uid`: string (The owner of the username).

---

## 7. Root Collection: `chats` (Messaging Inbox)
Stores the high-level conversation metadata. This prevents fetching the entire message history just to show the inbox list. It is optimized for speed and cheap reads.
- **Path:** `/chats/{chatId}`
- **ID:** Combined UID (e.g., `uid1_uid2` sorted alphabetically).

| Field | Type | Description |
| :--- | :--- | :--- |
| `participants` | array | Array of UIDs in the chat (e.g., `["uid1", "uid2"]`). Allows querying inbox. |
| `lastMessage` | string | Snippet of the latest message to show in the inbox UI. |
| `lastMessageAt` | timestamp | Used to sort the inbox by most recent activity. |
| `unreadCount` | map | Tracks unread count cheaply (e.g., `{ "uid1": 0, "uid2": 1 }`). |
| `lastReadMessageId` | map | Cheap read receipts (e.g., `{ "uid1": "msgId", "uid2": "msgId" }`). 1 write vs N per-message updates. |

---

## 8. Sub-collection: `messages` (Chat History)
Stores the actual messages. Kept as a subcollection to isolate data and keep queries extremely fast.
- **Path:** `/chats/{chatId}/messages/{messageId}`
- **ID:** Auto-generated.

| Field | Type | Description |
| :--- | :--- | :--- |
| `senderId` | string | UID of the person who sent the message. |
| `text` | string | The message content. |
| `createdAt` | timestamp | Time the message was sent (for ordering). |

*Note: No per-message `read` field. Read status is tracked via `lastReadMessageId` on the parent chat doc — this is 1 write instead of N writes when marking messages as read.*