"use client";

import * as React from "react";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";

export default function PrivacySettingsPage() {
  const [profileVisible, setProfileVisible] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/profile", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setProfileVisible(data.profile.profileVisible);
        }
      } catch {
        // Use default
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggle = async () => {
    const newValue = !profileVisible;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileVisible: newValue }),
      });

      if (res.ok) {
        setProfileVisible(newValue);
        setMessage({
          type: "success",
          text: newValue
            ? "Profile is now visible"
            : "Profile is now hidden",
        });
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error ?? "Failed to update",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
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
          <Shield className="h-4 w-4 text-ash-400" />
          <h2 className="text-sm font-bold text-ash-200 uppercase tracking-wider">
            Profile Visibility
          </h2>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ash-300">Public Profile</p>
            <p className="text-[10px] text-ash-500 mt-1">
              When hidden, visitors to your profile will only see your username,
              glow, and account age. Bio, location, website, social links, and
              Brand will be hidden.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            disabled={saving}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
              profileVisible
                ? "bg-flame-500"
                : "bg-ash-700"
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

        <div className="flex items-center gap-2 p-2 bg-ash-900/80 border border-ash-700 text-xs">
          {profileVisible ? (
            <>
              <Eye className="h-3.5 w-3.5 text-flame-400" />
              <span className="text-ash-300">
                Your profile is <span className="text-flame-400 font-medium">visible</span> to everyone
              </span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5 text-ash-500" />
              <span className="text-ash-300">
                Your profile is <span className="text-ash-400 font-medium">hidden</span> from public view
              </span>
            </>
          )}
        </div>
      </div>

      {/* Anonymity reminder */}
      <div className="terminal-card p-4 sm:p-6 space-y-3">
        <h2 className="text-sm font-bold text-ash-200 uppercase tracking-wider">
          Anonymity
        </h2>
        <div className="text-xs text-ash-400 space-y-2">
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
