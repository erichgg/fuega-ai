"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlameLogo } from "@/components/fuega/flame-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Stub: simulate a short delay then show confirmation
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
                Back to login →
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground glow-text-subtle mb-1">
                <span className="text-lava-hot font-bold">$ </span>
                forgot password
              </h1>
              <p className="text-xs text-smoke mb-6">
                Enter your email and we will send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
