"use server";

import { db } from "../lib/firebase/firebase.admin";
import admin from "firebase-admin";
import { createNotification } from "./notifications";

export async function toggleFollow(followerId, followingId, isFollowing) {
  try {
    const relationshipId = `${followerId}_${followingId}`;
    const relationshipRef = db.collection("social_graph").doc(relationshipId);
    const followerUserRef = db.collection("users").doc(followerId);
    const followingUserRef = db.collection("users").doc(followingId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(relationshipRef);
      
      if (isFollowing && !doc.exists) {
        transaction.set(relationshipRef, {
          followerId,
          followingId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(followerUserRef, { followingCount: admin.firestore.FieldValue.increment(1) });
        transaction.update(followingUserRef, { followerCount: admin.firestore.FieldValue.increment(1) });
      } else if (!isFollowing && doc.exists) {
        transaction.delete(relationshipRef);
        transaction.update(followerUserRef, { followingCount: admin.firestore.FieldValue.increment(-1) });
        transaction.update(followingUserRef, { followerCount: admin.firestore.FieldValue.increment(-1) });
      }
    });
    
    // Trigger notification
    if (isFollowing) {
      await createNotification({
        type: "new_follow",
        actor_id: followerId,
        target_user_id: followingId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error toggling follow:", error);
    return { error: "Failed to toggle follow status." };
  }
}

import { cache } from "react";

export const checkIsFollowing = cache(async (followerId, followingId) => {
  if (!followerId || !followingId) return { isFollowing: false };
  try {
    const relationshipId = `${followerId}_${followingId}`;
    const doc = await db.collection("social_graph").doc(relationshipId).get();
    return { isFollowing: doc.exists };
  } catch (error) {
    console.error("Error checking follow status:", error);
    return { isFollowing: false };
  }
});

export const getFollowers = cache(async (uid) => {
  try {
    const snapshot = await db.collection("social_graph").where("followingId", "==", uid).get();
    
    const userIds = [];
    snapshot.forEach((doc) => userIds.push(doc.data().followerId));

    if (userIds.length === 0) return { users: [] };

    // Fetch user profiles
    const users = await Promise.all(
      userIds.map(async (id) => {
        const userDoc = await db.collection("users").doc(id).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          return {
            id,
            fullName: data.fullName || data.username,
            username: data.username,
            profilePic: data.profilePic || "",
          };
        }
        return null;
      })
    );

    return { users: users.filter(Boolean) };
  } catch (error) {
    console.error("Error getting followers:", error);
    return { error: "Failed to get followers." };
  }
});

export const getFollowing = cache(async (uid) => {
  try {
    const snapshot = await db.collection("social_graph").where("followerId", "==", uid).get();
    
    const userIds = [];
    snapshot.forEach((doc) => userIds.push(doc.data().followingId));

    if (userIds.length === 0) return { users: [] };

    const users = await Promise.all(
      userIds.map(async (id) => {
        const userDoc = await db.collection("users").doc(id).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          return {
            id,
            fullName: data.fullName || data.username,
            username: data.username,
            profilePic: data.profilePic || "",
          };
        }
        return null;
      })
    );

    return { users: users.filter(Boolean) };
  } catch (error) {
    console.error("Error getting following:", error);
    return { error: "Failed to get following." };
  }
});
