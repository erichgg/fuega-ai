import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/auth-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "fuega.ai — AI-Moderated Discussion",
    template: "%s | fuega.ai",
  },
  description:
    "Community-driven discussions with transparent AI moderation. Communities write and vote on their own AI moderator prompts.",
  keywords: [
    "discussion",
    "community",
    "AI moderation",
    "governance",
    "anonymous",
    "transparent",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://fuega.ai",
  ),
  openGraph: {
    type: "website",
    siteName: "fuega.ai",
    title: "fuega.ai — AI-Moderated Discussion",
    description:
      "Community-driven discussions with transparent AI moderation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fuega.ai",
    description:
      "Community-driven discussions with transparent AI moderation.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
