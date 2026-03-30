"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Clock, X } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  orgId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OrgMembersPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const { data: org } = useSWR(orgId ? `/api/orgs/${orgId}` : null, fetcher);
  const { data: members, mutate } = useSWR<Member[]>(
    orgId ? `/api/orgs/${orgId}/members` : null,
    fetcher
  );
  const { data: invites, mutate: mutateInvites } = useSWR<PendingInvite[]>(
    orgId ? `/api/orgs/${orgId}/invites` : null,
    fetcher
  );
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canManage = org?.role === "OWNER" || org?.role === "ADMIN";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to invite member");
        return;
      }
      setEmail("");
      await mutate();
      await mutateInvites();
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!orgId) return;
    await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await mutate();
  }

  async function handleRemove(memberId: string) {
    if (!orgId) return;
    await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
      method: "DELETE",
    });
    await mutate();
  }

  async function handleCancelInvite(inviteId: string) {
    if (!orgId) return;
    await fetch(`/api/orgs/${orgId}/invites?id=${inviteId}`, {
      method: "DELETE",
    });
    await mutateInvites();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization&apos;s team members
        </p>
      </div>

      {canManage && (
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="invite-email"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-[130px]" data-testid="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">Member</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="OWNER">Owner</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading || !email.trim()} data-testid="invite-btn">
            {loading ? "Inviting..." : "Invite"}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {members?.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-4 p-3 rounded-lg border"
            data-testid={`member-row-${(member.user.email || "").replace(/[^a-zA-Z0-9]/g, "-")}`}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback>
                {(member.user.name?.[0] || member.user.email?.[0] || "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.user.name || member.user.email}
              </p>
              {member.user.name && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </p>
              )}
            </div>

            {canManage && member.userId !== session?.user?.id ? (
              <>
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v)}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(member.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Badge variant="secondary">{member.role}</Badge>
            )}
          </div>
        ))}
      </div>

      {canManage && invites && invites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Invitations
          </h2>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-dashed"
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {invite.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{invite.role}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
