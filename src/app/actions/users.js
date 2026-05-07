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

export async function searchUsers(query) {
  try {
    if (!query) return { users: [] };
    
    const snapshot = await db.collection("users").limit(100).get();
    const allUsers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });
    
    const lowerQuery = query.toLowerCase();
    const filteredUsers = allUsers.filter(u => 
      (u.fullName && u.fullName.toLowerCase().includes(lowerQuery)) ||
      (u.username && u.username.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
    
    return { users: filteredUsers };
  } catch (error) {
    console.error("Error searching users:", error);
    return { error: "Failed to search users." };
  }
}
