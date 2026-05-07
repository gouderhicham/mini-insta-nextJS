"use client";

import { useState } from "react";

export default function ImageUploader() {
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async () => {
    if (!image) return;

    setUploading(true);
    const apiKey = "fd01840e3c9f6a1083d8081293cfd399";
    
    // We use FormData for a POST request as recommended
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        setUrl(data.data.url);
        alert("Upload successful!");
      } else {
        console.error("Upload failed:", data);
        alert("Upload failed. Check console for details.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800">Upload Image</h2>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {preview && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Preview:</p>
          <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow-sm" />
        </div>
      )}

      <button
        onClick={uploadImage}
        disabled={!image || uploading}
        className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
          uploading || !image ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {uploading ? "Uploading..." : "Upload to Imgbb"}
      </button>

      {url && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">Image Link:</p>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 break-all underline">
            {url}
          </a>
        </div>
      )}
    </div>
  );
}