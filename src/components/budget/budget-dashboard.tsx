"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Plus, Wallet, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type BudgetPolicy = {
  id: string;
  scope: string;
  scopeId: string | null;
  metric: string;
  window: string;
  amountCents: number;
  warnPercent: number;
  hardStopEnabled: boolean;
  notifyEnabled: boolean;
  createdAt: string;
};

type BudgetStatus = {
  policies: Array<{
    id: string;
    scope: string;
    scopeId: string | null;
    amountCents: number;
    currentSpendCents: number;
    percentUsed: number;
    status: "ok" | "warning" | "exceeded";
  }>;
  allowed: boolean;
};

type BudgetIncident = {
  id: string;
  type: string;
  currentCents: number;
  limitCents: number;
  resolvedAt: string | null;
  createdAt: string;
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  ok: { className: "bg-green-500 text-white", label: "OK" },
  warning: { className: "bg-yellow-500 text-white", label: "Warning" },
  exceeded: { className: "bg-red-500 text-white", label: "Exceeded" },
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BudgetDashboard() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<BudgetPolicy | null>(null);
  const [scope, setScope] = useState<string>("org");
  const [scopeId, setScopeId] = useState("");
  const [window, setWindow] = useState<string>("calendar_month");
  const [amountDollars, setAmountDollars] = useState("");
  const [warnPercent, setWarnPercent] = useState("80");
  const [hardStop, setHardStop] = useState(true);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: policies, mutate: mutatePolicies } = useSWR<BudgetPolicy[]>(
    orgId ? `/api/orgs/${orgId}/budget-policies` : null,
    fetcher
  );

  const { data: budgetStatus } = useSWR<BudgetStatus>(
    orgId ? `/api/orgs/${orgId}/budget-status` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const { data: incidents } = useSWR<BudgetIncident[]>(
    orgId ? `/api/orgs/${orgId}/budget-incidents?active=true` : null,
    fetcher
  );

  function getStatusForPolicy(policyId: string) {
    return budgetStatus?.policies.find((p) => p.id === policyId);
  }

  function resetForm() {
    setScope("org");
    setScopeId("");
    setWindow("calendar_month");
    setAmountDollars("");
    setWarnPercent("80");
    setHardStop(true);
    setNotify(true);
    setEditPolicy(null);
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function handleOpenEdit(policy: BudgetPolicy) {
    setScope(policy.scope);
    setScopeId(policy.scopeId || "");
    setWindow(policy.window);
    setAmountDollars(String(policy.amountCents / 100));
    setWarnPercent(String(policy.warnPercent));
    setHardStop(policy.hardStopEnabled);
    setNotify(policy.notifyEnabled);
    setEditPolicy(policy);
    setCreateOpen(true);
  }

  async function handleSave() {
    if (!orgId) return;
    const cents = Math.round(parseFloat(amountDollars) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const body = {
        scope,
        scopeId: scope !== "org" ? scopeId : undefined,
        window,
        amountCents: cents,
        warnPercent: parseInt(warnPercent) || 80,
        hardStopEnabled: hardStop,
        notifyEnabled: notify,
      };

      const url = editPolicy
        ? `/api/orgs/${orgId}/budget-policies/${editPolicy.id}`
        : `/api/orgs/${orgId}/budget-policies`;
      const method = editPolicy ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save policy");
        return;
      }

      toast.success(editPolicy ? "Policy updated" : "Policy created");
      setCreateOpen(false);
      resetForm();
      await mutatePolicies();
    } catch {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(policyId: string) {
    if (!orgId) return;
    if (!confirm("Delete this budget policy?")) return;

    try {
      const res = await fetch(`/api/orgs/${orgId}/budget-policies/${policyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete policy");
        return;
      }
      toast.success("Policy deleted");
      await mutatePolicies();
    } catch {
      toast.error("Failed to delete policy");
    }
  }

  return (
    <div data-testid="budget-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Policies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set spending limits for agents, projects, and the organization
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="budget-create-btn">
          <Plus className="h-4 w-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Active incidents */}
      {incidents && incidents.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active Incidents
          </h2>
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5"
            >
              <Badge className={incident.type === "hard_stop" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"}>
                {incident.type === "hard_stop" ? "Hard Stop" : "Warning"}
              </Badge>
              <span className="text-sm flex-1">
                Spend: {formatCents(incident.currentCents)} / {formatCents(incident.limitCents)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(incident.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Policies table */}
      {!policies ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No budget policies yet. Create one to set spending limits.</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {policies.map((policy) => {
            const status = getStatusForPolicy(policy.id);
            const statusInfo = STATUS_BADGE[status?.status || "ok"];
            const percentUsed = status?.percentUsed ?? 0;

            return (
              <div
                key={policy.id}
                className="flex items-center gap-4 p-4 group"
                data-testid="budget-policy-row"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm capitalize">{policy.scope}</span>
                    {policy.scopeId && (
                      <span className="text-xs text-muted-foreground truncate">
                        ({policy.scopeId})
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {policy.window === "calendar_month" ? "Monthly" : "Lifetime"}
                    </Badge>
                    {policy.hardStopEnabled && (
                      <Badge variant="destructive" className="text-[10px]">
                        Hard Stop
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(percentUsed, 100)} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {status ? formatCents(status.currentSpendCents) : "$0.00"} / {formatCents(policy.amountCents)}
                    </span>
                  </div>
                </div>

                <span className="text-sm font-medium">
                  {Math.round(percentUsed)}%
                </span>

                <Badge className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(policy)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(policy.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPolicy ? "Edit Budget Policy" : "Create Budget Policy"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editPolicy && (
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger data-testid="budget-scope-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Organization</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope !== "org" && !editPolicy && (
              <div className="space-y-2">
                <Label>Target ID ({scope === "agent" ? "Agent" : "Project"})</Label>
                <Input
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder={`Enter ${scope} ID`}
                  data-testid="budget-scope-id-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Window</Label>
              <Select value={window} onValueChange={setWindow}>
                <SelectTrigger data-testid="budget-window-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar_month">Calendar Month</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Budget Limit ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="e.g. 100.00"
                data-testid="budget-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Warning Threshold (%)</Label>
              <Input
                type="number"
                min="1"
                max="99"
                value={warnPercent}
                onChange={(e) => setWarnPercent(e.target.value)}
                data-testid="budget-warn-input"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Hard Stop (block agents when exceeded)</Label>
              <Switch checked={hardStop} onCheckedChange={setHardStop} data-testid="budget-hardstop-switch" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Notifications</Label>
              <Switch checked={notify} onCheckedChange={setNotify} data-testid="budget-notify-switch" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="budget-save-btn">
              {saving ? "Saving..." : editPolicy ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
