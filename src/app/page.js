"use client";
import Link from "next/link";
import styles from "./page.module.css";
import { db } from "./lib/firebase-client";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "posts"));        
        const postsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);
  useEffect(() => {
  console.log("Posts updated:", posts);
}, [posts]);

  if (loading) return <p>Loading posts...</p>;

  return (
    <div className={styles.page}>
      <main>
        <h1>Home page</h1>
        <Link href="/users">go to users</Link>
        <Link href="/server-users">go to server users</Link>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>{post.name || "No description"}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}