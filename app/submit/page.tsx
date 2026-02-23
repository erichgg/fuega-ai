"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCampfires } from "@/lib/hooks/useCampfires";
import { useCreatePost } from "@/lib/hooks/usePosts";

export default function SubmitPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-2xl py-16 text-center text-ash-400">
          Loading...
        </div>
      }
    >
      <SubmitPageInner />
    </React.Suspense>
  );
}

function SubmitPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Pre-select campfire from URL param (e.g. /submit?campfire=meta)
  const preselectedCampfire = searchParams.get("campfire") ?? "";

  // Fetch campfire list for the dropdown
  const { campfires, loading: campfiresLoading } = useCampfires({
    sort: "members",
    limit: 100,
  });

  const { createPost, creating, error } = useCreatePost();

  // Form state
  const [selectedCampfireId, setSelectedCampfireId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [moderationResult, setModerationResult] = React.useState<{
    decision: string;
    reasoning: string;
  } | null>(null);

  // When campfires load, try to match the preselected campfire by name
  React.useEffect(() => {
    if (preselectedCampfire && campfires.length > 0 && !selectedCampfireId) {
      const match = campfires.find(
        (c) => c.name.toLowerCase() === preselectedCampfire.toLowerCase(),
      );
      if (match) {
        setSelectedCampfireId(match.id);
      }
    }
  }, [preselectedCampfire, campfires, selectedCampfireId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampfireId || !title.trim() || creating) return;

    try {
      const result = await createPost({
        campfire_id: selectedCampfireId,
        title: title.trim(),
        body: body.trim(),
        post_type: "text",
      });

      setModerationResult({
        decision: result.moderation.decision,
        reasoning: result.moderation.reasoning,
      });

      // Find the campfire name for the redirect
      const campfire = campfires.find((c) => c.id === selectedCampfireId);
      const campfireName = campfire?.name ?? selectedCampfireId;

      // Redirect to the new post after a brief delay to show moderation result
      if (result.moderation.decision !== "remove") {
        setTimeout(() => {
          router.push(`/f/${campfireName}/${result.post.id}`);
        }, 1500);
      }
    } catch {
      // Error handled by hook
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-ash-400">
          You need to{" "}
          <Link href="/login" className="text-flame-400 hover:underline">
            log in
          </Link>{" "}
          to create a post.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to feed
      </Link>

      <h1 className="mt-4 text-xl font-bold text-ash-100">Create a Post</h1>
      <p className="mt-1 text-sm text-ash-400">
        Your post will be reviewed by the campfire&apos;s AI Tender in
        real-time.
      </p>

      {moderationResult && (
        <div
          className={`mt-4 rounded-lg border p-4 ${
            moderationResult.decision === "approve"
              ? "border-green-500/30 bg-green-500/10"
              : moderationResult.decision === "remove"
                ? "border-red-500/30 bg-red-500/10"
                : "border-yellow-500/30 bg-yellow-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {moderationResult.decision === "approve" ? (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-sm font-medium text-ash-200">
              {moderationResult.decision === "approve"
                ? "Post approved — redirecting..."
                : moderationResult.decision === "remove"
                  ? "Post removed by moderation"
                  : "Post flagged for review"}
            </span>
          </div>
          <p className="mt-1 text-xs text-ash-400">
            {moderationResult.reasoning}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Campfire selector */}
        <div>
          <label
            htmlFor="campfire"
            className="mb-1.5 block text-sm font-medium text-ash-300"
          >
            Campfire
          </label>
          <select
            id="campfire"
            value={selectedCampfireId}
            onChange={(e) => setSelectedCampfireId(e.target.value)}
            className="w-full rounded-md border border-ash-800 bg-ash-950 px-3 py-2 text-sm text-ash-200 focus:outline-none focus:ring-2 focus:ring-flame-500/50"
            disabled={campfiresLoading}
          >
            <option value="">
              {campfiresLoading
                ? "Loading campfires..."
                : "Select a campfire"}
            </option>
            {campfires.map((c) => (
              <option key={c.id} value={c.id}>
                f | {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-1.5 block text-sm font-medium text-ash-300"
          >
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={300}
            className="border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-xs text-ash-500">
            {title.length}/300 characters
          </p>
        </div>

        {/* Body */}
        <div>
          <label
            htmlFor="body"
            className="mb-1.5 block text-sm font-medium text-ash-300"
          >
            Body{" "}
            <span className="font-normal text-ash-500">(optional)</span>
          </label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add more details..."
            rows={8}
            maxLength={40000}
            className="min-h-[160px] resize-y border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
          />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="spark"
            disabled={!selectedCampfireId || !title.trim() || creating}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {creating ? "Submitting..." : "Create Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
