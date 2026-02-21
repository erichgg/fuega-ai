"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, AlertCircle, Loader2, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";
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
  const [email, setEmail] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const usernameError = username.length > 0 ? validateUsername(username) : null;
  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const passwordValid = password.length >= 8;

  React.useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const canSubmit =
    username.length >= 3 &&
    !usernameError &&
    passwordValid &&
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash-400">
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
            <Label htmlFor="username" className="text-ash-300">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="choose_a_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              maxLength={20}
              className={cn(
                "border-ash-800 bg-ash-900 placeholder:text-ash-600 focus-visible:ring-flame-500/50",
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
              <p id="username-help" className="text-xs text-ash-600">
                3-20 characters, letters, numbers, and underscores
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-ash-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="8+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="border-ash-800 bg-ash-900 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
              aria-describedby="password-strength"
            />
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
                          : "bg-ash-800",
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

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-ash-300">
              Email{" "}
              <span className="text-ash-600">(optional, for recovery only)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="not required"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="border-ash-800 bg-ash-900 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ash-700 bg-ash-900 text-flame-500 focus:ring-flame-500/50"
              required
            />
            <Label htmlFor="terms" className="text-xs text-ash-400 leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-flame-400 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-flame-400 hover:underline">
                Privacy Policy
              </Link>
            </Label>
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
              <Flame className="h-4 w-4" />
            )}
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ash-500">
          Already have an account?{" "}
          <Link href="/login" className="text-flame-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
