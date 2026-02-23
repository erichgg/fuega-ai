"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";

/**
 * If the user is already logged in, redirect to /home.
 * Renders nothing visible — drop it at the top of any page
 * that should be "public-only" (landing, login, signup).
 */
export function AuthRedirect({ to = "/home" }: { to?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(to);
    }
  }, [user, loading, router, to]);

  return null;
}
