"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { searchUsers } from "../actions/users";
import styles from "./Navbar.module.css";

export default function Navbar({ session }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchUsers(searchQuery);
      if (res.users) {
        setSearchResults(res.users);
        setShowResults(true);
      }
      setIsSearching(false);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  if (!session?.user) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Image src="/Logo.svg" alt="miniNSTA Logo" width={32} height={32} className={styles.logoImage} />
          <span className={styles.logoText}>miniNSTA</span>
        </Link>
        <div className={styles.searchContainer}>
          <input 
            type="text" 
            placeholder="Search users..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {showResults && (
            <div className={styles.searchResults}>
              {isSearching ? (
                <div className={styles.searchMessage}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(u => (
                  <Link href={`/profile/${u.id}`} key={u.id} className={styles.searchResultItem}>
                     <div className={styles.searchResultAvatar}>
                        {u.profilePic ? (
                          <img src={u.profilePic} alt={u.fullName} />
                        ) : (
                          <span>{u.username?.charAt(0).toUpperCase()}</span>
                        )}
                     </div>
                     <div>
                        <div className={styles.searchResultName}>{u.fullName || u.username}</div>
                        <div className={styles.searchResultUsername}>@{u.username}</div>
                     </div>
                  </Link>
                ))
              ) : (
                <div className={styles.searchMessage}>No users found.</div>
              )}
            </div>
          )}
        </div>
        <div className={styles.navLinks}>
          <button 
            onClick={() => signOut()} 
            className={styles.signOutButton}
          >
            Sign Out
          </button>
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
          
        </div>
      </div>
    </nav>
  );
}
