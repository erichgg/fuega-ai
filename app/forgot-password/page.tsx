"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";
import { api, ApiError } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/">
            <FlameLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ash">
            Reset your account password
          </p>
        </div>

        <div className="terminal-card mt-8 p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-10 w-10 text-flame-400 mx-auto" />
              <h1 className="text-xl font-bold text-foreground glow-text-subtle">
                <span className="text-lava-hot font-bold">$ </span>
                check your inbox
              </h1>
              <p className="text-sm text-ash">
                If an account exists for{" "}
                <span className="text-foreground">{email}</span>, you will
                receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="text-xs text-flame-400 hover:text-flame-400/80 transition-colors block"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs text-smoke hover:text-ash transition-colors mb-4"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to login
              </Link>

              <h1 className="text-xl font-bold text-foreground glow-text-subtle mb-1">
                <span className="text-lava-hot font-bold">$ </span>
                forgot password
              </h1>
              <p className="text-xs text-smoke mb-6">
                Enter your email and we will send a reset link.
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
                  <Label htmlFor="email" className="text-ash">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="email"
                    autoFocus
                    className="border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
                  />
                </div>

                <Button
                  type="submit"
                  variant="spark"
                  className="w-full gap-2"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-smoke">
                Remember your password?{" "}
                <Link href="/login" className="text-flame-400 hover:underline">
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
