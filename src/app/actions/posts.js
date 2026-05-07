"use server";

import { db } from "../lib/firebase/firebase.admin";

export async function getPosts() {
  try {
    const postsRef = db.collection("posts");
    const snapshot = await postsRef.orderBy("createdAt", "desc").get();
    
    const posts = [];
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to a serializable date string
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    return { posts };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { error: "Failed to fetch posts." };
  }
}
