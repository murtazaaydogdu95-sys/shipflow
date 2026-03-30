"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  API_KEY_CREATED: "API Key Created",
  API_KEY_ROTATED: "API Key Rotated",
  API_KEY_REVOKED: "API Key Revoked",
  MEMBER_INVITED: "Member Invited",
  MEMBER_REMOVED: "Member Removed",
  PROJECT_CREATED: "Project Created",
  PROJECT_UPDATED: "Project Updated",
  PROJECT_DELETED: "Project Deleted",
  ORG_UPDATED: "Organization Updated",
  ORG_DELETED: "Organization Deleted",
};

export default function AuditLogPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(`/api/orgs/${orgId}/audit-log?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [orgId, page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex-1 p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Audit Log
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track security-related actions in your organization
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="API_KEY_CREATED">API Key Created</SelectItem>
            <SelectItem value="API_KEY_ROTATED">API Key Rotated</SelectItem>
            <SelectItem value="API_KEY_REVOKED">API Key Revoked</SelectItem>
            <SelectItem value="MEMBER_INVITED">Member Invited</SelectItem>
            <SelectItem value="MEMBER_REMOVED">Member Removed</SelectItem>
            <SelectItem value="PROJECT_CREATED">Project Created</SelectItem>
            <SelectItem value="PROJECT_UPDATED">Project Updated</SelectItem>
            <SelectItem value="PROJECT_DELETED">Project Deleted</SelectItem>
            <SelectItem value="ORG_UPDATED">Org Updated</SelectItem>
            <SelectItem value="ORG_DELETED">Org Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {pagination ? `${pagination.total} entries` : "Loading..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit log entries found.</p>
          ) : (
            <div className="space-y-0 divide-y" data-testid="audit-log-list">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {log.user.name || log.user.email || "Unknown"}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                        {log.details}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.ipAddress && (
                        <span className="text-xs text-muted-foreground">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
