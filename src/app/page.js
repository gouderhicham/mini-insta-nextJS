import { redirect } from "next/navigation";
import { auth } from "../auth";
import { getPosts } from "./actions/posts";
import styles from "./page.module.css";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  // Protect the route: must be logged in
  if (!session) {
    redirect("/login");
  }

  // Fetch posts server-side
  const { posts, error } = await getPosts();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Your Feed</h1>
        
        {error ? (
          <p className={styles.error}>{error}</p>
        ) : posts && posts.length > 0 ? (
          <div className={styles.postsList}>
            {posts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.postAuthorPic}>
                    {post.authorPic ? (
                      <img src={post.authorPic} alt={post.authorName} />
                    ) : (
                      <span>{post.authorName ? post.authorName.charAt(0).toUpperCase() : "U"}</span>
                    )}
                  </div>
                  <div>
                    <h3 className={styles.postAuthor}>{post.authorName || "Unknown User"}</h3>
                    <p className={styles.postDate}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className={styles.postContent}>{post.content || post.name}</p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="Post image" className={styles.postImage} />
                )}
                <div className={styles.postActions}>
                  <button className={styles.actionButton}>
                    ❤️ {post.likeCount || 0}
                  </button>
                  <button className={styles.actionButton}>
                    💬 {post.commentCount || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No posts yet. Be the first to post!</p>
        )}
      </main>
    </div>
  );
}
