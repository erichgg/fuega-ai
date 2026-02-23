import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { NotificationProvider } from "@/lib/contexts/notification-context";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "fuega.ai — AI-Moderated Discussion",
    template: "%s | fuega.ai",
  },
  description:
    "Campfire-governed discussions with transparent AI moderation. Campfires set governance variables and vote to shape their own Tender.",
  keywords: [
    "discussion",
    "campfire",
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
      "Campfire-governed discussions with transparent AI moderation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fuega.ai",
    description:
      "Campfire-governed discussions with transparent AI moderation.",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-void text-foreground`}
      >
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
