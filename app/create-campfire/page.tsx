"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCreateCampfire } from "@/lib/hooks/useCampfires";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 21);
}

export default function CreateCampfirePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createCampfire, creating, error } = useCreateCampfire();

  const [displayName, setDisplayName] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [success, setSuccess] = React.useState(false);

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
        <p className="text-ash-400">
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
        className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to feed
      </Link>

      <h1 className="mt-4 text-xl font-bold text-ash-100">
        Create a Campfire
      </h1>
      <p className="mt-1 text-sm text-ash-400">
        Start a new campfire with transparent AI moderation. You&apos;ll be the
        first admin.
      </p>

      {success && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-ash-200">
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
            className="mb-1.5 block text-sm font-medium text-ash-300"
          >
            Display Name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Science & Discovery"
            maxLength={100}
            className="border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
          />
        </div>

        {/* Slug */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-ash-300"
          >
            URL slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ash-500 whitespace-nowrap">
              <span className="text-lava-hot">f</span>
              <span className="text-smoke mx-0.5">|</span>
            </span>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="science_discovery"
              maxLength={21}
              className="border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50 font-mono text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-ash-500">
            3-21 characters, lowercase letters, numbers, and underscores only
          </p>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-ash-300"
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
            className="min-h-[100px] resize-y border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-xs text-ash-500">
            {description.length}/500 characters
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="spark"
            disabled={
              !name ||
              name.length < 3 ||
              !displayName.trim() ||
              !description.trim() ||
              creating ||
              success
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
