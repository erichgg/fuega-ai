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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/fuega/post-card";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ProfileSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useVoting } from "@/lib/hooks/useVoting";
import { toPostCardData } from "@/lib/adapters/post-adapter";
import { api } from "@/lib/api/client";

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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

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

  // Fetch user's posts
  const {
    posts: rawPosts,
    loading: postsLoading,
    hasMore,
    loadMore,
  } = usePosts({ author: username, sort: "new" });

  // Voting
  const { vote } = useVoting();
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});
  const [sparkDeltas, setSparkDeltas] = React.useState<Record<string, number>>(
    {},
  );

  const handleVote = async (postId: string, voteType: "spark" | "douse") => {
    const current = votes[postId] ?? null;
    const newState = voteType === "spark" ? "sparked" : "doused";

    if (current === newState) {
      setVotes((prev) => ({ ...prev, [postId]: null }));
      setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
    } else {
      setVotes((prev) => ({ ...prev, [postId]: newState }));
      setSparkDeltas((prev) => ({
        ...prev,
        [postId]: voteType === "spark" ? 1 : -1,
      }));
    }

    try {
      await vote("post", postId, voteType);
    } catch {
      setVotes((prev) => ({ ...prev, [postId]: current }));
      setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
    }
  };

  // Convert posts to card shape
  const postCards = rawPosts.map((p) => {
    const card = toPostCardData(p);
    if (sparkDeltas[p.id] !== undefined) {
      card.sparkCount += sparkDeltas[p.id] ?? 0;
    }
    return card;
  });

  const loading = profileLoading || postsLoading;

  if (loading) return <ProfileSkeleton />;

  if (profileError || !profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">
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

  const isOwnProfile = currentUser?.username === profile.username;
  const isHidden = !profile.profileVisible && !isOwnProfile;
  const filledSocials = Object.entries(profile.socialLinks ?? {}).filter(
    ([, val]) => val && val.trim() !== "",
  );

  return (
    <div>
      {/* Profile header */}
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <UserAvatar username={profile.username} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-ash-100">
                {profile.username}
              </h1>
              {profile.displayName && profile.profileVisible && (
                <span className="text-sm text-ash-400">
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
                  className="ml-auto text-ash-500 hover:text-ash-300 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              )}
            </div>

            {isHidden && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-ash-500">
                <EyeOff className="h-3.5 w-3.5" />
                This user&apos;s profile is hidden
              </div>
            )}

            {profile.bio && profile.profileVisible && (
              <p className="mt-1.5 text-sm text-ash-400">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-ash-500">
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
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-ash-800/50 border border-ash-700 text-ash-400"
                  >
                    <span className="text-ash-500 font-bold">
                      {SOCIAL_ICONS[platform] ?? platform}
                    </span>
                    {handle}
                  </span>
                ))}
              </div>
            )}

            {/* Glow breakdown */}
            {profile.profileVisible && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-ash-600">
                <span>Post glow: {(profile.postGlow ?? 0).toLocaleString()}</span>
                <span>Comment glow: {(profile.commentGlow ?? 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-4">
        <TabsList className="w-full justify-start border-b border-ash-800 bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-ash-400 data-[state=active]:border-flame-400 data-[state=active]:text-flame-400 data-[state=active]:bg-transparent"
          >
            Posts ({postCards.length})
          </TabsTrigger>
          <Link
            href={`/u/${profile.username}/badges`}
            className="ml-auto self-end pb-2 text-xs text-ash-500 hover:text-flame-400 transition-colors"
          >
            View badges &rarr;
          </Link>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {postCards.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-ash-400">No posts yet</p>
              <p className="mt-1 text-xs text-ash-600">
                When {profile.username} creates posts, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <>
              {postCards.map((post) => (
                <Link key={post.id} href={`/f/${post.campfire}/${post.id}`}>
                  <PostCard
                    post={post}
                    userVote={votes[post.id] ?? null}
                    onVote={(v) => handleVote(post.id, v)}
                  />
                </Link>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-3 text-center text-xs text-ash-400 hover:text-flame-400 transition-colors"
                >
                  Load more posts
                </button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
