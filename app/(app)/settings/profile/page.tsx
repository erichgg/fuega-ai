"use client";

import * as React from "react";
import { Save, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth-context";
import { api } from "@/lib/api/client";

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
  const { user, loading: authLoading } = useAuth();
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

  // Track saved state for dirty detection
  const [savedForm, setSavedForm] = React.useState<ProfileForm | null>(null);
  const isDirty = savedForm !== null && JSON.stringify(form) !== JSON.stringify(savedForm);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.get<{ profile: Record<string, unknown> }>("/api/settings/profile");
        const p = data.profile;
        if (!cancelled) {
          const loaded: ProfileForm = {
            displayName: (p.displayName as string) ?? "",
            bio: (p.bio as string) ?? "",
            location: (p.location as string) ?? "",
            website: (p.website as string) ?? "",
            socialLinks: (p.socialLinks as Record<string, string>) ?? {},
            brandText: (p.brandText as string) ?? "",
          };
          setForm(loaded);
          setSavedForm(loaded);
        }
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Failed to load profile" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.put("/api/settings/profile", {
        displayName: form.displayName || null,
        bio: form.bio || null,
        location: form.location || null,
        website: form.website || null,
        socialLinks: form.socialLinks,
        brandText: form.brandText || null,
      });
      setSavedForm({ ...form });
      setMessage({ type: "success", text: "Profile updated" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update";
      setMessage({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  // Auto-dismiss success messages after 3 seconds
  React.useEffect(() => {
    if (message?.type !== "success") return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

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

  if (!authLoading && !user) {
    return (
      <div className="py-12 text-center text-sm text-smoke">
        Please <a href="/login" className="text-lava-hot hover:underline">log in</a> to access settings.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Identity
        </h2>

        <div>
          <Label htmlFor="username" className="text-xs text-ash">
            Username (permanent)
          </Label>
          <Input
            id="username"
            value={user?.username ?? ""}
            disabled
            className="mt-1 bg-charcoal/50 text-smoke border-charcoal cursor-not-allowed"
          />
          <p className="text-[10px] text-smoke mt-1">
            Usernames cannot be changed
          </p>
        </div>

        <div>
          <Label htmlFor="displayName" className="text-xs text-ash">
            Display Name
          </Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            maxLength={50}
            placeholder="Optional display name"
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
          />
          <p className="text-[10px] text-smoke mt-1">
            Shown alongside your username · {form.displayName.length}/50
          </p>
        </div>

        <div>
          <Label htmlFor="bio" className="text-xs text-ash">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={500}
            rows={3}
            placeholder="Tell the campfire about yourself..."
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke resize-none"
          />
          <p className="text-[10px] text-smoke mt-1">
            {form.bio.length}/500
          </p>
        </div>

        <div>
          <Label htmlFor="location" className="text-xs text-ash">
            Location
          </Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            maxLength={100}
            placeholder="The internet, probably"
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
          />
        </div>

        <div>
          <Label htmlFor="website" className="text-xs text-ash">
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
              className="bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke pr-8"
            />
            {form.website && (
              <ExternalLink className="absolute right-2.5 top-2.5 h-4 w-4 text-smoke" />
            )}
          </div>
        </div>
      </div>

      {/* Brand (flair) */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Brand
        </h2>
        <p className="text-[10px] text-smoke">
          Your Brand is shown next to your username in posts and comments
        </p>

        <div>
          <Label htmlFor="brandText" className="text-xs text-ash">
            Brand Text
          </Label>
          <Input
            id="brandText"
            value={form.brandText}
            onChange={(e) => setForm((f) => ({ ...f, brandText: e.target.value }))}
            maxLength={50}
            placeholder="Custom brand text"
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
          />
          <p className="text-[10px] text-smoke mt-1">
            {form.brandText.length}/50
          </p>
        </div>

        {form.brandText && (
          <div className="flex items-center gap-2 p-2 bg-charcoal/80 border border-charcoal">
            <span className="text-xs text-ash">{user?.username}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-flame-400/10 text-flame-400 border border-flame-400/20">
              {form.brandText}
            </span>
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="terminal-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Social Links
        </h2>
        <p className="text-[10px] text-smoke">
          All fields are optional. Only filled fields appear on your profile.
        </p>

        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label htmlFor={`social-${key}`} className="text-xs text-ash">
                {label}
              </Label>
              <Input
                id={`social-${key}`}
                value={form.socialLinks[key] ?? ""}
                onChange={(e) => updateSocialLink(key, e.target.value)}
                maxLength={100}
                placeholder={placeholder}
                className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
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

      <div className="flex items-center justify-end gap-3">
        {isDirty && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}
        <Button
          type="submit"
          variant="spark"
          disabled={saving || !isDirty}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>
    </form>
  );
}
