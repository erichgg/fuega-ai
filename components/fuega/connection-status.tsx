"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    // Check initial state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-14 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-ember/90 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You&apos;re offline. Some features may not work.</span>
    </div>
  );
}
