"use client";

import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash-400">
            Log in to continue the conversation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-ash-300">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              className="border-ash-800 bg-ash-900 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-ash-300">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-flame-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border-ash-800 bg-ash-900 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
            />
          </div>

          <Button
            type="submit"
            variant="spark"
            className="w-full gap-2"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ash-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-flame-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
