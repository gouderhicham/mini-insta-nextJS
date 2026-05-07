"use server";

import { db } from "../lib/firebase/firebase.admin";
import admin from "firebase-admin";

export async function setPostLikeStatus(postId, uid, isLiked) {
  try {
    const likeRef = db.collection("posts").doc(postId).collection("likes").doc(uid);
    const postRef = db.collection("posts").doc(postId);

    await db.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      if (isLiked && !likeDoc.exists) {
        transaction.set(likeRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.update(postRef, { likeCount: admin.firestore.FieldValue.increment(1) });
      } else if (!isLiked && likeDoc.exists) {
        transaction.delete(likeRef);
        transaction.update(postRef, { likeCount: admin.firestore.FieldValue.increment(-1) });
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating post like status:", error);
    return { error: "Failed to update like status." };
  }
}

export async function addComment(postId, uid, text) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    const commentData = {
      authorId: uid,
      authorName: userData?.fullName || userData?.username || "Unknown",
      authorPic: userData?.profilePic || "",
      text,
      likeCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const postRef = db.collection("posts").doc(postId);
    const commentRef = postRef.collection("comments").doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(commentRef, commentData);
      transaction.update(postRef, { commentCount: admin.firestore.FieldValue.increment(1) });
    });

    // Return the inserted comment for optimistic UI
    return { 
      success: true, 
      comment: {
        id: commentRef.id,
        ...commentData,
        createdAt: new Date().toISOString(), // Mock immediate timestamp
        isLikedByMe: false
      }
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment." };
  }
}

export async function getComments(postId, currentUserId = null) {
  try {
    const commentsSnapshot = await db.collection("posts").doc(postId).collection("comments").orderBy("createdAt", "asc").get();
    
    const comments = await Promise.all(
      commentsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let isLikedByMe = false;
        
        if (currentUserId) {
          const likeDoc = await db.collection("posts").doc(postId).collection("comments").doc(doc.id).collection("likes").doc(currentUserId).get();
          isLikedByMe = likeDoc.exists;
        }
        
        // Populate authorPic dynamically
        let authorPic = data.authorPic;
        let authorName = data.authorName;
        try {
          if (data.authorId) {
            const userDoc = await db.collection("users").doc(data.authorId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              authorPic = userData.profilePic || authorPic;
              authorName = userData.fullName || userData.username || authorName;
            }
          }
        } catch (e) {
          console.error("Error fetching comment author:", e);
        }

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          isLikedByMe,
          authorPic,
          authorName,
        };
      })
    );

    return { comments };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return { error: "Failed to fetch comments." };
  }
}

export async function setCommentLikeStatus(postId, commentId, uid, isLiked) {
  try {
    const likeRef = db.collection("posts").doc(postId).collection("comments").doc(commentId).collection("likes").doc(uid);
    const commentRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);

    await db.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      if (isLiked && !likeDoc.exists) {
        transaction.set(likeRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.update(commentRef, { likeCount: admin.firestore.FieldValue.increment(1) });
      } else if (!isLiked && likeDoc.exists) {
        transaction.delete(likeRef);
        transaction.update(commentRef, { likeCount: admin.firestore.FieldValue.increment(-1) });
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating comment like status:", error);
    return { error: "Failed to update comment like status." };
  }
}
