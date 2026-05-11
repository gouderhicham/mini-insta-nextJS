import { redirect } from "next/navigation";
import { auth } from "../auth";
import { getPosts } from "./actions/posts";
import { getUserProfile } from "./actions/users";
import styles from "./page.module.css";
import Link from "next/link";
import CreatePost from "./components/CreatePost";
import PostItem from "./components/PostItem";

export const metadata = {
  title: "Feed",
  description: "Your personalized Mini Insta feed. Discover new posts and connect with friends.",
};

export default async function Home() {
  const session = await auth();

  // Protect the route: must be logged in
  if (!session) {
    redirect("/login");
  }

  let latestUser = session.user;
  const { user } = await getUserProfile(session.user.id);
  if (user) {
    latestUser = {
      ...session.user,
      name: user.fullName || user.username || session.user.name,
      image: user.profilePic || session.user.image,
    };
  }

  // Fetch posts server-side, passing current user ID to determine initial like status
  const { posts, error } = await getPosts(latestUser?.id);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Feed</h1>
        
        <CreatePost user={latestUser} />

        {error ? (
          <p className={styles.error}>{error}</p>
        ) : posts && posts.length > 0 ? (
          <div className={styles.postsList}>
            {posts.map((post) => (
              <PostItem key={post.id} post={post} currentUser={latestUser} />
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No posts yet. Be the first to post!</p>
        )}
      </main>
    </div>
  );
}
