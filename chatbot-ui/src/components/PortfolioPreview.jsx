import React, { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PortfolioPreview = () => {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpdated, setHasUpdated] = useState(false);

  // Load existing website preview
  useEffect(() => {
    setWebsiteUrl(`${BASE_URL}/webSite/index.html`);
  }, []);

  const handleUpdateWebsite = async () => {
    setLoading(true);
    setHasUpdated(false);

    try {
      const response = await fetch(`${BASE_URL}/promptBackground`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to update website");
      }

      // Wait to ensure files are saved before loading
      setTimeout(() => {
        const newUrl = `${BASE_URL}/webSite/index.html?${Date.now()}`;
        setWebsiteUrl(newUrl); // refresh iframe
        setHasUpdated(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error updating website:", error);
      setLoading(false);
    }
  };

  return (
    <div className="h-[530px]">
      <h2 className="text-xl font-bold mb-4">Website Preview</h2>

      <button
        className="bg-purple-200 px-4 py-2 rounded shadow mb-4"
        onClick={handleUpdateWebsite}
        disabled={loading}
      >
        {loading ? "Updating..." : "Update & Preview Website"}
      </button>

      {loading ? (
        <div className="text-center mt-4 text-gray-600 animate-pulse">
          Generating your website preview...
        </div>
      ) : (
        <iframe
          key={websiteUrl}
          src={websiteUrl}
          title="Website Preview"
          className="w-full h-[85vh] border rounded"
        />
      )}
    </div>
  );
};

export default PortfolioPreview;
