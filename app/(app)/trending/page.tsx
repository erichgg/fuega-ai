"use client";

import { TrendingUp } from "lucide-react";
import { FeedTemplate } from "@/components/fuega/feed-template";

export default function TrendingPage() {
  return (
    <FeedTemplate
      pageTitle="Trending - fuega"
      defaultSort="hot"
      header={{
        icon: TrendingUp,
        title: "Trending",
        description:
          "The hottest posts across all campfires right now.",
      }}
      emptyState={{
        icon: TrendingUp,
        title: "Nothing trending yet",
        subtitle: "Posts will show up here as they gain sparks.",
      }}
    />
  );
}
