"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Flame, Calendar, Award, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/fuega/post-card";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ProfileSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockProfile(username: string) {
  return {
    id: "usr_" + username,
    username,
    sparkScore: 1247 + Math.floor(Math.random() * 500),
    founderBadge: true,
    bio: "Passionate about transparent AI and community governance. Early adopter and active contributor.",
    createdAt: "2024-01-15T00:00:00Z",
    postCount: 23,
    commentCount: 156,
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
      community: "meta",
      sparkCount: 89,
      commentCount: 23,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      moderation: { action: "approved" as const, confidence: 0.97 },
    },
    {
      id: "up2",
      title: "Proposal for improved governance voting UI",
      author: username,
      community: "meta",
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
      postCommunity: "tech",
      postId: "2",
      body: "The confidence scoring system is brilliant. Low-confidence decisions go to community review instead of auto-removal.",
      sparkCount: 34,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: "uc2",
      postTitle: "Welcome to fuega.ai",
      postCommunity: "meta",
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

  const [profile, setProfile] = React.useState<ReturnType<
    typeof getMockProfile
  > | null>(null);
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

  return (
    <div>
      {/* Profile header */}
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-6">
        <div className="flex items-start gap-4">
          <UserAvatar username={profile.username} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ash-100">
                {profile.username}
              </h1>
              {profile.founderBadge && (
                <Badge className="gap-1 bg-flame-500/20 text-flame-400 border-flame-500/30 text-[10px]">
                  <Award className="h-3 w-3" />
                  Founder
                </Badge>
              )}
            </div>

            {profile.bio && (
              <p className="mt-1 text-sm text-ash-400">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ash-500">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-flame-400" />
                <span className="font-semibold text-flame-400">
                  {profile.sparkScore.toLocaleString()}
                </span>{" "}
                spark score
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {profile.postCount} posts · {profile.commentCount} comments
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
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
          {isOwnProfile && (
            <TabsTrigger
              value="about"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-ash-400 data-[state=active]:border-flame-400 data-[state=active]:text-flame-400 data-[state=active]:bg-transparent"
            >
              About
            </TabsTrigger>
          )}
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
                    f/{comment.postCommunity}
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

        {isOwnProfile && (
          <TabsContent value="about" className="mt-4">
            <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-4">
              <p className="text-sm text-ash-400">
                Edit your profile bio and settings here. Coming soon.
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
