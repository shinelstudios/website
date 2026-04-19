import { useEffect, useState } from "react";

/**
 * useDeviceCapabilities — single source of truth for device-level performance
 * gates used by ambient animations. Returns a stable snapshot after mount.
 *
 * Rules:
 *   isLowPower — <=4 CPU cores OR <=2GB RAM OR save-data mode OR 2g
 *   isMobile   — matchMedia max-width:768px
 *   isTouch    — no fine pointer
 *   isLowBattery — battery < 20% and not charging (where supported)
 *
 * Animations should downshift when isLowPower || isLowBattery and skip
 * mouse-driven effects when isTouch.
 */
export function useDeviceCapabilities() {
  const [caps, setCaps] = useState(() => ({
    isMobile: false,
    isTouch: false,
    isLowPower: false,
    isLowBattery: false,
    saveData: false,
    ready: false,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia?.("(max-width: 768px)").matches ?? false;
    const isTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;

    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    const conn = navigator.connection || {};
    const saveData = !!conn.saveData;
    const slowNet = ["slow-2g", "2g"].includes(conn.effectiveType);

    const isLowPower = cores <= 4 || memory <= 2 || saveData || slowNet;

    let nextState = {
      isMobile,
      isTouch,
      isLowPower,
      isLowBattery: false,
      saveData,
      ready: true,
    };

    setCaps(nextState);

    // Battery probe — best-effort, only Chromium supports it today.
    if (typeof navigator.getBattery === "function") {
      navigator.getBattery().then((battery) => {
        const lb = battery.level < 0.2 && !battery.charging;
        setCaps((prev) => ({ ...prev, isLowBattery: lb }));
      }).catch(() => {});
    }
  }, []);

  return caps;
}
