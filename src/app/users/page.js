"use client";
import Link from "next/link";
import styles from "../page.module.css";
import { useEffect, useState } from "react";
export default function Home() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState();
  useEffect(() => {
    const savedUsers = localStorage.getItem("myUsers");
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  }, []);
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("myUsers", JSON.stringify(users));
    }
  }, [users]);
  return (
    <div className={styles.page}>
      <main>
        <h1>users</h1>
        <Link href="/">Go back to home</Link>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <input value={age} onChange={(e) => setAge(e.target.value)} />
        <button
          onClick={() =>
            setUsers((prev) => [...prev, { name, age, id: Date.now() }])
          }
        >
          Add user
        </button>
        <ul>
          {users.map((user) => (
            <div>
              <li key={user.id}>
                {user.name} - {user.age}
              </li>
              <button
                onClick={() =>
                  setUsers((prev) => prev.filter((u) => u.id !== user.id))
                }
              >
                Delete
              </button>
            </div>
          ))}
        </ul>
      </main>
    </div>
  );
}
