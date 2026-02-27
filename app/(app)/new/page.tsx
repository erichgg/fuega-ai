"use client";

import { Clock } from "lucide-react";
import { FeedTemplate } from "@/components/fuega/feed-template";

export default function NewPostsPage() {
  return (
    <FeedTemplate
      pageTitle="New Posts - fuega"
      defaultSort="new"
      header={{
        icon: Clock,
        title: "New",
        description:
          "The latest posts from every campfire, newest first.",
      }}
      emptyState={{
        icon: Clock,
        title: "No posts yet",
        subtitle: "Be the first to start a conversation.",
        ctaLabel: "Create a post",
        ctaLabelLoggedOut: "Sign up to post",
      }}
    />
  );
}
