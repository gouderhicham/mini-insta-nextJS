"use client";

import { useState, useRef, useEffect } from "react";
import {
  setPostLikeStatus,
  addComment,
  getComments,
  setCommentLikeStatus,
} from "../actions/interactions";
import { updatePost, deletePost } from "../actions/posts";
import styles from "./PostItem.module.css";
import Link from "next/link";
import Image from "next/image";
import { formatTimeAgo } from "../lib/formatDate";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function PostItem({ post, currentUser }) {
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [newCommentText, setNewCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isDeleted, setIsDeleted] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content || "");
  const [showOptions, setShowOptions] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Debounce ref for post like
  const likeTimeoutRef = useRef(null);
  const commentLikeTimeoutsRef = useRef({});
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const postRef = useRef(null);
  const commentsSectionRef = useRef(null);
  useEffect(() => {
    const urlPostId = searchParams.get("postId");
    const urlCommentId = searchParams.get("commentId");

    if (urlPostId === post.id && urlCommentId) {
      // ONLY auto-expand if comments are not already shown
      // and we haven't manually closed them in this session (handled by local state)
      setShowComments(true);
      
      // Load comments if needed
      if (comments.length === 0) {
        fetchComments();
      }
    }
  }, [searchParams, post.id]);

  const fetchComments = async () => {
    setIsLoadingComments(true);
    const res = await getComments(post.id, currentUser.id);
    if (res.comments) {
      setComments(res.comments);
    }
    setIsLoadingComments(false);
  };

  useEffect(() => {
    const urlPostId = searchParams.get("postId");
    const urlCommentId = searchParams.get("commentId");
    const isSinglePostPage = pathname.startsWith("/post/");

    if (urlPostId === post.id && showComments) {
      if (urlCommentId === "all") {
        // Scroll to comments section
        commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (urlCommentId && urlCommentId !== "all" && comments.length > 0) {
        // Scroll to specific comment
        const commentElement = document.getElementById(`comment-${urlCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Apply highlight ONLY on the single post page
          if (isSinglePostPage) {
            commentElement.style.backgroundColor = "rgba(243, 246, 255, 0.1)";
            setTimeout(() => {
              commentElement.style.backgroundColor = "";
            }, 6000);
          }
        }
      }
    }
  }, [comments, showComments, searchParams, post.id, pathname]);

  const handleToggleLike = () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    if (likeTimeoutRef.current) clearTimeout(likeTimeoutRef.current);

    likeTimeoutRef.current = setTimeout(async () => {
      await setPostLikeStatus(post.id, currentUser.id, newIsLiked);
    }, 10000); // 10 seconds debounce
  };

  const toggleComments = async (forcedState) => {
    // Check if forcedState is a boolean. If it's an event object (from onClick), ignore it.
    const isForced = typeof forcedState === "boolean";
    const newShowComments = isForced ? forcedState : !showComments;
    setShowComments(newShowComments);

    const isSinglePostPage = pathname.startsWith("/post/");

    if (isSinglePostPage) {
      const params = new URLSearchParams(searchParams.toString());
      if (newShowComments) {
        params.set("postId", post.id);
        if (!params.has("commentId")) {
          params.set("commentId", "all");
        }
      } else {
        // If closing, we keep the postId but remove the commentId to stop the auto-expand loop
        params.delete("commentId");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    if (newShowComments && comments.length === 0) {
      fetchComments();
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    const text = newCommentText.trim();
    setNewCommentText("");

    // Optimistic UI for comment count
    setCommentCount((prev) => prev + 1);

    const res = await addComment(post.id, currentUser.id, text);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment]);
    } else {
      setCommentCount((prev) => prev - 1);
      alert("Failed to add comment.");
    }
  };

  const handleCommentLike = (commentId, currentIsLiked) => {
    const newIsLiked = !currentIsLiked;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            isLikedByMe: newIsLiked,
            likeCount: newIsLiked ? c.likeCount + 1 : c.likeCount - 1,
          };
        }
        return c;
      }),
    );

    if (commentLikeTimeoutsRef.current[commentId]) {
      clearTimeout(commentLikeTimeoutsRef.current[commentId]);
    }

    commentLikeTimeoutsRef.current[commentId] = setTimeout(async () => {
      await setCommentLikeStatus(
        post.id,
        commentId,
        currentUser.id,
        newIsLiked,
      );
    }, 10000); // 10 seconds debounce for comments too
  };

  const handleDeletePost = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      const res = await deletePost(post.id, currentUser.id);
      if (res.success) {
        setIsDeleted(true);
      } else {
        alert(res.error || "Failed to delete post.");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) return;
    setIsSavingEdit(true);
    const res = await updatePost(post.id, currentUser.id, editedContent.trim());
    if (res.success) {
      post.content = editedContent.trim();
      setIsEditingPost(false);
    } else {
      alert(res.error || "Failed to update post.");
    }
    setIsSavingEdit(false);
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      alert("Post link copied to clipboard!");
    }).catch(err => {
      console.error("Could not copy text: ", err);
    });
  };

  if (isDeleted) return null;

  return (
    <div className={styles.postCard} ref={postRef} id={`post-${post.id}`}>
      <div className={styles.postHeaderContainer}>
        <div className={styles.postHeader}>
          <Link
            href={`/profile/${post.authorId}`}
            className={styles.authorLink}
          >
            <div className={styles.postAuthorPic}>
              {post.authorPic ? (
                <img src={post.authorPic} alt={post.authorName} />
              ) : (
                <span>
                  {post.authorName
                    ? post.authorName.charAt(0).toUpperCase()
                    : "U"}
                </span>
              )}
            </div>
            <div>
              <h3 className={styles.postAuthorName}>
                {post.authorName || "Unknown User"}
              </h3>
              <p className={styles.postDate}>{formatTimeAgo(post.createdAt)}</p>
            </div>
          </Link>
        </div>

        {currentUser?.id === post.authorId && (
          <div className={styles.optionsMenuContainer}>
            <button
              className={styles.optionsButton}
              onClick={() => setShowOptions(!showOptions)}
            >
              ⋮
            </button>
            {showOptions && (
              <div className={styles.optionsDropdown}>
                <button
                  onClick={() => {
                    setIsEditingPost(true);
                    setShowOptions(false);
                  }}
                >
                  Edit Post
                </button>
                <button
                  onClick={handleDeletePost}
                  className={styles.deleteOption}
                >
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditingPost ? (
        <div className={styles.editPostContainer}>
          <textarea
            className={styles.editPostTextarea}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <div className={styles.editPostActions}>
            <button
              className={`${styles.editPostBtn} ${styles.editPostBtnSecondary}`}
              onClick={() => {
                setIsEditingPost(false);
                setEditedContent(post.content);
              }}
            >
              Cancel
            </button>
            <button
              className={`${styles.editPostBtn} ${styles.editPostBtnPrimary}`}
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editedContent.trim()}
            >
              {isSavingEdit ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.postContent}>{post.content}</p>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post image"
          className={styles.postImage}
        />
      )}
      <div className={styles.postActions}>
        <button className={styles.actionBtn} onClick={handleToggleLike}>
          <Image
            src={isLiked ? "/heart-liked.svg" : "/heart-not-liked.svg"}
            alt="Like"
            width={24}
            height={24}
            className={styles.actionIcon}
          />
          <span>{likeCount}</span>
        </button>
        <button className={styles.actionBtn} onClick={toggleComments}>
          <Image
            src="/comment-icon.svg"
            alt="Comment"
            width={24}
            height={24}
            className={styles.actionIcon}
          />
          <span>{commentCount}</span>
        </button>
        <button className={`${styles.actionBtn} ${styles.shareBtn}`} onClick={handleShare}>
          <Image
            src="/share-icon.svg"
            alt="Share"
            width={24}
            height={24}
            className={styles.actionIcon}
          />
        </button>
      </div>

      {showComments && (
        <div className={styles.commentsSection} ref={commentsSectionRef}>
          {isLoadingComments ? (
            <p className={styles.loadingText}>Loading comments...</p>
          ) : (
            <div className={styles.commentsList}>
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={styles.commentItem}
                  id={`comment-${comment.id}`}
                >
                  <Link
                    href={`/profile/${comment.authorId}`}
                    className={styles.commentAvatar}
                  >
                    {comment.authorPic ? (
                      <img src={comment.authorPic} alt={comment.authorName} />
                    ) : (
                      <span>
                        {comment.authorName?.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </Link>
                  <div className={styles.commentBody}>
                    <div className={styles.commentBubble}>
                      <Link
                        href={`/profile/${comment.authorId}`}
                        className={styles.commentAuthor}
                      >
                        {comment.authorName}
                      </Link>
                      <div className={styles.commentText}>{comment.text}</div>
                    </div>
                    <div className={styles.commentMeta}>
                      <span>{formatTimeAgo(comment.createdAt)}</span>
                      <button
                        onClick={() =>
                          handleCommentLike(comment.id, comment.isLikedByMe)
                        }
                        className={`${styles.commentLikeBtn} ${comment.isLikedByMe ? styles.liked : ""}`}
                      >
                        Like {comment.likeCount > 0 && `(${comment.likeCount})`}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.addCommentRow}>
            <div className={styles.commentAvatar}>
              {currentUser?.image ? (
                <img src={currentUser.image} alt="You" />
              ) : (
                <span>{currentUser?.name?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>
            <div className={styles.commentInputWrapper}>
              <input
                type="text"
                className={styles.commentInput}
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
              />
              <button
                className={styles.commentSubmitBtn}
                onClick={handleAddComment}
                disabled={!newCommentText.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
