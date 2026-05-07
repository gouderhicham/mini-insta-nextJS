"use server";

import { db } from "../lib/firebase/firebase.admin";

export async function getUserProfile(uid) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return { error: "User not found" };

    const data = userDoc.data();
    return {
      user: {
        id: userDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      }
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { error: "Failed to fetch user." };
  }
}

export async function updateUserProfile(uid, data) {
  try {
    const userRef = db.collection("users").doc(uid);
    // Filter only allowed fields to update
    const updateData = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.profilePic !== undefined) updateData.profilePic = data.profilePic;

    if (Object.keys(updateData).length > 0) {
      await userRef.update(updateData);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { error: "Failed to update user." };
  }
}
