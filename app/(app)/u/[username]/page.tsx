"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  Calendar,
  Award,
  MapPin,
  ExternalLink,
  Settings,
  EyeOff,
  MessageSquare,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/fuega/post-card";
import { ReportDialog } from "@/components/fuega/report-dialog";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ProfileSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useOptimisticVoting } from "@/lib/hooks/useOptimisticVoting";
import { toPostCardData } from "@/lib/adapters/post-adapter";
import { api, ApiError } from "@/lib/api/client";
import { timeAgo } from "@/lib/utils/time-ago";

interface UserCommentApi {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  sparks: number;
  douses: number;
  post: { id: string; title: string };
  campfire: { id: string; name: string };
}

interface UserComment {
  id: string;
  body: string;
  created_at: string;
  post_id: string;
  post_title: string;
  campfire_name: string;
  glow: number;
}

interface UserProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  profileVisible: boolean;
  brandText: string | null;
  brandStyle: Record<string, string>;
  glow: number;
  postGlow: number;
  commentGlow: number;
  founderNumber: number | null;
  createdAt: string;
}

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "X",
  github: "GH",
  discord: "DC",
  mastodon: "MA",
  bluesky: "BS",
  youtube: "YT",
  twitch: "TW",
  linkedin: "LI",
};

const COMMENTS_LIMIT = 10;
const POSTS_LIMIT = 10;

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  // Active tab state -- used for lazy loading
  const [activeTab, setActiveTab] = React.useState("posts");

  // Fetch profile
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    api
      .get<{ profile: UserProfile }>(`/api/users/${encodeURIComponent(username)}/profile`)
      .then((data) => {
        if (!cancelled) {
          setProfile(data.profile);
          setProfileLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err.message : "Failed to load profile");
          setProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // Fetch user's posts -- only when posts tab is active (default tab, so loads immediately)
  const {
    posts: rawPosts,
    loading: postsLoading,
    hasMore,
    loadMore,
  } = usePosts({
    author: activeTab === "posts" ? username : undefined,
    sort: "new",
    limit: POSTS_LIMIT,
  });

  // Voting
  const { handleVote, getVote, getDelta } = useOptimisticVoting();

  // Fetch user's comments -- LAZY: only when comments tab is first selected
  const [comments, setComments] = React.useState<UserComment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = React.useState(false);
  const [hasMoreComments, setHasMoreComments] = React.useState(false);
  const [commentsInitialized, setCommentsInitialized] = React.useState(false);

  const mapComment = (c: UserCommentApi): UserComment => ({
    id: c.id,
    body: c.body,
    created_at: c.createdAt,
    post_id: c.post.id,
    post_title: c.post.title,
    campfire_name: c.campfire.name,
    glow: (c.sparks ?? 0) - (c.douses ?? 0),
  });

  // Lazy-load comments on tab switch
  React.useEffect(() => {
    if (activeTab !== "comments" || commentsInitialized) return;

    let cancelled = false;
    setCommentsLoading(true);

    api
      .get<{ comments: UserCommentApi[] }>(`/api/users/${encodeURIComponent(username)}/comments`, { limit: COMMENTS_LIMIT })
      .then((data) => {
        if (!cancelled) {
          const mapped = (data.comments ?? []).map(mapComment);
          setComments(mapped);
          setHasMoreComments(mapped.length >= COMMENTS_LIMIT);
          setCommentsLoading(false);
          setCommentsInitialized(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComments([]);
          setHasMoreComments(false);
          setCommentsLoading(false);
          setCommentsInitialized(true);
        }
      });

    return () => { cancelled = true; };
  }, [activeTab, commentsInitialized, username]);

  const loadMoreComments = React.useCallback(async () => {
    if (commentsLoadingMore || !hasMoreComments || comments.length === 0) return;
    setCommentsLoadingMore(true);
    try {
      const lastComment = comments[comments.length - 1] as UserComment | undefined;
      if (!lastComment) return;
      const data = await api.get<{ comments: UserCommentApi[] }>(
        `/api/users/${encodeURIComponent(username)}/comments`,
        { limit: COMMENTS_LIMIT, before: lastComment.created_at }
      );
      const mapped = (data.comments ?? []).map(mapComment);
      setComments((prev) => [...prev, ...mapped]);
      setHasMoreComments(mapped.length >= COMMENTS_LIMIT);
    } catch {
      // Silently handle pagination errors
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [commentsLoadingMore, hasMoreComments, comments, username]);

  // Page title
  React.useEffect(() => {
    document.title = `${username} - fuega`;
  }, [username]);

  // Report dialog
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);

  // Convert posts to card shape
  const postCards = rawPosts.map((p) => {
    const card = toPostCardData(p);
    const delta = getDelta(p.id);
    if (delta !== 0) {
      card.sparkCount += delta;
    }
    return card;
  });

  const isOwnProfile = currentUser?.username === (profile?.username ?? "");
  const isHidden = profile ? !profile.profileVisible && !isOwnProfile : false;
  const filledSocials = React.useMemo(
    () =>
      Object.entries(profile?.socialLinks ?? {}).filter(
        ([, val]) => val && val.trim() !== "",
      ),
    [profile?.socialLinks],
  );

  if (profileLoading) return <ProfileSkeleton />;

  if (profileError || !profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash">
          {profileError ?? "User not found"}
        </p>
        <Link
          href="/home"
          className="mt-2 inline-block text-xs text-flame-400 hover:underline"
        >
          &larr; Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Profile header */}
      <div className="rounded-lg border border-charcoal bg-charcoal/50 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <UserAvatar username={profile.username} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {profile.username}
              </h1>
              {profile.displayName && profile.profileVisible && (
                <span className="text-sm text-ash">
                  {profile.displayName}
                </span>
              )}
              {profile.founderNumber && (
                <Badge className="gap-1 bg-flame-500/20 text-flame-400 border-flame-500/30 text-[10px]">
                  <Award className="h-3 w-3" />
                  Founder #{profile.founderNumber}
                </Badge>
              )}
              {profile.brandText && profile.profileVisible && (
                <span className="text-[10px] px-1.5 py-0.5 bg-flame-400/10 text-flame-400 border border-flame-400/20">
                  {profile.brandText}
                </span>
              )}
              {isOwnProfile && (
                <Link
                  href="/settings/profile"
                  aria-label="Edit profile"
                  className="ml-auto text-smoke hover:text-ash transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              )}
            </div>

            {isHidden && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-smoke">
                <EyeOff className="h-3.5 w-3.5" />
                This user&apos;s profile is hidden
              </div>
            )}

            {profile.bio && profile.profileVisible && (
              <p className="mt-1.5 text-sm text-ash">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-smoke">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-flame-400" />
                <span className="font-semibold text-flame-400">
                  {(profile.glow ?? 0).toLocaleString()}
                </span>{" "}
                glow
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {profile.location && profile.profileVisible && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && profile.profileVisible && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-flame-400 hover:text-flame-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {(() => {
                    try {
                      return new URL(profile.website).hostname;
                    } catch {
                      return profile.website;
                    }
                  })()}
                </a>
              )}
            </div>

            {/* Social links */}
            {filledSocials.length > 0 && profile.profileVisible && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filledSocials.map(([platform, handle]) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-charcoal/50 border border-charcoal text-ash"
                  >
                    <span className="text-smoke font-bold">
                      {SOCIAL_ICONS[platform] ?? platform}
                    </span>
                    {handle}
                  </span>
                ))}
              </div>
            )}

            {/* Glow breakdown */}
            {profile.profileVisible && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-smoke">
                <span>Post glow: {(profile.postGlow ?? 0).toLocaleString()}</span>
                <span>Comment glow: {(profile.commentGlow ?? 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs -- lazy loading via onValueChange */}
      <Tabs defaultValue="posts" className="mt-4" onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b border-charcoal bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-ash data-[state=active]:border-flame-400 data-[state=active]:text-flame-400 data-[state=active]:bg-transparent"
          >
            <FileText className="h-3.5 w-3.5" />
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-ash data-[state=active]:border-flame-400 data-[state=active]:text-flame-400 data-[state=active]:bg-transparent"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Comments
          </TabsTrigger>
          <Link
            href={`/u/${profile.username}/badges`}
            className="ml-auto self-end pb-2 text-xs text-smoke hover:text-flame-400 transition-colors"
          >
            View badges &rarr;
          </Link>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {postsLoading && postCards.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-24 rounded-md bg-charcoal/30" />
              ))}
            </div>
          ) : postCards.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-coal border border-charcoal">
                <FileText className="h-6 w-6 text-smoke" />
              </div>
              <p className="text-sm font-medium text-ash">No posts yet</p>
              <p className="mt-1 text-xs text-smoke">
                When {profile.username} creates posts, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <>
              {postCards.map((post) => (
                <Link key={post.id} href={`/f/${post.campfire}/${post.id}`}>
                  <PostCard
                    post={post}
                    userVote={getVote(post.id)}
                    onVote={(v) => handleVote(post.id, v)}
                    onReport={() => setReportPostId(post.id)}
                  />
                </Link>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-3 text-center text-xs text-ash hover:text-flame-400 transition-colors"
                >
                  Load more posts
                </button>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-1">
          {commentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-16 rounded-md bg-charcoal/30" />
              ))}
            </div>
          ) : comments.length === 0 && commentsInitialized ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-coal border border-charcoal">
                <MessageSquare className="h-6 w-6 text-smoke" />
              </div>
              <p className="text-sm font-medium text-ash">No comments yet</p>
              <p className="mt-1 text-xs text-smoke">
                When {profile.username} comments on posts, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/f/${comment.campfire_name}/${comment.post_id}`}
                  className="block rounded-md border border-transparent p-3 hover:border-lava-hot/20 hover:bg-coal/80 transition-all"
                >
                  <div className="flex items-center gap-2 text-[10px] text-smoke">
                    <span className="font-mono">
                      <span className="text-flame-400">f</span>
                      <span className="text-smoke mx-0.5">|</span>
                      <span>{comment.campfire_name}</span>
                    </span>
                    <span>&middot;</span>
                    <span className="truncate">{comment.post_title}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ash line-clamp-2">{comment.body}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-smoke">
                    <Flame className="h-3 w-3 text-flame-400" />
                    <span>{comment.glow ?? 0} glow</span>
                  </div>
                </Link>
              ))}
              {hasMoreComments && (
                <button
                  onClick={loadMoreComments}
                  disabled={commentsLoadingMore}
                  className="w-full py-3 text-center text-xs text-ash hover:text-flame-400 transition-colors disabled:opacity-50"
                >
                  {commentsLoadingMore ? "Loading..." : "Load more comments"}
                </button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Report dialog */}
      <ReportDialog
        open={reportPostId !== null}
        onOpenChange={(open) => { if (!open) setReportPostId(null); }}
        postId={reportPostId ?? undefined}
      />
    </div>
  );
}
