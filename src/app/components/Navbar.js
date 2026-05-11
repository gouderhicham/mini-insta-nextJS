"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { searchUsers } from "../actions/users";
import { db } from "../lib/firebase/firebase-client";
import { doc, onSnapshot } from "firebase/firestore";
import styles from "./Navbar.module.css";

export default function Navbar({ session }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Listen to user document for real-time unread_notification_count changes
    const userRef = doc(db, "users", session.user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const newCount = docSnap.data().unread_notification_count || 0;
        
        setUnreadCount((prevCount) => {
          // If count increased, show a toast
          if (newCount > prevCount && prevCount !== undefined) {
            setToastMessage("You have a new notification");
            setTimeout(() => setToastMessage(null), 3000);
          }
          return newCount;
        });
      }
    });

    return () => unsubscribe();
  }, [session?.user?.id]);

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

  const renderSearchResults = () => {
    if (!showResults) return null;
    return (
      <div className={styles.searchResults}>
        {isSearching ? (
          <div className={styles.searchMessage}>Searching...</div>
        ) : searchResults.length > 0 ? (
          searchResults.map(u => (
            <Link 
              href={`/profile/${u.id}`} 
              key={u.id} 
              className={styles.searchResultItem}
              onClick={() => {
                setShowResults(false);
                setShowMobileSearch(false);
                setSearchQuery("");
              }}
            >
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
    );
  };

  if (!session?.user) return null;

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        <Image src="/Logo.svg" alt="miniNSTA Logo" width={32} height={32} className={styles.logoImage} />
        <span className={styles.logoText}>miniNSTA</span>
      </Link>
      
      <div className={styles.navLinks}>
        {/* Feed */}
        <Link href="/" className={styles.navItem}>
          <Image src="/Feed-icon.svg" alt="Feed" width={24} height={24} className={styles.icon} />
          <span className={styles.navText}>Feed</span>
        </Link>
        
        {/* Search */}
        <div className={styles.searchContainer}>
          {/* Desktop Search */}
          <div className={`${styles.searchItem} ${styles.desktopSearch}`}>
            <div className={styles.searchIconWrapper}>
              <Image src="/search-icon.svg" alt="Search" width={20} height={20} className={styles.icon} />
            </div>
            <input 
              type="text" 
              placeholder="Search users..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {/* Search Results Dropdown - Desktop */}
            {renderSearchResults()}
          </div>
          
          {/* Mobile Search Button */}
          <button 
            className={`${styles.navItem} ${styles.mobileSearchBtn}`}
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <Image src="/search-icon.svg" alt="Search" width={24} height={24} className={styles.icon} />
            <span className={styles.navText}>Search</span>
          </button>
        </div>

        {/* Notifications */}
        <Link href="/notifications" className={`${styles.navItem} ${styles.notificationBtn}`}>
          <div className={styles.iconWrapper}>
            <Image src="/notification-icon.svg" alt="Notifications" width={24} height={24} className={styles.icon} />
            {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
          </div>
          <span className={styles.navText}>Notifications</span>
        </Link>

        {/* Profile */}
        <Link href={`/profile/${session.user.id}`} className={styles.navItem}>
          <Image src="/my-profile-icon.svg" alt="Profile" width={24} height={24} className={styles.icon} />
          <span className={styles.navText}>Profile</span>
        </Link>
        
        {/* Log Out */}
        <button onClick={() => signOut()} className={styles.navItem}>
          <Image src="/log-out-icon.svg" alt="Log out" width={24} height={24} className={styles.icon} />
          <span className={styles.navText}>Log out</span>
        </button>
      </div>

      {/* Mobile Search Input Overlay */}
      {showMobileSearch && (
        <div className={styles.mobileSearchOverlay}>
           <input 
              type="text" 
              placeholder="Search users..." 
              className={styles.mobileSearchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              autoFocus
            />
            {/* Search Results Dropdown - Mobile */}
            {renderSearchResults()}
        </div>
      )}

      {/* Real-time Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <Image src="/notification-icon.svg" alt="Bell" width={16} height={16} />
          {toastMessage}
        </div>
      )}
    </nav>
  );
}
