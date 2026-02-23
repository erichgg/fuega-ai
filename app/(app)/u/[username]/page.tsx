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

interface UserProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  profileVisible: boolean;
  brandText: string | null;
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

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockProfile(username: string): UserProfile {
  return {
    username,
    displayName: "Campfire Keeper",
    bio: "Passionate about transparent AI and campfire governance. Early adopter and active contributor.",
    location: "The internet",
    website: "https://example.com",
    socialLinks: { github: "keeper42", twitter: "@keeper" },
    profileVisible: true,
    brandText: "Early Adopter",
    glow: 1247 + Math.floor(Math.random() * 500),
    postGlow: 800,
    commentGlow: 447,
    founderNumber: 42,
    createdAt: "2024-01-15T00:00:00Z",
  };
}

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockUserPosts(username: string) {
  return [
    {
      id: "up1",
      title: "My thoughts on transparent AI moderation after one month",
      body: "After using fuega for a month, here are my observations about how AI moderation changes the discussion dynamic...",
      author: username,
      campfire: "meta",
      sparkCount: 89,
      commentCount: 23,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      moderation: { action: "approved" as const, confidence: 0.97 },
    },
    {
      id: "up2",
      title: "Proposal for improved governance voting UI",
      author: username,
      campfire: "meta",
      sparkCount: 45,
      commentCount: 12,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockUserComments(username: string) {
  return [
    {
      id: "uc1",
      postTitle: "How AI moderation actually works on fuega",
      postCampfire: "tech",
      postId: "2",
      body: "The confidence scoring system is brilliant. Low-confidence decisions go to campfire review instead of auto-removal.",
      sparkCount: 34,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: "uc2",
      postTitle: "Welcome to fuega.ai",
      postCampfire: "meta",
      postId: "1",
      body: "Excited to be part of this from the beginning. The Founder badge is a nice touch!",
      sparkCount: 12,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

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

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [posts, setPosts] = React.useState<ReturnType<typeof getMockUserPosts>>(
    [],
  );
  const [comments, setComments] = React.useState<
    ReturnType<typeof getMockUserComments>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProfile(getMockProfile(username));
      setPosts(getMockUserPosts(username));
      setComments(getMockUserComments(username));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [username]);

  const handleVote = (postId: string, vote: "spark" | "douse") => {
    setVotes((prev) => {
      const current = prev[postId];
      const voteState = vote === "spark" ? "sparked" : "doused";
      return { ...prev, [postId]: current === voteState ? null : voteState };
    });
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile)
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">User not found</p>
      </div>
    );

  const isOwnProfile = currentUser?.username === profile.username;
  const isHidden = !profile.profileVisible && !isOwnProfile;
  const filledSocials = Object.entries(profile.socialLinks).filter(
    ([, val]) => val && val.trim() !== ""
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
                  {profile.glow.toLocaleString()}
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
                  {new URL(profile.website).hostname}
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
                <span>Post glow: {profile.postGlow.toLocaleString()}</span>
                <span>Comment glow: {profile.commentGlow.toLocaleString()}</span>
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
            Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-ash-400 data-[state=active]:border-flame-400 data-[state=active]:text-flame-400 data-[state=active]:bg-transparent"
          >
            Comments ({comments.length})
          </TabsTrigger>
          <Link
            href={`/u/${profile.username}/badges`}
            className="ml-auto self-end pb-2 text-xs text-ash-500 hover:text-flame-400 transition-colors"
          >
            View badges →
          </Link>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-ash-500">
              No posts yet
            </p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userVote={votes[post.id] ?? null}
                onVote={(vote) => handleVote(post.id, vote)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-2">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-ash-500">
              No comments yet
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-ash-800 bg-ash-900/50 p-3"
              >
                <div className="text-xs text-ash-500">
                  Commented on{" "}
                  <span className="text-ash-300 font-medium">
                    {comment.postTitle}
                  </span>{" "}
                  in{" "}
                  <span className="text-flame-400">
                    <span className="text-lava-hot">f</span>
                    <span className="text-smoke mx-1">|</span>
                    <span>{comment.postCampfire}</span>
                  </span>{" "}
                  · {timeAgo(comment.createdAt)}
                </div>
                <p className="mt-1.5 text-sm text-ash-300">{comment.body}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-ash-500">
                  <Flame className="h-3 w-3 text-flame-400" />
                  {comment.sparkCount} sparks
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
