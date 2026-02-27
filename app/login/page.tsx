"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";
import { EmberParticles } from "@/components/fuega/ember-particles";
import { ThemeToggle } from "@/components/fuega/theme-toggle";

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-void text-ash">
          Loading...
        </div>
      }
    >
      <LoginInner />
    </React.Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const redirectTo = searchParams.get("redirect") || "/home";

  // Page title
  React.useEffect(() => {
    document.title = "Log In - fuega";
  }, []);

  React.useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-void px-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <EmberParticles count={8} />
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash">
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
            <Label htmlFor="username" className="text-ash">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-required="true"
              autoComplete="username"
              autoFocus
              maxLength={20}
              className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-ash">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-flame-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="current-password"
                className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ash transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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

        <p className="mt-6 text-center text-sm text-smoke">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-flame-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
