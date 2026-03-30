"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { ShieldCheck, Check, X, RotateCcw, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ApprovalComment = {
  id: string;
  content: string;
  userId: string;
  user?: { name: string | null };
  createdAt: string;
};

type Approval = {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  requestedById: string;
  requestedBy?: { name: string | null; email: string | null };
  decidedById: string | null;
  decidedBy?: { name: string | null } | null;
  decidedAt: string | null;
  comments?: ApprovalComment[];
  createdAt: string;
  updatedAt: string;
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-yellow-500 text-white", label: "Pending" },
  approved: { className: "bg-green-500 text-white", label: "Approved" },
  rejected: { className: "bg-red-500 text-white", label: "Rejected" },
  revision_requested: { className: "bg-orange-500 text-white", label: "Revision" },
};

const TYPE_BADGE: Record<string, string> = {
  hire_agent: "Agent Hire",
  budget_override: "Budget Override",
};

function formatPayloadSummary(type: string, payload: Record<string, unknown>): string {
  if (type === "hire_agent") {
    const name = payload.agentName || "unnamed";
    const role = payload.agentRole || "coder";
    return `New ${role} agent: ${name}`;
  }
  if (type === "budget_override") {
    const reason = payload.reason || "No reason provided";
    const amount = payload.requestedAmountCents;
    if (amount) return `Override $${(Number(amount) / 100).toFixed(2)} — ${reason}`;
    return String(reason);
  }
  return JSON.stringify(payload).slice(0, 100);
}

export function ApprovalList() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: approvals, mutate } = useSWR<Approval[]>(
    orgId
      ? `/api/orgs/${orgId}/approvals${filter !== "all" ? `?status=${filter}` : ""}`
      : null,
    fetcher
  );

  async function handleDecision(approvalId: string, status: "approved" | "rejected" | "revision_requested") {
    if (!orgId) return;
    if ((status === "rejected" || status === "revision_requested") && !comment.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setActionLoading(approvalId);
    try {
      const res = await fetch(`/api/orgs/${orgId}/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update approval");
        return;
      }

      toast.success(
        status === "approved" ? "Approved" :
        status === "rejected" ? "Rejected" :
        "Revision requested"
      );
      setComment("");
      await mutate();
    } catch {
      toast.error("Failed to update approval");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddComment(approvalId: string) {
    if (!orgId || !comment.trim()) return;

    try {
      const res = await fetch(`/api/orgs/${orgId}/approvals/${approvalId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });

      if (!res.ok) {
        toast.error("Failed to add comment");
        return;
      }

      toast.success("Comment added");
      setComment("");
      await mutate();
    } catch {
      toast.error("Failed to add comment");
    }
  }

  return (
    <div data-testid="approval-list">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage approval requests
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40" data-testid="approval-filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="revision_requested">Revision</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!approvals ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No approvals found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const statusInfo = STATUS_BADGE[approval.status] || STATUS_BADGE.pending;
            const isExpanded = expandedId === approval.id;
            const isPending = approval.status === "pending";

            return (
              <div
                key={approval.id}
                className="border rounded-lg"
                data-testid="approval-card"
              >
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_BADGE[approval.type] || approval.type}
                      </Badge>
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">
                      {formatPayloadSummary(approval.type, approval.payload)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested by {approval.requestedBy?.name || approval.requestedBy?.email || "Unknown"} on{" "}
                      {new Date(approval.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {approval.comments && approval.comments.length > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span className="text-xs">{approval.comments.length}</span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Full payload */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Request Details</h4>
                      <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-40">
                        {JSON.stringify(approval.payload, null, 2)}
                      </pre>
                    </div>

                    {/* Comments thread */}
                    {approval.comments && approval.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Comments</h4>
                        <div className="space-y-2">
                          {approval.comments.map((c) => (
                            <div key={c.id} className="text-sm bg-muted/50 rounded p-2">
                              <span className="font-medium">{c.user?.name || "Unknown"}: </span>
                              {c.content}
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comment input */}
                    <div className="space-y-2">
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={isPending ? "Add a comment or provide reason for decision..." : "Add a comment..."}
                        className="min-h-[60px]"
                        data-testid="approval-comment-input"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddComment(approval.id)}
                          disabled={!comment.trim()}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Comment
                        </Button>
                      </div>
                    </div>

                    {/* Action buttons for pending approvals */}
                    {isPending && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleDecision(approval.id, "approved")}
                          disabled={actionLoading === approval.id}
                          data-testid="approval-approve-btn"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDecision(approval.id, "rejected")}
                          disabled={actionLoading === approval.id || !comment.trim()}
                          data-testid="approval-reject-btn"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleDecision(approval.id, "revision_requested")}
                          disabled={actionLoading === approval.id || !comment.trim()}
                          data-testid="approval-revision-btn"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Request Revision
                        </Button>
                      </div>
                    )}

                    {/* Decision info */}
                    {approval.decidedBy && approval.decidedAt && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        Decided by {approval.decidedBy.name || "Unknown"} on{" "}
                        {new Date(approval.decidedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
