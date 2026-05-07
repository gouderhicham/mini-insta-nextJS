import { db } from "../lib/firebase/firebase.admin";
export default async function Home() {
  const snapshot = await db.collection("posts").get();
  const posts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  let parsedPosts = JSON.stringify(posts, null, 2);
  console.log("Parsed posts:", parsedPosts);
  return (
    <div>
      <h1>Server Users page</h1>
      {posts.map((post) => (
        <h2 key={post.id}>{post.content || "No description"}</h2>
      ))}
    </div>
  );
}