"use client";

import Link from "next/link";
import { WelcomeBanner } from "@/components/fuega/welcome-banner";
import { FeedTemplate } from "@/components/fuega/feed-template";

export default function HomeFeedPage() {
  return (
    <FeedTemplate
      pageTitle="Home - fuega"
      defaultSort="hot"
      beforeComposer={<WelcomeBanner className="mb-4" />}
      emptyState={{
        emoji: "\uD83D\uDD25",
        title: "The hearth is quiet\u2026",
        subtitle:
          "No posts yet. Light the first spark and get the conversation going.",
        ctaLabel: "Start a conversation",
        ctaLabelLoggedOut: "Sign up to post",
        footer: (
          <p className="mt-4 text-xs text-smoke">
            Or{" "}
            <Link href="/campfires" className="text-flame-400 hover:underline">
              explore campfires
            </Link>{" "}
            to find your community.
          </p>
        ),
      }}
    />
  );
}
