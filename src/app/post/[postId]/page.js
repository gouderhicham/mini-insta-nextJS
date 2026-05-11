import { auth } from "../../../auth";
import { getPost } from "../../actions/posts";
import PostItem from "../../components/PostItem";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./post.module.css";

export async function generateMetadata({ params }) {
  const { postId } = await params;
  const { post } = await getPost(postId, null);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const contentSnippet = post.content ? (post.content.substring(0, 60) + (post.content.length > 60 ? "..." : "")) : "View this post";
  const authorName = post.user?.username || post.user?.fullName || "A user";
  
  return {
    title: `${authorName} on Mini Insta: "${contentSnippet}"`,
    description: `Check out what ${authorName} posted on Mini Insta.`,
  };
}

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
