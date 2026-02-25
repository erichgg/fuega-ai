"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { api, ApiError } from "@/lib/api/client";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void text-ash">Loading...</div>}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit = token && passwordLongEnough && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <div className="terminal-card mt-8 p-8 space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h1 className="text-xl font-bold text-foreground glow-text-subtle">
              <span className="text-lava-hot font-bold">$ </span>
              invalid link
            </h1>
            <p className="text-sm text-ash">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="block text-xs text-flame-400 hover:text-flame-400/80 transition-colors"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash">
            Set a new password for your account
          </p>
        </div>

        <div className="terminal-card mt-8 p-8">
          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-flame-400" />
              <h1 className="text-xl font-bold text-foreground glow-text-subtle">
                <span className="text-lava-hot font-bold">$ </span>
                password updated
              </h1>
              <p className="text-sm text-ash">
                Your password has been reset successfully. You can now log in
                with your new password.
              </p>
              <Link
                href="/login"
                className="block text-xs text-flame-400 hover:text-flame-400/80 transition-colors"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-foreground glow-text-subtle">
                <span className="text-lava-hot font-bold">$ </span>
                reset password
              </h1>
              <p className="mb-6 text-xs text-smoke">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="newPassword" className="text-ash">
                    New password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                    className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
                  />
                  {newPassword && !passwordLongEnough && (
                    <p className="text-xs text-red-400">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-ash">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-400">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="spark"
                  className="w-full gap-2"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loading ? "Resetting..." : "Reset password"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-smoke">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-flame-400 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
