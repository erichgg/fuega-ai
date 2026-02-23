"use client";

import * as React from "react";
import { Save, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/contexts/auth-context";

const SOCIAL_PLATFORMS = [
  { key: "twitter", label: "X / Twitter", placeholder: "@handle" },
  { key: "github", label: "GitHub", placeholder: "username" },
  { key: "discord", label: "Discord", placeholder: "username#0000" },
  { key: "mastodon", label: "Mastodon", placeholder: "@user@instance" },
  { key: "bluesky", label: "Bluesky", placeholder: "@handle.bsky.social" },
] as const;

interface ProfileForm {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  socialLinks: Record<string, string>;
  brandText: string;
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = React.useState<ProfileForm>({
    displayName: "",
    bio: "",
    location: "",
    website: "",
    socialLinks: {},
    brandText: "",
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/profile", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setForm({
            displayName: p.displayName ?? "",
            bio: p.bio ?? "",
            location: p.location ?? "",
            website: p.website ?? "",
            socialLinks: p.socialLinks ?? {},
            brandText: p.brandText ?? "",
          });
        }
      } catch {
        // Will use empty defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: form.displayName || null,
          bio: form.bio || null,
          location: form.location || null,
          website: form.website || null,
          socialLinks: form.socialLinks,
          brandText: form.brandText || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "Failed to update" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const updateSocialLink = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading profile...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-ash-200 uppercase tracking-wider">
          Identity
        </h2>

        <div>
          <Label htmlFor="username" className="text-xs text-ash-400">
            Username (permanent)
          </Label>
          <Input
            id="username"
            value={user?.username ?? ""}
            disabled
            className="mt-1 bg-ash-900/50 text-ash-500 border-ash-700 cursor-not-allowed"
          />
          <p className="text-[10px] text-ash-600 mt-1">
            Usernames cannot be changed
          </p>
        </div>

        <div>
          <Label htmlFor="displayName" className="text-xs text-ash-400">
            Display Name
          </Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            maxLength={50}
            placeholder="Optional display name"
            className="mt-1 bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600"
          />
          <p className="text-[10px] text-ash-600 mt-1">
            Shown alongside your username · {form.displayName.length}/50
          </p>
        </div>

        <div>
          <Label htmlFor="bio" className="text-xs text-ash-400">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={500}
            rows={3}
            placeholder="Tell the campfire about yourself..."
            className="mt-1 bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600 resize-none"
          />
          <p className="text-[10px] text-ash-600 mt-1">
            {form.bio.length}/500
          </p>
        </div>

        <div>
          <Label htmlFor="location" className="text-xs text-ash-400">
            Location
          </Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            maxLength={100}
            placeholder="The internet, probably"
            className="mt-1 bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600"
          />
        </div>

        <div>
          <Label htmlFor="website" className="text-xs text-ash-400">
            Website
          </Label>
          <div className="relative mt-1">
            <Input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              maxLength={255}
              placeholder="https://example.com"
              className="bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600 pr-8"
            />
            {form.website && (
              <ExternalLink className="absolute right-2.5 top-2.5 h-4 w-4 text-ash-500" />
            )}
          </div>
        </div>
      </div>

      {/* Brand (flair) */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-ash-200 uppercase tracking-wider">
          Brand
        </h2>
        <p className="text-[10px] text-ash-500">
          Your Brand is shown next to your username in posts and comments
        </p>

        <div>
          <Label htmlFor="brandText" className="text-xs text-ash-400">
            Brand Text
          </Label>
          <Input
            id="brandText"
            value={form.brandText}
            onChange={(e) => setForm((f) => ({ ...f, brandText: e.target.value }))}
            maxLength={50}
            placeholder="Custom brand text"
            className="mt-1 bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600"
          />
          <p className="text-[10px] text-ash-600 mt-1">
            {form.brandText.length}/50
          </p>
        </div>

        {form.brandText && (
          <div className="flex items-center gap-2 p-2 bg-ash-900/80 border border-ash-700">
            <span className="text-xs text-ash-300">{user?.username}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-flame-400/10 text-flame-400 border border-flame-400/20">
              {form.brandText}
            </span>
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-ash-200 uppercase tracking-wider">
          Social Links
        </h2>
        <p className="text-[10px] text-ash-500">
          All fields are optional. Only filled fields appear on your profile.
        </p>

        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label htmlFor={`social-${key}`} className="text-xs text-ash-400">
                {label}
              </Label>
              <Input
                id={`social-${key}`}
                value={form.socialLinks[key] ?? ""}
                onChange={(e) => updateSocialLink(key, e.target.value)}
                maxLength={100}
                placeholder={placeholder}
                className="mt-1 bg-ash-900/50 border-ash-700 text-ash-200 placeholder:text-ash-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-flame-500 text-void hover:bg-flame-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </button>
      </div>
    </form>
  );
}
