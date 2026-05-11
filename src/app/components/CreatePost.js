"use client";

import { useState, useRef } from "react";
import { createPost } from "../actions/posts";
import { useRouter } from "next/navigation";
import styles from "./CreatePost.module.css";

export default function CreatePost({ user }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  const handleInput = (e) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

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
              q
            );
          };
          attemptCompression(quality);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      let imageToSet = file;
      if (file.size / 1024 > 500) {
        imageToSet = await compressImage(file, 500);
      }
      setImage(imageToSet);
      setPreviewUrl(URL.createObjectURL(imageToSet));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImageToImgbb = async (imageFile) => {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        return data.data.url;
      }
      return null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !image) return;
    
    setIsPosting(true);
    let finalImageUrl = null;

    if (image) {
      setIsUploading(true);
      finalImageUrl = await uploadImageToImgbb(image);
      setIsUploading(false);
    }

    const res = await createPost(user.id, {
      content: content.trim(),
      imageUrl: finalImageUrl,
    });

    setIsPosting(false);

    if (res.success) {
      // Reset state
      setContent("");
      setImage(null);
      setPreviewUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Refresh router to fetch new posts
      router.refresh();
    } else {
      alert("Failed to create post");
    }
  };

  if (!user) return null;

  return (
    <div className={styles.createPostContainer}>
      <div className={styles.topSection}>
        <div className={styles.avatar}>
          {user.image ? (
            <img src={user.image} alt="Avatar" />
          ) : (
            <span className={styles.avatarFallback}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </span>
          )}
        </div>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            placeholder={`What's on your mind, ${user.name ? user.name.split(' ')[0] : 'User'}?`}
            value={content}
            onChange={handleInput}
            disabled={isPosting || isUploading}
          />
        </div>
      </div>

      {previewUrl && (
        <div className={styles.imagePreview}>
          <img src={previewUrl} alt="Upload preview" />
          <button 
            className={styles.removeImageBtn} 
            onClick={removeImage}
            disabled={isPosting || isUploading}
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.divider}></div>

      <div className={styles.bottomSection}>
        <div className={styles.actionButtons}>
          <label className={styles.uploadBtnLabel} disabled={isPosting || isUploading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Photo
            <input 
              type="file" 
              accept="image/*" 
              className={styles.fileInput} 
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={isPosting || isUploading}
            />
          </label>
        </div>
        <button 
          className={styles.postBtn}
          onClick={handlePost}
          disabled={(!content.trim() && !image) || isPosting || isUploading}
        >
          {isUploading ? "Uploading Image..." : isPosting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
