"use server";

import { db } from "../lib/firebase/firebase.admin";
import { auth } from "../../auth";
import { FieldValue } from "firebase-admin/firestore";

// Consistent chat ID between two users
const generateChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export async function getChats() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    const myUid = session.user.id;

    const snapshot = await db
      .collection("chats")
      .where("participants", "array-contains", myUid)
      .get();

    let chats = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.participants.find((id) => id !== myUid);
      chats.push({
        id: doc.id,
        otherUserId,
        lastMessage: data.lastMessage || "",
        lastMessageAt: data.lastMessageAt?.toMillis() || 0,
        unreadCount: data.unreadCount?.[myUid] || 0,
      });
    });

    chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Enrich with user profiles
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        try {
          const userDoc = await db.collection("users").doc(chat.otherUserId).get();
          if (userDoc.exists) {
            const u = userDoc.data();
            return {
              ...chat,
              fullName: u.fullName || u.username,
              username: u.username,
              profilePic: u.profilePic || null,
            };
          }
          return chat;
        } catch { return chat; }
      })
    );

    return { chats: enrichedChats };
  } catch (error) {
    console.error("Error fetching chats:", error);
    return { error: "Failed to fetch conversations" };
  }
}

export async function getOrCreateChat(otherUserId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    const myUid = session.user.id;
    if (myUid === otherUserId) return { error: "Cannot chat with yourself" };

    const chatId = generateChatId(myUid, otherUserId);
    const chatRef = db.collection("chats").doc(chatId);
    const doc = await chatRef.get();

    if (!doc.exists) {
      await chatRef.set({
        participants: [myUid, otherUserId],
        lastMessage: "",
        lastMessageAt: FieldValue.serverTimestamp(),
        unreadCount: { [myUid]: 0, [otherUserId]: 0 },
        lastReadMessageId: { [myUid]: null, [otherUserId]: null },
      });
    }

    return { chatId };
  } catch (error) {
    console.error("Error getting/creating chat:", error);
    return { error: "Failed to initialize chat" };
  }
}

export async function getMessages(chatId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    const myUid = session.user.id;

    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists || !chatDoc.data().participants.includes(myUid)) {
      return { error: "Chat not found or unauthorized" };
    }

    // Paginated: latest 50 messages, descending then reverse
    const snapshot = await chatRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        senderId: data.senderId,
        createdAt: data.createdAt?.toMillis() || Date.now(),
      });
    });

    return { messages: messages.reverse() };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { error: "Failed to fetch messages" };
  }
}

export async function saveMessage(chatId, text, receiverId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    const myUid = session.user.id;

    const chatRef = db.collection("chats").doc(chatId);
    const newMessageRef = chatRef.collection("messages").doc();
    const timestamp = FieldValue.serverTimestamp();

    // Batch write: atomic message + chat metadata update
    const batch = db.batch();

    batch.set(newMessageRef, {
      senderId: myUid,
      text,
      createdAt: timestamp,
    });

    batch.update(chatRef, {
      lastMessage: text,
      lastMessageAt: timestamp,
      [`unreadCount.${receiverId}`]: FieldValue.increment(1),
    });

    await batch.commit();

    return {
      success: true,
      messageId: newMessageRef.id,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error("Error saving message:", error);
    return { error: "Failed to send message" };
  }
}

// Cheap read receipt: update ONE field instead of N message docs
export async function markChatAsRead(chatId, lastMessageId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    const myUid = session.user.id;

    await db.collection("chats").doc(chatId).update({
      [`unreadCount.${myUid}`]: 0,
      [`lastReadMessageId.${myUid}`]: lastMessageId || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return { error: "Failed to mark as read" };
  }
}
