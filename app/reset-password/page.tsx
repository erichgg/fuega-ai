"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Very strong", color: "bg-green-400" };
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void text-ash">Loading...</div>}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const passwordStrength = newPassword.length > 0 ? getPasswordStrength(newPassword) : null;
  const confirmTouched = confirmPassword.length > 0;
  const canSubmit = token && passwordLongEnough && passwordsMatch && confirmTouched && !loading;

  // Auto-redirect to login 3 seconds after success
  React.useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => {
      router.push("/login");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [success, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-void px-4">
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
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
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
                Your password has been reset successfully. Redirecting to
                login...
              </p>
              <Link
                href="/login"
                className="block text-xs text-flame-400 hover:text-flame-400/80 transition-colors"
              >
                Go to login now
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
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      aria-required="true"
                      minLength={8}
                      autoComplete="new-password"
                      autoFocus
                      className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 pr-10"
                      aria-describedby="new-password-strength"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ash transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordStrength && (
                    <div id="new-password-strength" className="space-y-1.5">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              i < passwordStrength.score
                                ? passwordStrength.color
                                : "bg-charcoal",
                            )}
                          />
                        ))}
                      </div>
                      <p
                        className={cn(
                          "text-xs",
                          passwordStrength.score <= 1 && "text-red-400",
                          passwordStrength.score === 2 && "text-amber-400",
                          passwordStrength.score === 3 && "text-yellow-400",
                          passwordStrength.score >= 4 && "text-green-400",
                        )}
                      >
                        {passwordStrength.label}
                        {!passwordLongEnough && " — minimum 8 characters"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-ash">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      aria-required="true"
                      minLength={8}
                      autoComplete="new-password"
                      className={cn(
                        "border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 pr-10",
                        confirmTouched && !passwordsMatch && "border-red-500/50 focus-visible:ring-red-500/50",
                        confirmTouched && passwordsMatch && newPassword.length > 0 && "border-green-500/50 focus-visible:ring-green-500/50",
                      )}
                      aria-describedby="confirm-password-help"
                      aria-invalid={confirmTouched && !passwordsMatch}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ash transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmTouched && !passwordsMatch && (
                    <p id="confirm-password-help" className="text-xs text-red-400">
                      Passwords do not match
                    </p>
                  )}
                  {confirmTouched && passwordsMatch && newPassword.length > 0 && (
                    <p id="confirm-password-help" className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Passwords match
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
