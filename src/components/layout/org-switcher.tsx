"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  isPersonal?: boolean;
  _count: { members: number; projects: number };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function OrgSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { data: orgs, mutate } = useSWR<Org[]>(
    session?.user?.id ? "/api/orgs" : null,
    fetcher
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [loading, setLoading] = useState(false);

  const currentOrg = orgs?.find((o) => o.id === session?.user?.orgId);

  async function handleSwitch(orgId: string) {
    if (orgId === session?.user?.orgId) return;
    await fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    await update(); // Refresh JWT with new orgId
    router.refresh();
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      if (res.ok) {
        await mutate();
        await update();
        setShowCreate(false);
        setNewOrgName("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!orgs) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]" data-testid="org-switcher">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm">{currentOrg?.name ?? "Select org"}</span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className="gap-2"
              data-testid={`org-switcher-item-${org.slug}`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{org.name}</span>
              {org.isPersonal && (
                <span className="text-[10px] text-muted-foreground">(Personal)</span>
              )}
              {org.id === session?.user?.orgId && (
                <Check className="h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-4"
          >
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !newOrgName.trim()}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
