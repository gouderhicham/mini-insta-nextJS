import { db } from "../lib/firebase.admin";

export default async function Home() {
  const snapshot = await db.collection("posts").get();
  const posts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  let parsedPosts = JSON.stringify(posts, null, 2);
  return (
    <div>
      <h1>Server Users page</h1>
      {posts.map((post) => (
        <h2 key={post.id}>{post.name || "No description"}</h2>
      ))}
    </div>
  );
}