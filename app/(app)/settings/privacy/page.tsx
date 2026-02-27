"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { api } from "@/lib/api/client";

export default function PrivacySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [profileVisible, setProfileVisible] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Set page title
  React.useEffect(() => {
    document.title = "Privacy Settings - fuega";
  }, []);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/profile", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setProfileVisible(data.profile.profileVisible);
        }
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Failed to load privacy settings" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash">
          You need to{" "}
          <Link href="/login" className="text-flame-400 hover:underline">log in</Link>
          {" "}to access this page.
        </p>
      </div>
    );
  }

  const handleToggle = async () => {
    const newValue = !profileVisible;
    setSaving(true);
    setMessage(null);

    try {
      await api.put("/api/settings/privacy", { profileVisible: newValue });
      setProfileVisible(newValue);
      setMessage({
        type: "success",
        text: newValue
          ? "Profile is now visible"
          : "Profile is now hidden",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update";
      setMessage({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading privacy settings...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile visibility */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-ash" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Profile Visibility
          </h2>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ash">Public Profile</p>
            <p className="text-[10px] text-smoke mt-1">
              When hidden, visitors to your profile will only see your username,
              glow, and account age. Bio, location, website, social links, and
              Brand will be hidden.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={profileVisible}
            onClick={handleToggle}
            disabled={saving}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
              profileVisible
                ? "bg-flame-500"
                : "bg-charcoal"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={profileVisible ? "Profile visible" : "Profile hidden"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-void rounded-full transition-transform ${
                profileVisible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 bg-charcoal/80 border border-charcoal text-xs">
          {profileVisible ? (
            <>
              <Eye className="h-3.5 w-3.5 text-flame-400" />
              <span className="text-ash">
                Your profile is <span className="text-flame-400 font-medium">visible</span> to everyone
              </span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5 text-smoke" />
              <span className="text-ash">
                Your profile is <span className="text-ash font-medium">hidden</span> from public view
              </span>
            </>
          )}
        </div>
      </div>

      {/* Anonymity reminder */}
      <div className="terminal-card p-4 sm:p-6 space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Anonymity
        </h2>
        <div className="text-xs text-ash space-y-2">
          <p>
            <span className="text-flame-400 font-semibold">fuega</span> never
            asks for your real name, photo, phone number, or email address.
          </p>
          <p>
            Your IP address is hashed and salted — we cannot see it, and the
            hash is deleted after 30 days.
          </p>
          <p>
            All profile fields are optional. You control exactly what others see.
          </p>
        </div>
      </div>

      {message && (
        <div
          role="alert"
          className={`p-3 text-xs border ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-ember-500/30 bg-ember-500/10 text-ember-400"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
