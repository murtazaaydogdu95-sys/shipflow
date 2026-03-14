"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, FileText, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  users: number;
  projects: number;
  stories: number;
  orgs: number;
}

interface UserEntry {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string;
  isAdmin: boolean;
  createdAt: string;
  _count: { orgMemberships: number };
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (session && !session.user.isAdmin) {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/users?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(console.error);
  }, [page]);

  if (!session?.user?.isAdmin) return null;

  const statCards = [
    { label: "Users", value: stats?.users ?? "...", icon: Users },
    { label: "Projects", value: stats?.projects ?? "...", icon: FolderKanban },
    { label: "Stories", value: stats?.stories ?? "...", icon: FileText },
    { label: "Organizations", value: stats?.orgs ?? "...", icon: Building2 },
  ];

  return (
    <div className="flex-1 p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 py-3">
                {user.image ? (
                  <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {(user.name || user.email || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || "No name"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{user.plan}</span>
                {user.isAdmin && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Admin</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
