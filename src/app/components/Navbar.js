"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import styles from "./Navbar.module.css";

export default function Navbar({ session }) {
  if (!session?.user) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          SocialApp
        </Link>
        <div className={styles.navLinks}>
          <Link href={`/profile/${session.user.id}`} className={styles.profileLink}>
            <div className={styles.avatar}>
              {session.user.image ? (
                <img src={session.user.image} alt="Profile" className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarInitial}>
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                </span>
              )}
            </div>
            <span className={styles.userName}>{session.user.name || "Profile"}</span>
          </Link>
          <button 
            onClick={() => signOut()} 
            className={styles.signOutButton}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
