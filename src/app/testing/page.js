"use client";

import { useState } from "react";

export default function ImageUploader() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [fileSize, setFileSize] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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

          // Optional: Resize if dimensions are massive (e.g., 4K) to save memory
          const MAX_WIDTH = 1920;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Start with high quality and lower it if needed
          let quality = 0.9;
          const attemptCompression = (q) => {
            canvas.toBlob(
              (blob) => {
                if (blob.size / 1024 > targetSizeKB && q > 0.1) {
                  // If still over 500KB, try lower quality
                  attemptCompression(q - 0.1);
                } else {
                  // Create a new File object from the blob
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
      // If file is > 500KB, compress it
      if (file.size / 1024 > 500) {
        const compressed = await compressImage(file, 500);
        setImage(compressed);
        setFileSize(compressed.size);
        setPreview(URL.createObjectURL(compressed));
      } else {
        setImage(file);
        setFileSize(file.size);
        setPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async () => {
    if (!image) return;
    setUploading(true);
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setUrl(data.data.url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800">Upload & Compress</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      
      {preview && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-500 font-medium">Optimized Preview:</p>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
              {formatBytes(fileSize)}
            </span>
          </div>
          <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow-sm border border-gray-100" />
        </div>
      )}

      <button onClick={uploadImage} disabled={!image || uploading} className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${uploading || !image ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
        {uploading ? "Uploading..." : "Upload (Max 500KB)"}
      </button>

      {url && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-blue-600 break-all underline"><a href={url} target="_blank">{url}</a></p>
        </div>
      )}
    </div>
  );
}