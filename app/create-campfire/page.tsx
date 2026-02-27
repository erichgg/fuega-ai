"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCreateCampfire } from "@/lib/hooks/useCampfires";
import { api } from "@/lib/api/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 21);
}

// ---------------------------------------------------------------------------
// Debounced slug uniqueness check hook
// ---------------------------------------------------------------------------

function useSlugCheck(slug: string) {
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    // Reset if slug too short
    if (!slug || slug.length < 3) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    // Invalid pattern
    if (!/^[a-z0-9_]+$/.test(slug)) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);

    const timer = setTimeout(async () => {
      // Cancel previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await api.get<{ available: boolean }>(
          "/api/campfires/check-name",
          { name: slug },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setAvailable(data.available);
        }
      } catch {
        // Ignore aborted or failed requests
        if (!controller.signal.aborted) {
          setAvailable(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [slug]);

  return { checking, available };
}

// ---------------------------------------------------------------------------
// Create Campfire Page
// ---------------------------------------------------------------------------

export default function CreateCampfirePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createCampfire, creating, error } = useCreateCampfire();

  const [displayName, setDisplayName] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  // Page title
  React.useEffect(() => {
    document.title = "Create Campfire - fuega";
  }, []);

  // Real-time slug uniqueness check
  const { checking: slugChecking, available: slugAvailable } = useSlugCheck(name);

  // Auto-generate slug from display name unless manually edited
  React.useEffect(() => {
    if (!nameManuallyEdited && displayName) {
      setName(slugify(displayName));
    }
  }, [displayName, nameManuallyEdited]);

  const handleNameChange = (val: string) => {
    setNameManuallyEdited(true);
    setName(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !displayName.trim() || !description.trim() || creating)
      return;

    try {
      const result = await createCampfire({
        name,
        display_name: displayName.trim(),
        description: description.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/f/${result.campfire.name}`);
      }, 1500);
    } catch {
      // Error handled by hook
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-ash">
          You need to{" "}
          <Link href="/login" className="text-flame-400 hover:underline">
            log in
          </Link>{" "}
          to create a campfire.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to feed
      </Link>

      <h1 className="mt-4 text-xl font-bold text-foreground">
        Create a Campfire
      </h1>
      <p className="mt-1 text-sm text-ash">
        Start a new campfire with transparent AI moderation. You&apos;ll be the
        first admin.
      </p>

      {success && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-foreground">
              Campfire created — redirecting...
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Display name */}
        <div>
          <label
            htmlFor="displayName"
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            Display Name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Science & Discovery"
            maxLength={100}
            className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
          />
        </div>

        {/* Slug */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            URL slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-smoke whitespace-nowrap">
              <span className="text-lava-hot">f</span>
              <span className="text-smoke mx-0.5">|</span>
            </span>
            <div className="relative flex-1">
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="science_discovery"
                maxLength={21}
                className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 font-mono text-sm pr-8"
              />
              {/* Slug status indicator */}
              {name.length >= 3 && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {slugChecking ? (
                    <Loader2 className="h-4 w-4 text-smoke animate-spin" />
                  ) : slugAvailable === true ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : slugAvailable === false ? (
                    <X className="h-4 w-4 text-ember-400" />
                  ) : null}
                </span>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-smoke">
              3-21 characters, lowercase letters, numbers, and underscores only
            </p>
            {name.length >= 3 && slugAvailable === false && (
              <p className="text-xs text-ember-400">Name is taken</p>
            )}
            {name.length >= 3 && slugAvailable === true && !slugChecking && (
              <p className="text-xs text-green-400">Available</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this campfire about?"
            rows={4}
            maxLength={500}
            className="min-h-[100px] resize-y border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-xs text-smoke">
            {description.length}/500 characters
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="spark"
            disabled={
              !name ||
              name.length < 3 ||
              !displayName.trim() ||
              !description.trim() ||
              creating ||
              success ||
              slugAvailable === false ||
              slugChecking
            }
            className="gap-1.5"
          >
            <Flame className="h-4 w-4" />
            {creating ? "Creating..." : "Light the Fire"}
          </Button>
        </div>
      </form>
    </div>
  );
}
