import React, { useState, useRef } from 'react';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ImageUpload({ onUploadComplete }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages(files);
      setPreviews(files.map(file => URL.createObjectURL(file)));
    }
  };

  const handleTextChange = (e) => {
    setUserText(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUpload();
    }
  };

  const handleUpload = async () => {
    if (!selectedImages || selectedImages.length === 0) {
      console.warn("No images selected for upload.");
      return;
    }

    const formData = new FormData();
    selectedImages.forEach((img) => formData.append("images", img));
    formData.append("text", userText);

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      console.log("Upload success:", data);

      if (onUploadComplete) onUploadComplete(data);

      // Reset form
      setSelectedImages([]);
      setPreviews([]);
      setUserText("");
    } catch (err) {
      console.error("Upload failed:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t border-gray-200">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <ImageIcon className="w-6 h-6 text-gray-600" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        className="hidden"
      />

      <textarea
        className="flex-1 resize-none border rounded p-2 text-sm"
        rows={1}
        placeholder="Type a message..."
        value={userText}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
      />

      {previews.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Preview ${i}`}
          className="w-10 h-10 object-cover rounded border"
        />
      ))}

      <button
        onClick={handleUpload}
        disabled={loading}
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default ImageUpload;
