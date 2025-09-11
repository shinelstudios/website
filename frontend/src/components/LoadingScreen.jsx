// src/components/LoadingScreen.jsx
import React from "react";
import logo from "../assets/logo-loader.png"; // ✅ renamed file

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0F0F0F] z-[9999]">
      <div className="relative flex items-center justify-center">
        {/* Logo */}
        <img
          src={logo}
          alt="Shinel Studios Logo"
          className="w-20 h-20 object-contain relative z-10 select-none"
          draggable="false"
        />

        {/* Loading circle */}
        <div
          className="absolute w-28 h-28 rounded-full border-4 border-[#E85002]/30 border-t-[#E85002] animate-spin"
          style={{ animationDuration: "1.2s" }}
        ></div>
      </div>
    </div>
  );
};

export default LoadingScreen;
