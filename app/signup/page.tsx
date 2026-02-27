"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";
import { FireParticles } from "@/components/fuega/fire-particles";
import { ThemeToggle } from "@/components/fuega/theme-toggle";
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

function validateUsername(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be at most 20 characters";
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return "Username can only contain letters, numbers, and underscores";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, user } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const usernameError = username.length > 0 ? validateUsername(username) : null;
  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const passwordValid = password.length >= 8;
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const confirmPasswordTouched = confirmPassword.length > 0;

  // Page title
  React.useEffect(() => {
    document.title = "Sign Up - fuega";
  }, []);

  React.useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const canSubmit =
    username.length >= 3 &&
    !usernameError &&
    passwordValid &&
    confirmPasswordTouched &&
    password === confirmPassword &&
    termsAccepted &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(username, password, email || undefined);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-void px-4 py-12 overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <FireParticles count={40} />
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash">
            Create your account and join the conversation
          </p>
        </div>

        {/* Founder badge banner */}
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-flame-500/20 bg-flame-500/5 p-3 text-sm">
          <Zap className="h-4 w-4 shrink-0 text-flame-400" />
          <span className="text-flame-300">
            Be among the first 5,000 users and earn a permanent{" "}
            <span className="font-semibold text-flame-400">Founder badge</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-ash">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="choose_a_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-required="true"
              autoComplete="username"
              autoFocus
              maxLength={20}
              className={cn(
                "border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50",
                usernameError && "border-red-500/50 focus-visible:ring-red-500/50",
              )}
              aria-describedby="username-help"
              aria-invalid={!!usernameError}
            />
            {usernameError ? (
              <p id="username-help" className="text-xs text-red-400">
                {usernameError}
              </p>
            ) : username.length >= 3 ? (
              <p id="username-help" className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Username looks good
              </p>
            ) : (
              <p id="username-help" className="text-xs text-smoke">
                3-20 characters, letters, numbers, and underscores
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-ash">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="8+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="new-password"
                className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 pr-10"
                aria-describedby="password-strength"
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
            {passwordStrength && (
              <div id="password-strength" className="space-y-1.5">
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
                  {!passwordValid && " — minimum 8 characters"}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-ash">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="new-password"
                className={cn(
                  "border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50 pr-10",
                  confirmPasswordTouched && !passwordsMatch && "border-red-500/50 focus-visible:ring-red-500/50",
                  confirmPasswordTouched && passwordsMatch && password.length > 0 && "border-green-500/50 focus-visible:ring-green-500/50",
                )}
                aria-describedby="confirm-password-help"
                aria-invalid={confirmPasswordTouched && !passwordsMatch}
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
            {confirmPasswordTouched && !passwordsMatch && (
              <p id="confirm-password-help" className="text-xs text-red-400">
                Passwords do not match
              </p>
            )}
            {confirmPasswordTouched && passwordsMatch && password.length > 0 && (
              <p id="confirm-password-help" className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Passwords match
              </p>
            )}
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-ash">
              Email{" "}
              <span className="text-smoke">(optional, for recovery only)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="not required"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
          </div>

          {/* Terms */}
          <label
            htmlFor="terms"
            className="flex items-start gap-3 cursor-pointer group"
          >
            <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                aria-required="true"
                className="peer sr-only"
              />
              <div
                className={cn(
                  "h-4 w-4 rounded border transition-colors",
                  termsAccepted
                    ? "border-flame-500 bg-flame-500"
                    : "border-charcoal bg-coal group-hover:border-smoke",
                )}
              >
                {termsAccepted && (
                  <svg
                    className="h-4 w-4 text-white"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-ash leading-relaxed">
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-flame-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-flame-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <Button
            type="submit"
            variant="spark"
            className="w-full gap-2"
            disabled={!canSubmit}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-smoke">
          Already have an account?{" "}
          <Link href="/login" className="text-flame-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
