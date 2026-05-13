"use client";

import { useState } from "react";
import { updateUserProfile } from "../actions/users";
import { toggleFollow, getFollowers, getFollowing } from "../actions/social";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./UserProfile.module.css";
import CreatePost from "./CreatePost";
import PostItem from "./PostItem";
import { formatTimeAgo } from "../lib/formatDate";

export default function UserProfileClient({
  userProfile,
  userPosts,
  isOwner,
  currentUser,
  initialIsFollowing,
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile.fullName || "");
  const [bio, setBio] = useState(userProfile.bio || "");
  const [profilePic, setProfilePic] = useState(userProfile.profilePic || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Social State
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing || false);
  const [followerCount, setFollowerCount] = useState(
    userProfile.followerCount || 0,
  );
  const [followingCount, setFollowingCount] = useState(
    userProfile.followingCount || 0,
  );

  // Modals
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [modalUsers, setModalUsers] = useState([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  // --- Compression Logic ---
  const compressImage = (file, targetSizeKB = 500) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          const MAX_WIDTH = 1920;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          const attemptCompression = (q) => {
            canvas.toBlob(
              (blob) => {
                if (blob.size / 1024 > targetSizeKB && q > 0.1) {
                  attemptCompression(q - 0.1);
                } else {
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                }
              },
              "image/jpeg",
              q,
            );
          };
          attemptCompression(quality);
        };
      };
    });
  };

  const uploadImage = async (imageFile) => {
    setUploading(true);
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();
      if (data.success) {
        setProfilePic(data.data.url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      let imageToUpload = file;
      if (file.size / 1024 > 500) {
        imageToUpload = await compressImage(file, 500);
      }
      await uploadImage(imageToUpload);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile(userProfile.id, {
      fullName,
      bio,
      profilePic,
    });
    setSaving(false);
    setIsEditing(false);
    router.refresh();
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);
    setFollowerCount((prev) => (newIsFollowing ? prev + 1 : prev - 1));

    const res = await toggleFollow(
      currentUser.id,
      userProfile.id,
      newIsFollowing,
    );
    if (res.error) {
      // Revert optimistic update
      setIsFollowing(!newIsFollowing);
      setFollowerCount((prev) => (!newIsFollowing ? prev + 1 : prev - 1));
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const openFollowersModal = async () => {
    setShowFollowers(true);
    setIsLoadingModal(true);
    const res = await getFollowers(userProfile.id);
    if (res.users) {
      setModalUsers(res.users);
    }
    setIsLoadingModal(false);
  };

  const openFollowingModal = async () => {
    setShowFollowing(true);
    setIsLoadingModal(true);
    const res = await getFollowing(userProfile.id);
    if (res.users) {
      setModalUsers(res.users);
    }
    setIsLoadingModal(false);
  };

  const closeModal = () => {
    setShowFollowers(false);
    setShowFollowing(false);
    setModalUsers([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.coverPhoto}></div>
        <div className={styles.profileSection}>
          <div className={styles.headerRow}>
            <div className={styles.avatarWrapper}>
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarInitial}>
                  {userProfile.username
                    ? userProfile.username.charAt(0).toUpperCase()
                    : "U"}
                </div>
              )}
              {isEditing && (
                <label className={styles.avatarOverlay}>
                  {uploading ? "Uploading..." : "Change"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div className={styles.actionButtons}>
              {isOwner && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Edit Profile
                </button>
              )}
              {isOwner && isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
              {!isOwner && currentUser && (
                <>
                  <button
                    onClick={handleToggleFollow}
                    className={`${styles.button} ${isFollowing ? styles.buttonSecondary : styles.buttonPrimary}`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button className={`${styles.button} ${styles.buttonSecondary}`}>
                    <Link
                      href={`/messages?userId=${userProfile.id}`}
                    >
                      Message
                    </Link>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.infoSection}>
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.input}
                    placeholder="Your name"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={styles.textarea}
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className={styles.name}>
                  {userProfile.fullName || userProfile.username}
                </h1>
                <p className={styles.username}>@{userProfile.username}</p>

                <div className={styles.statsRow}>
                  <div className={styles.statItem} onClick={openFollowersModal}>
                    <span className={styles.statValue}>{followerCount}</span>
                    <span className={styles.statLabel}>Followers</span>
                  </div>
                  <div className={styles.statItem} onClick={openFollowingModal}>
                    <span className={styles.statValue}>{followingCount}</span>
                    <span className={styles.statLabel}>Following</span>
                  </div>
                </div>
                {userProfile.bio && (
                  <p className={styles.bio}>{userProfile.bio}</p>
                )}
                <div className={styles.joinDate}>
                  Joined {formatTimeAgo(userProfile.createdAt)}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.postsSection}>
          <h2 className={styles.sectionTitle}>
            Posts by {userProfile.fullName || userProfile.username}
          </h2>

          {isOwner && currentUser && <CreatePost user={currentUser} />}

          {userPosts && userPosts.length > 0 ? (
            <div className={styles.postsList}>
              {userPosts.map((post) => (
                <PostItem key={post.id} post={post} currentUser={currentUser} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>This user hasn't posted anything yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Social Modal */}
      {(showFollowers || showFollowing) && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {showFollowers ? "Followers" : "Following"}
              </h3>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {isLoadingModal ? (
                <div className={styles.loadingModal}>Loading...</div>
              ) : modalUsers.length > 0 ? (
                modalUsers.map((u) => (
                  <Link
                    href={`/profile/${u.id}`}
                    key={u.id}
                    onClick={closeModal}
                  >
                    <div className={styles.userRow}>
                      <div className={styles.userRowAvatar}>
                        {u.profilePic ? (
                          <img src={u.profilePic} alt={u.fullName} />
                        ) : (
                          <span>{u.username?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={styles.userRowInfo}>
                        <div className={styles.userRowName}>{u.fullName}</div>
                        <div className={styles.userRowUsername}>
                          @{u.username}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className={styles.loadingModal}>No users found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
