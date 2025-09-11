// src/pages/AIStudioPage.jsx
import React from "react";

const AIStudioPage = () => {
  const token = localStorage.getItem("token");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F0F] text-white">
      <h1 className="text-3xl font-bold mb-4">🎬 Shinel Studios AI Studio</h1>
      <p className="mb-2">You’re logged in with token:</p>
      <code className="bg-gray-800 p-2 rounded text-sm break-all max-w-lg">
        {token}
      </code>
    </div>
  );
};

export default AIStudioPage;
