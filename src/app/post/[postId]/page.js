import { auth } from "../../../auth";
import { getPost } from "../../actions/posts";
import PostItem from "../../components/PostItem";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./post.module.css";

export default async function SinglePostPage({ params }) {
  const { postId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { post, error } = await getPost(postId, session.user.id);

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <h1>Post not found</h1>
        <p>The post you are looking for does not exist or has been deleted.</p>
        <Link href="/" className={styles.backBtn}>Go Back Home</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
         <h1 className={styles.title}>Post</h1>
      </div>
      <PostItem post={post} currentUser={session.user} />
    </div>
  );
}
