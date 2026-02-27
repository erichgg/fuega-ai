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
  Film,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCampfires } from "@/lib/hooks/useCampfires";
import { useCreatePost } from "@/lib/hooks/usePosts";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { CampfirePicker } from "@/components/fuega/campfire-picker";

type PostType = "text" | "link" | "image" | "video";

const DRAFT_KEY = "fuega_draft_post";

interface Draft {
  postType: PostType;
  title: string;
  body: string;
  url: string;
  imageUrl: string;
  campfireId: string;
}

interface UploadedFile {
  url: string;
  type: "image" | "video";
  filename: string;
  size: number;
}

// ─── File Upload Zone ─────────────────────────────────────────

interface FileUploadZoneProps {
  accept: string;
  maxSizeLabel: string;
  maxSizeBytes: number;
  mediaType: "image" | "video";
  onUploadComplete: (file: UploadedFile) => void;
  uploadedFile: UploadedFile | null;
  onRemove: () => void;
  previewUrl: string;
}

function FileUploadZone({
  accept,
  maxSizeLabel,
  maxSizeBytes,
  mediaType,
  onUploadComplete,
  uploadedFile,
  onRemove,
  previewUrl,
}: FileUploadZoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = React.useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file) return;

      setUploadError(null);

      // Client-side validation
      const allowedTypes =
        mediaType === "image"
          ? ["image/jpeg", "image/png", "image/gif", "image/webp"]
          : ["video/mp4", "video/webm"];

      if (!allowedTypes.includes(file.type)) {
        setUploadError(
          mediaType === "image"
            ? "Only JPEG, PNG, GIF, and WebP images are allowed"
            : "Only MP4 and WebM videos are allowed",
        );
        return;
      }

      if (file.size > maxSizeBytes) {
        setUploadError(`File too large. Maximum size is ${maxSizeLabel}`);
        return;
      }

      setUploading(true);
      setProgress(0);

      // Simulate progress (real progress would require XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(data.error || "Upload failed");
        }

        setProgress(100);
        const data: UploadedFile = await res.json();
        onUploadComplete(data);
      } catch (err) {
        clearInterval(progressInterval);
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Please try again.",
        );
      } finally {
        setUploading(false);
        setProgress(0);
        // Reset file input
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [maxSizeBytes, maxSizeLabel, mediaType, onUploadComplete],
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!uploading) setDragging(true);
    },
    [uploading],
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (!uploading) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [uploading, handleFiles],
  );

  // If there's an uploaded file or a pasted URL preview, show the preview
  if (uploadedFile || previewUrl) {
    const displayUrl = uploadedFile?.url || previewUrl;
    const displayName = uploadedFile?.filename || "Linked media";
    const displaySize = uploadedFile
      ? formatFileSize(uploadedFile.size)
      : null;
    const displayType = uploadedFile?.type || mediaType;

    return (
      <div className="relative overflow-hidden rounded-lg border border-charcoal bg-coal">
        {/* Preview */}
        <div className="relative flex items-center justify-center bg-void/50">
          {displayType === "image" ? (
            <div className="relative max-h-64 w-full overflow-hidden">
              <Image
                src={displayUrl}
                alt="Upload preview"
                width={600}
                height={400}
                unoptimized
                className="h-auto max-h-64 w-full object-contain"
              />
            </div>
          ) : (
            <video
              src={displayUrl}
              controls
              className="max-h-64 w-full"
              preload="metadata"
            >
              <track kind="captions" />
            </video>
          )}
        </div>
        {/* File info bar */}
        <div className="flex items-center justify-between border-t border-charcoal px-3 py-2">
          <div className="flex items-center gap-2 truncate">
            {displayType === "image" ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-flame-400" />
            ) : (
              <Film className="h-4 w-4 shrink-0 text-flame-400" />
            )}
            <span className="truncate text-sm text-ash">{displayName}</span>
            {displaySize && (
              <span className="shrink-0 text-xs text-smoke">
                ({displaySize})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 rounded p-1 text-smoke transition-colors hover:bg-charcoal hover:text-red-400"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-all ${
          dragging
            ? "border-flame-400 bg-flame-400/5"
            : "border-charcoal bg-coal hover:border-smoke hover:bg-coal/80"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-flame-400" />
        ) : (
          <Upload
            className={`mb-3 h-8 w-8 ${dragging ? "text-flame-400" : "text-smoke"}`}
          />
        )}

        <p className="text-sm font-medium text-ash">
          {uploading
            ? "Uploading..."
            : dragging
              ? "Drop to upload"
              : "Drag & drop or click to upload"}
        </p>
        <p className="mt-1 text-xs text-smoke">
          {mediaType === "image"
            ? "JPEG, PNG, GIF, WebP"
            : "MP4, WebM"}{" "}
          &middot; Max {maxSizeLabel}
        </p>

        {/* Progress bar */}
        {uploading && (
          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-lg bg-charcoal">
            <div
              className="h-full bg-gradient-to-r from-flame-500 to-flame-400 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Helpers ──────────────────────────────────────────────────

function isEmbeddableVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be") ||
      parsed.hostname.includes("vimeo.com")
    );
  } catch {
    return false;
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (
      parsed.hostname.includes("youtube.com") &&
      parsed.pathname === "/watch"
    ) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (
      parsed.hostname.includes("youtube.com") &&
      parsed.pathname.startsWith("/embed/")
    ) {
      videoId = parsed.pathname.split("/embed/")[1] ?? null;
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const match = parsed.pathname.match(/\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  } catch {
    return null;
  }
}

// ─── Main Page ────────────────────────────────────────────────

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

  // Pre-select campfire and post type from URL params
  const preselectedCampfire = searchParams.get("campfire") ?? "";
  const preselectedType = searchParams.get("type") as PostType | null;

  // Fetch campfire list for the dropdown
  const { campfires, loading: campfiresLoading } = useCampfires({
    sort: "members",
    limit: 100,
  });

  const { createPost, creating, error } = useCreatePost();

  // Form state
  const validTypes: PostType[] = ["text", "link", "image", "video"];
  const [postType, setPostType] = React.useState<PostType>(
    preselectedType && validTypes.includes(preselectedType) ? preselectedType : "text"
  );
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

  // Upload state
  const [uploadedImageFile, setUploadedImageFile] =
    React.useState<UploadedFile | null>(null);
  const [uploadedVideoFile, setUploadedVideoFile] =
    React.useState<UploadedFile | null>(null);

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

  // Page title
  React.useEffect(() => {
    document.title = "Submit Post - fuega";
  }, []);

  // Warn on unsaved changes before leaving
  const hasUnsavedChanges = Boolean(title.trim() || body.trim() || url.trim() || imageUrl.trim());
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !moderationResult) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, moderationResult]);

  // HTTPS validation for link/video URLs
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [imageUrlError, setImageUrlError] = React.useState<string | null>(null);

  const validateHttps = (value: string): string | null => {
    if (!value.trim()) return null;
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== "https:") {
        return "URL must use HTTPS for security";
      }
    } catch {
      return "Please enter a valid URL";
    }
    return null;
  };

  // Resolve effective image URL (upload takes precedence over pasted URL)
  const effectiveImageUrl = uploadedImageFile?.url || imageUrl;

  // Resolve effective video URL (upload takes precedence over pasted URL)
  const effectiveVideoUrl = uploadedVideoFile?.url || url;

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
        ...(postType === "image" && effectiveImageUrl
          ? { image_url: effectiveImageUrl }
          : {}),
        ...(postType === "video" && effectiveVideoUrl
          ? { url: effectiveVideoUrl }
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
    {
      type: "image",
      label: "Image",
      icon: <ImageIcon className="h-4 w-4" />,
    },
    { type: "video", label: "Video", icon: <Film className="h-4 w-4" /> },
  ];

  // Video preview logic
  const videoPreviewEmbed =
    postType === "video" && url.trim() && !uploadedVideoFile
      ? getYouTubeEmbedUrl(url.trim()) || getVimeoEmbedUrl(url.trim())
      : null;

  const showVideoNativePreview =
    postType === "video" && !videoPreviewEmbed && effectiveVideoUrl && !isEmbeddableVideoUrl(effectiveVideoUrl);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

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
                ? "Post approved -- redirecting..."
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Post type tabs */}
        <div className="flex rounded-lg border border-charcoal bg-coal p-1">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setPostType(tab.type)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                postType === tab.type
                  ? "bg-charcoal text-flame-400 shadow-sm"
                  : "text-smoke hover:text-ash"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
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
          <CampfirePicker
            campfires={campfires}
            selectedId={selectedCampfireId}
            onSelect={setSelectedCampfireId}
            loading={campfiresLoading}
          />
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
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(validateHttps(e.target.value));
              }}
              onBlur={() => setUrlError(validateHttps(url))}
              placeholder="https://..."
              className={`border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 ${urlError ? "border-red-500/50" : ""}`}
            />
            {urlError ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            ) : (
              <p className="mt-1 text-xs text-smoke">Must be HTTPS</p>
            )}
          </div>
        )}

        {/* Image upload + URL (image posts) */}
        {postType === "image" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ash">
              Image
            </label>
            <FileUploadZone
              accept="image/jpeg,image/png,image/gif,image/webp"
              maxSizeLabel="10MB"
              maxSizeBytes={10 * 1024 * 1024}
              mediaType="image"
              onUploadComplete={(file) => {
                setUploadedImageFile(file);
                setImageUrl(file.url);
              }}
              uploadedFile={uploadedImageFile}
              onRemove={() => {
                setUploadedImageFile(null);
                setImageUrl("");
              }}
              previewUrl={!uploadedImageFile && imageUrl.trim() ? imageUrl.trim() : ""}
            />
            {!uploadedImageFile && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-smoke">
                  Or paste an image URL
                </p>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageUrlError(validateHttps(e.target.value));
                  }}
                  onBlur={() => setImageUrlError(validateHttps(imageUrl))}
                  placeholder="https://example.com/image.jpg"
                  className={`border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 ${imageUrlError ? "border-red-500/50" : ""}`}
                />
                {imageUrlError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {imageUrlError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Video upload + URL (video posts) */}
        {postType === "video" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ash">
              Video
            </label>
            <FileUploadZone
              accept="video/mp4,video/webm"
              maxSizeLabel="50MB"
              maxSizeBytes={50 * 1024 * 1024}
              mediaType="video"
              onUploadComplete={(file) => {
                setUploadedVideoFile(file);
                setUrl(file.url);
              }}
              uploadedFile={uploadedVideoFile}
              onRemove={() => {
                setUploadedVideoFile(null);
                setUrl("");
              }}
              previewUrl=""
            />
            {!uploadedVideoFile && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-smoke">
                  Or paste a video URL (YouTube, Vimeo, direct link)
                </p>
                <Input
                  id="videoUrl"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError(validateHttps(e.target.value));
                  }}
                  onBlur={() => setUrlError(validateHttps(url))}
                  placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
                  className={`border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 ${urlError ? "border-red-500/50" : ""}`}
                />
                {urlError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {urlError}
                  </p>
                )}
              </div>
            )}

            {/* Embed preview for YouTube/Vimeo */}
            {videoPreviewEmbed && (
              <div className="overflow-hidden rounded-lg border border-charcoal">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={videoPreviewEmbed}
                    title="Video preview"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between border-t border-charcoal px-3 py-2">
                  <div className="flex items-center gap-2 truncate">
                    <Film className="h-4 w-4 shrink-0 text-flame-400" />
                    <span className="truncate text-sm text-ash">
                      {url.trim()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="ml-2 rounded p-1 text-smoke transition-colors hover:bg-charcoal hover:text-red-400"
                    title="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Native video preview for direct URLs */}
            {showVideoNativePreview && (
              <div className="overflow-hidden rounded-lg border border-charcoal">
                <video
                  src={effectiveVideoUrl}
                  controls
                  className="max-h-64 w-full"
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
                <div className="flex items-center justify-between border-t border-charcoal px-3 py-2">
                  <div className="flex items-center gap-2 truncate">
                    <Film className="h-4 w-4 shrink-0 text-flame-400" />
                    <span className="truncate text-sm text-ash">
                      {url.trim()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="ml-2 rounded p-1 text-smoke transition-colors hover:bg-charcoal hover:text-red-400"
                    title="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
            Body <span className="font-normal text-smoke">(optional)</span>
          </label>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 rounded-md border border-charcoal bg-coal p-0.5">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  !showPreview
                    ? "bg-charcoal text-foreground shadow-sm"
                    : "text-smoke hover:text-ash"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  showPreview
                    ? "bg-charcoal text-foreground shadow-sm"
                    : "text-smoke hover:text-ash"
                }`}
              >
                Preview
              </button>
            </div>
            <p className="text-[10px] text-smoke">
              Supports **markdown** formatting
            </p>
          </div>
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
          <div className="mt-1 flex items-center justify-end">
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
        <div className="flex items-center justify-between border-t border-charcoal pt-4">
          <p className="text-xs text-smoke">
            {postType === "image" && !effectiveImageUrl
              ? "Upload or paste an image to continue"
              : postType === "video" && !effectiveVideoUrl
                ? "Upload or paste a video URL to continue"
                : postType === "link" && !url.trim()
                  ? "Add a URL to continue"
                  : "\u00A0"}
          </p>
          <Button
            type="submit"
            variant="spark"
            disabled={
              !selectedCampfireId ||
              !title.trim() ||
              creating ||
              (postType === "link" && !url.trim()) ||
              (postType === "image" && !effectiveImageUrl) ||
              (postType === "video" && !effectiveVideoUrl)
            }
            className="gap-1.5"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create Post
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
