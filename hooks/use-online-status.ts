"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect online/offline status
 * Uses Navigator.onLine API and listens to online/offline events
 *
 * @returns {boolean} isOnline - True if online, false if offline
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) {
 *   console.log("You are offline");
 * }
 */
export function useOnlineStatus(): boolean {
  // Initialize with current online status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    // Handler for when connection is restored
    const handleOnline = () => {
      console.log("[useOnlineStatus] Connection restored");
      setIsOnline(true);
    };

    // Handler for when connection is lost
    const handleOffline = () => {
      console.log("[useOnlineStatus] Connection lost");
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
