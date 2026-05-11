"use server";

import { db } from "../lib/firebase/firebase.admin";
import admin from "firebase-admin";

export async function getPosts(currentUserId = null) {
  try {
    const postsRef = db.collection("posts");
    const snapshot = await postsRef.orderBy("createdAt", "desc").get();
    
    const posts = [];
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    // Populate with latest author data
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          let isLikedByMe = false;
          if (currentUserId) {
            const likeDoc = await db.collection("posts").doc(post.id).collection("likes").doc(currentUserId).get();
            isLikedByMe = likeDoc.exists;
          }

          if (post.authorId) {
            const userDoc = await db.collection("users").doc(post.authorId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              return {
                ...post,
                authorName: userData.fullName || userData.username || post.authorName,
                authorPic: userData.profilePic || post.authorPic,
                isLikedByMe,
              };
            }
          }
          return { ...post, isLikedByMe };
        } catch (e) {
          console.error("Error fetching user for post:", e);
        }
        return post;
      })
    );

    return { posts: populatedPosts };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { error: "Failed to fetch posts." };
  }
}

export async function getUserPosts(authorId, currentUserId = null) {
  try {
    const postsRef = db.collection("posts");
    // Note: This requires a composite index on authorId and createdAt if ordering, 
    // or we can fetch and sort in memory if no index. 
    // Let's fetch where authorId and sort manually to avoid requiring an index immediately if possible,
    // though Firestore might complain. Let's assume an index is needed or we just sort in JS to be safe.
    const snapshot = await postsRef.where("authorId", "==", authorId).get();
    
    const posts = [];
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Populate with latest author data
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          let isLikedByMe = false;
          if (currentUserId) {
            const likeDoc = await db.collection("posts").doc(post.id).collection("likes").doc(currentUserId).get();
            isLikedByMe = likeDoc.exists;
          }

          if (post.authorId) {
            const userDoc = await db.collection("users").doc(post.authorId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              return {
                ...post,
                authorName: userData.fullName || userData.username || post.authorName,
                authorPic: userData.profilePic || post.authorPic,
                isLikedByMe,
              };
            }
          }
          return { ...post, isLikedByMe };
        } catch (e) {
          console.error("Error fetching user for post:", e);
        }
        return post;
      })
    );

    return { posts: populatedPosts };
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return { error: "Failed to fetch user posts." };
  }
}

export async function createPost(authorId, data) {
  try {
    const { content, imageUrl } = data;
    
    // Fetch user details for denormalization
    const userDoc = await db.collection("users").doc(authorId).get();
    if (!userDoc.exists) {
      return { error: "User not found." };
    }
    
    const userData = userDoc.data();
    
    const postData = {
      authorId,
      authorName: userData.fullName || userData.username || "Unknown",
      authorPic: userData.profilePic || "",
      content: content || "",
      imageUrl: imageUrl || null,
      likeCount: 0,
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const newPostRef = await db.collection("posts").add(postData);
    
    return { success: true, postId: newPostRef.id };
  } catch (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post." };
  }
}

export async function updatePost(postId, authorId, newContent, newImageUrl) {
  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return { error: "Post not found." };
    if (postDoc.data().authorId !== authorId) return { error: "Unauthorized." };

    const updateData = {};
    if (newContent !== undefined) updateData.content = newContent;
    if (newImageUrl !== undefined) updateData.imageUrl = newImageUrl;

    await postRef.update(updateData);
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    return { error: "Failed to update post." };
  }
}

export async function deletePost(postId, authorId) {
  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return { error: "Post not found." };
    if (postDoc.data().authorId !== authorId) return { error: "Unauthorized." };

    await postRef.delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { error: "Failed to delete post." };
  }
}

export async function getPost(postId, currentUserId = null) {
  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return { error: "Post not found." };

    const postData = postDoc.data();
    let isLikedByMe = false;

    if (currentUserId) {
      const likeDoc = await db.collection("posts").doc(postId).collection("likes").doc(currentUserId).get();
      isLikedByMe = likeDoc.exists;
    }

    // Populate with latest author data
    let authorName = postData.authorName;
    let authorPic = postData.authorPic;

    if (postData.authorId) {
      const userDoc = await db.collection("users").doc(postData.authorId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        authorName = userData.fullName || userData.username || authorName;
        authorPic = userData.profilePic || authorPic;
      }
    }

    const post = {
      id: postDoc.id,
      ...postData,
      authorName,
      authorPic,
      isLikedByMe,
      createdAt: postData.createdAt?.toDate().toISOString() || new Date().toISOString(),
    };

    return { post };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { error: "Failed to fetch post." };
  }
}