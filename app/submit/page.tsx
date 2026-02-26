"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  Link2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCampfires } from "@/lib/hooks/useCampfires";
import { useCreatePost } from "@/lib/hooks/usePosts";
import { MarkdownContent } from "@/components/fuega/markdown-content";

type PostType = "text" | "link" | "image";

const DRAFT_KEY = "fuega_draft_post";

interface Draft {
  postType: PostType;
  title: string;
  body: string;
  url: string;
  imageUrl: string;
  campfireId: string;
}

export default function SubmitPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-2xl py-16 text-center text-ash">
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
  const [postType, setPostType] = React.useState<PostType>("text");
  const [selectedCampfireId, setSelectedCampfireId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);
  const [moderationResult, setModerationResult] = React.useState<{
    decision: string;
    reasoning: string;
  } | null>(null);

  // Draft state
  const [draftAvailable, setDraftAvailable] = React.useState(false);
  const draftLoadedRef = React.useRef(false);

  // Load draft on mount
  React.useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: Draft = JSON.parse(raw);
        if (draft.title || draft.body || draft.url || draft.imageUrl) {
          setDraftAvailable(true);
        }
      }
    } catch {
      // ignore malformed draft
    }
  }, []);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: Draft = JSON.parse(raw);
        setPostType(draft.postType ?? "text");
        setTitle(draft.title ?? "");
        setBody(draft.body ?? "");
        setUrl(draft.url ?? "");
        setImageUrl(draft.imageUrl ?? "");
        if (draft.campfireId) setSelectedCampfireId(draft.campfireId);
      }
    } catch {
      // ignore
    }
    setDraftAvailable(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftAvailable(false);
  };

  // Auto-save draft every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (title || body || url || imageUrl) {
        const draft: Draft = {
          postType,
          title,
          body,
          url,
          imageUrl,
          campfireId: selectedCampfireId,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [postType, title, body, url, imageUrl, selectedCampfireId]);

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

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampfireId || !title.trim() || creating) return;

    try {
      const result = await createPost({
        campfire_id: selectedCampfireId,
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        ...(postType === "link" && url.trim() ? { url: url.trim() } : {}),
        ...(postType === "image" && imageUrl.trim()
          ? { image_url: imageUrl.trim() }
          : {}),
      });

      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_KEY);

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
        <p className="text-ash">
          You need to{" "}
          <Link href="/login" className="text-flame-400 hover:underline">
            log in
          </Link>{" "}
          to create a post.
        </p>
      </div>
    );
  }

  const tabs: { type: PostType; label: string; icon: React.ReactNode }[] = [
    { type: "text", label: "Text", icon: <FileText className="h-4 w-4" /> },
    { type: "link", label: "Link", icon: <Link2 className="h-4 w-4" /> },
    { type: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to feed
      </Link>

      <h1 className="mt-4 text-xl font-bold text-foreground">Create a Post</h1>
      <p className="mt-1 text-sm text-ash">
        Your post will be reviewed by the campfire&apos;s AI Tender in
        real-time.
      </p>

      {/* Draft restore banner */}
      {draftAvailable && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-charcoal bg-coal px-4 py-2.5">
          <span className="text-sm text-ash">
            You have an unsaved draft. Restore it?
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="spark"
              size="sm"
              onClick={restoreDraft}
            >
              Restore
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-smoke hover:text-ash"
              onClick={discardDraft}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

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
            <span className="text-sm font-medium text-foreground">
              {moderationResult.decision === "approve"
                ? "Post approved — redirecting..."
                : moderationResult.decision === "remove"
                  ? "Post removed by moderation"
                  : "Post flagged for review"}
            </span>
          </div>
          <p className="mt-1 text-xs text-ash">
            {moderationResult.reasoning}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Post type tabs */}
        <div className="flex gap-1 border-b border-charcoal mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setPostType(tab.type)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-mono transition-colors cursor-pointer ${
                postType === tab.type
                  ? "bg-charcoal text-flame-400 border-b-2 border-lava-hot"
                  : "text-smoke hover:text-ash"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Campfire selector */}
        <div>
          <label
            htmlFor="campfire"
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            Campfire
          </label>
          <select
            id="campfire"
            value={selectedCampfireId}
            onChange={(e) => setSelectedCampfireId(e.target.value)}
            className="w-full rounded-md border border-charcoal bg-coal px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50"
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
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={300}
            className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-xs text-smoke">
            {title.length}/300 characters
          </p>
        </div>

        {/* URL field (link posts) */}
        {postType === "link" && (
          <div>
            <label
              htmlFor="url"
              className="mb-1.5 block text-sm font-medium text-ash"
            >
              URL
            </label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
            <p className="mt-1 text-xs text-smoke">Must be HTTPS</p>
          </div>
        )}

        {/* Image URL field (image posts) */}
        {postType === "image" && (
          <div>
            <label
              htmlFor="imageUrl"
              className="mb-1.5 block text-sm font-medium text-ash"
            >
              Image URL
            </label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
            {imageUrl.trim() && (
              <div className="mt-2 overflow-hidden rounded-md border border-charcoal bg-coal">
                <div className="relative max-h-48 overflow-hidden">
                  <Image
                    src={imageUrl.trim()}
                    alt="Image preview"
                    width={600}
                    height={400}
                    unoptimized
                    className="h-auto max-h-48 w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div>
          <label
            htmlFor="body"
            className="mb-1.5 block text-sm font-medium text-ash"
          >
            Body{" "}
            <span className="font-normal text-smoke">
              {postType === "text" ? "(optional)" : "(optional)"}
            </span>
          </label>
          {showPreview ? (
            <div className="min-h-[160px] rounded-md border border-charcoal bg-coal p-3">
              {body.trim() ? (
                <MarkdownContent content={body} />
              ) : (
                <p className="text-sm text-smoke">Nothing to preview</p>
              )}
            </div>
          ) : (
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more details..."
              rows={8}
              maxLength={40000}
              className="min-h-[160px] resize-y border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
          )}
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] font-medium text-smoke hover:text-ash transition-colors"
              >
                {showPreview ? "Write" : "Preview"}
              </button>
              <p className="text-[10px] text-smoke">
                Supports **markdown** formatting
              </p>
            </div>
            <p className="text-xs text-smoke">
              {body.length.toLocaleString()} / 40,000 chars &middot;{" "}
              {wordCount} words
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm text-red-400"
          >
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
