"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/contexts/auth-context";
import { api } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------

function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const levels: Array<{ label: string; color: string }> = [
    { label: "Weak", color: "bg-ember-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-yellow-500" },
    { label: "Strong", color: "bg-green-500" },
  ];

  const idx = Math.min(score, 4) - 1;
  if (idx < 0) return { score: 0 as const, label: "Too short", color: "bg-ember-500" };
  const level = levels[idx];
  return {
    score: (idx + 1) as 1 | 2 | 3 | 4,
    label: level?.label ?? "Unknown",
    color: level?.color ?? "bg-charcoal",
  };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= score ? color : "bg-charcoal"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-smoke">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account Settings Page
// ---------------------------------------------------------------------------

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put("/api/settings/account", { currentPassword, newPassword });
      setPasswordMessage({ type: "success", text: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      setPasswordMessage({ type: "error", text: message });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete("/api/settings/account");
      await logout();
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  // Page title
  React.useEffect(() => {
    document.title = "Account Settings - fuega";
  }, []);

  // Auto-dismiss success messages
  React.useEffect(() => {
    if (passwordMessage?.type !== "success") return;
    const timer = setTimeout(() => setPasswordMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [passwordMessage]);

  if (!authLoading && !user) {
    return (
      <div className="py-12 text-center text-sm text-smoke">
        Please <a href="/login" className="text-lava-hot hover:underline">log in</a> to access account settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="terminal-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-ash" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Change Password
          </h2>
        </div>

        <div>
          <Label htmlFor="currentPassword" className="text-xs text-ash">
            Current Password
          </Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground"
            autoComplete="current-password"
          />
        </div>

        <div>
          <Label htmlFor="newPassword" className="text-xs text-ash">
            New Password
          </Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground"
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={newPassword} />
          <p className="text-[10px] text-smoke mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-xs text-ash">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground"
            autoComplete="new-password"
          />
        </div>

        {passwordMessage && (
          <div
            className={`p-3 text-xs border ${
              passwordMessage.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-ember-500/30 bg-ember-500/10 text-ember-400"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="spark"
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            className="gap-2"
          >
            {passwordSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Change Password
          </Button>
        </div>
      </form>

      {/* Delete account */}
      <div className="terminal-card p-4 sm:p-6 space-y-4 border-ember-500/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-ember-400" />
          <h2 className="text-sm font-bold text-ember-400 uppercase tracking-wider">
            Danger Zone
          </h2>
        </div>

        <p className="text-xs text-ash">
          Deleting your account is permanent. Your posts and comments will show{" "}
          <span className="text-ash">[deleted]</span> but cannot be
          attributed back to you.
        </p>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteDialogOpen(true);
              setDeleteConfirm("");
              setDeleteError(null);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-coal border-ember-500/30">
          <DialogHeader>
            <DialogTitle className="text-ember-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription className="text-ash">
              This action is permanent and cannot be undone. Your posts and
              comments will be anonymized.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="deleteConfirmDialog" className="text-xs text-ash">
              Type your username to confirm:{" "}
              <span className="text-ember-400 font-medium">{user?.username}</span>
            </Label>
            <Input
              id="deleteConfirmDialog"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={user?.username}
              className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
              autoComplete="off"
            />
          </div>

          {deleteError && (
            <div className="p-3 text-xs border border-ember-500/30 bg-ember-500/10 text-ember-400">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== user?.username}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
