"use server";

import { db } from "../lib/firebase/firebase.admin";
import admin from "firebase-admin";

export async function registerUser(data) {
  const { email, password, username, fullName } = data;

  try {
    // 1. Check if username is already taken
    const usernameDoc = await db.collection("usernames").doc(username).get();
    if (usernameDoc.exists) {
      return { error: "Username is already taken." };
    }

    // 2. Check if email is already used in Firebase Auth
    try {
      await admin.auth().getUserByEmail(email);
      return { error: "Email is already in use." };
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      // User doesn't exist, we can proceed
    }

    // 3. Create User in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // 4. Batch write to Firestore (ensure atomicity)
    const batch = db.batch();

    const userRef = db.collection("users").doc(userRecord.uid);
    batch.set(userRef, {
      username,
      fullName,
      email,
      profilePic: "",
      bio: "",
      followerCount: 0,
      followingCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const usernameRef = db.collection("usernames").doc(username);
    batch.set(usernameRef, {
      uid: userRecord.uid,
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: error.message || "An error occurred during registration." };
  }
}

export async function syncGoogleUser(idToken) {
  try {
    // 1. Verify the ID token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || "User";
    const picture = decodedToken.picture || "";

    // 2. Check if user already exists in Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      // 3. User doesn't exist, we need to create them.
      // Auto-generate a unique username based on email
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let isUnique = false;
      let counter = 1;

      while (!isUnique) {
        const check = await db.collection("usernames").doc(username).get();
        if (!check.exists) {
          isUnique = true;
        } else {
          username = `${baseUsername}${counter}`;
          counter++;
        }
      }

      // 4. Batch write to Firestore
      const batch = db.batch();

      const userRef = db.collection("users").doc(uid);
      batch.set(userRef, {
        username,
        fullName: name,
        email,
        profilePic: picture,
        bio: "",
        followerCount: 0,
        followingCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const usernameRef = db.collection("usernames").doc(username);
      batch.set(usernameRef, {
        uid: uid,
      });

      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    console.error("Google Sync Error:", error);
    return { error: "Failed to sync Google user." };
  }
}

