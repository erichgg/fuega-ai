"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/contexts/auth-context";
import { api } from "@/lib/api/client";

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
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

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
    try {
      await api.delete("/api/settings/account");
      await logout();
      router.push("/");
    } catch {
      // Ignore
    } finally {
      setDeleting(false);
    }
  };

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
          <button
            type="submit"
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-flame-500 text-void hover:bg-flame-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {passwordSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Change Password
          </button>
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

        <div>
          <Label htmlFor="deleteConfirm" className="text-xs text-ash">
            Type your username to confirm:{" "}
            <span className="text-ember-400 font-medium">{user?.username}</span>
          </Label>
          <Input
            id="deleteConfirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={user?.username}
            className="mt-1 bg-charcoal/50 border-charcoal text-foreground placeholder:text-smoke"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== user?.username}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ember-500 text-void hover:bg-ember-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
