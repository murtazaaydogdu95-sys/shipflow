"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toLocalDatetimeString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OrgSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const orgId = session?.user?.orgId;
  const { data: org, mutate } = useSWR(
    orgId ? `/api/orgs/${orgId}` : null,
    fetcher
  );
  const [name, setName] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [launchDateInitialized, setLaunchDateInitialized] = useState(false);
  const [savingLaunchDate, setSavingLaunchDate] = useState(false);
  const [launchDateError, setLaunchDateError] = useState("");
  const [launchDateSuccess, setLaunchDateSuccess] = useState("");
  const [issuePrefix, setIssuePrefix] = useState("");
  const [issuePrefixInitialized, setIssuePrefixInitialized] = useState(false);
  const [savingIssuePrefix, setSavingIssuePrefix] = useState(false);
  const [issuePrefixError, setIssuePrefixError] = useState("");
  const [issuePrefixSuccess, setIssuePrefixSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = org?.role === "OWNER";

  // Initialize name when org loads
  if (org && !name && org.name) {
    setName(org.name);
  }

  // Initialize issue prefix when org loads
  if (org && !issuePrefixInitialized) {
    if (org.issuePrefix) {
      setIssuePrefix(org.issuePrefix);
    }
    setIssuePrefixInitialized(true);
  }

  // Initialize launch date when org loads
  if (org && !launchDateInitialized) {
    if (org.launchDate) {
      setLaunchDate(toLocalDatetimeString(org.launchDate));
    }
    setLaunchDateInitialized(true);
  }

  async function handleSaveIssuePrefix() {
    if (!orgId) return;
    setIssuePrefixError("");
    setIssuePrefixSuccess("");

    const trimmed = issuePrefix.trim().toUpperCase();
    if (!trimmed) {
      setIssuePrefixError("Issue prefix is required");
      return;
    }
    if (!/^[A-Z0-9]{2,4}$/.test(trimmed)) {
      setIssuePrefixError("Prefix must be 2-4 uppercase alphanumeric characters");
      return;
    }

    setSavingIssuePrefix(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuePrefix: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setIssuePrefixError(data.error || "Failed to save issue prefix");
        return;
      }
      setIssuePrefix(trimmed);
      await mutate();
      setIssuePrefixSuccess("Issue prefix saved successfully.");
    } finally {
      setSavingIssuePrefix(false);
    }
  }

  async function handleSaveLaunchDate() {
    if (!orgId) return;
    setLaunchDateError("");
    setLaunchDateSuccess("");

    if (!launchDate) {
      setLaunchDateError("Please select a date and time");
      return;
    }

    const d = new Date(launchDate);
    if (isNaN(d.getTime())) {
      setLaunchDateError("Invalid date format");
      return;
    }
    if (d.getTime() < Date.now()) {
      setLaunchDateError("Launch date must be in the future");
      return;
    }

    setSavingLaunchDate(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchDate: d.toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLaunchDateError(data.error || "Failed to save launch date");
        return;
      }
      await mutate();
      setLaunchDateSuccess("Launch date saved. Email notifications sent to the team.");
    } finally {
      setSavingLaunchDate(false);
    }
  }

  async function handleSave() {
    if (!orgId || !name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!orgId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!org) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization&apos;s settings
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
            data-testid="org-name-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={org.slug} disabled />
        </div>

        <div className="space-y-2">
          <Label>Plan</Label>
          <Input value={org.plan} disabled />
        </div>

        {isOwner && (
          <Button onClick={handleSave} disabled={saving || !name.trim()} data-testid="org-save-btn">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {isOwner && (
        <div className="border-t pt-8 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Issue Numbering</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set a prefix for story identifiers (e.g., CP for CP-001, CP-002).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-prefix">Issue Prefix</Label>
            <Input
              id="issue-prefix"
              value={issuePrefix}
              onChange={(e) => {
                setIssuePrefix(e.target.value.toUpperCase());
                setIssuePrefixError("");
                setIssuePrefixSuccess("");
              }}
              placeholder="e.g. CP"
              maxLength={4}
              data-testid="org-issue-prefix"
            />
            {issuePrefixError && (
              <p className="text-sm text-destructive">{issuePrefixError}</p>
            )}
            {issuePrefixSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{issuePrefixSuccess}</p>
            )}
          </div>

          <Button
            onClick={handleSaveIssuePrefix}
            disabled={savingIssuePrefix || !issuePrefix.trim()}
            data-testid="issue-prefix-save-btn"
          >
            {savingIssuePrefix ? "Saving..." : "Save Issue Prefix"}
          </Button>
        </div>
      )}

      {isOwner && (
        <div className="border-t pt-8 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Launch Date & Time</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure when your product launches. An email notification will be sent to all team members when updated.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="launch-date">Launch Date & Time</Label>
            <Input
              id="launch-date"
              type="datetime-local"
              value={launchDate}
              onChange={(e) => {
                setLaunchDate(e.target.value);
                setLaunchDateError("");
                setLaunchDateSuccess("");
              }}
              data-testid="launch-date-input"
            />
            {launchDateError && (
              <p className="text-sm text-destructive">{launchDateError}</p>
            )}
            {launchDateSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{launchDateSuccess}</p>
            )}
          </div>

          <Button
            onClick={handleSaveLaunchDate}
            disabled={savingLaunchDate || !launchDate}
            data-testid="launch-date-save-btn"
          >
            {savingLaunchDate ? "Saving..." : "Save Launch Date"}
          </Button>
        </div>
      )}

      {isOwner && (
        <div className="border-t pt-8 space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting} data-testid="org-delete-btn">
                Delete Organization
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the organization, all its projects,
                  stories, and data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete Organization
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
