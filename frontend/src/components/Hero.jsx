import React from "react";
import HeroSection from "./HeroSection";

/**
 * Compatibility wrapper.
 * Some parts of the app import `Hero` while the newer implementation lives in `HeroSection`.
 */
export default function Hero(props) {
  return <HeroSection {...props} />;
}

export { Hero };
