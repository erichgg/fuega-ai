"use client";

import * as React from "react";
import { Flag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { REPORT_REASONS } from "@/lib/validation/reports";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  commentId?: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ReportDialog({
  open,
  onOpenChange,
  postId,
  commentId,
}: ReportDialogProps) {
  const [reason, setReason] = React.useState<string>("");
  const [details, setDetails] = React.useState("");
  const [state, setState] = React.useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = React.useState("");

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setReason("");
      setDetails("");
      setState("idle");
      setErrorMsg("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || state === "submitting") return;

    setState("submitting");
    setErrorMsg("");

    try {
      await api.post("/api/reports", {
        post_id: postId,
        comment_id: commentId,
        reason,
        details: details.trim() || undefined,
      });
      setState("success");
      // Auto-close after success
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err: unknown) {
      setState("error");
      const apiErr = err as { message?: string; code?: string };
      if (apiErr.code === "DUPLICATE_REPORT") {
        setErrorMsg("You have already reported this content recently.");
      } else if (apiErr.code === "SELF_REPORT") {
        setErrorMsg("You cannot report your own content.");
      } else if (apiErr.code === "RATE_LIMITED") {
        setErrorMsg("Too many reports. Please try again later.");
      } else {
        setErrorMsg(apiErr.message ?? "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-charcoal bg-coal sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Flag className="h-4 w-4 text-flame-400" />
            Report Content
          </DialogTitle>
          <DialogDescription className="text-smoke">
            Help us keep the community safe. Select a reason for your report.
          </DialogDescription>
        </DialogHeader>

        {state === "success" ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle className="h-8 w-8 text-flame-400" />
            <p className="text-sm font-medium text-foreground">Report submitted</p>
            <p className="text-xs text-smoke">Thank you for helping keep the community safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason" className="text-sm text-ash">
                Reason
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  id="report-reason"
                  className="border-charcoal bg-coal text-foreground"
                >
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent className="border-charcoal bg-coal">
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-foreground">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-details" className="text-sm text-ash">
                Details <span className="text-smoke">(optional)</span>
              </Label>
              <Textarea
                id="report-details"
                placeholder="Provide additional context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={2000}
                className="resize-y border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
              />
            </div>

            {state === "error" && errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-smoke hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="spark"
                size="sm"
                disabled={!reason || state === "submitting"}
                className="gap-1.5"
              >
                {state === "submitting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-3.5 w-3.5" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
