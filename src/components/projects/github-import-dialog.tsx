"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Globe, Loader2, Search, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  language: string | null;
  updatedAt: string;
  stargazersCount: number;
}

interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({
  open,
  onOpenChange,
}: GitHubImportDialogProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  const fetchRepos = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/github/repos?page=${pageNum}`);
        if (res.status === 403) {
          const data = await res.json();
          setAuthError(data.error || "GitHub authentication required");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch repos");

        const data: Repo[] = await res.json();
        if (pageNum === 1) {
          setRepos(data);
        } else {
          setRepos((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 30);
      } catch {
        toast.error("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      setPage(1);
      setSearch("");
      setAuthError(null);
      fetchRepos(1);
    }
  }, [open, fetchRepos]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchRepos(next);
  }

  async function handleImport(repo: Repo) {
    setImportingId(repo.id);
    try {
      const res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: repo.fullName,
          cloneUrl: repo.cloneUrl,
          htmlUrl: repo.htmlUrl,
          name: repo.name,
          description: repo.description || undefined,
          language: repo.language || undefined,
        }),
      });

      if (res.status === 409) {
        toast.error("This repository has already been imported");
        return;
      }
      if (res.status === 403) {
        const data = await res.json();
        setAuthError(data.error || "GitHub authentication required");
        return;
      }
      if (!res.ok) throw new Error("Import failed");

      const project = await res.json();
      toast.success(`Imported ${repo.name} successfully!`);
      onOpenChange(false);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to import repository");
    } finally {
      setImportingId(null);
    }
  }

  const filtered = search
    ? repos.filter(
        (r) =>
          r.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (r.description?.toLowerCase().includes(search.toLowerCase()) ??
            false)
      )
    : repos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
        </DialogHeader>

        {authError ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-sm text-muted-foreground text-center">
              {authError}
            </p>
            <Button onClick={() => signIn("github")}>
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] -mx-2 px-2">
              {loading && repos.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  {search ? "No matching repositories" : "No repositories found"}
                </p>
              ) : (
                <div className="space-y-1">
                  {filtered.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {repo.private ? (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">
                            {repo.fullName}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {repo.language && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {repo.language}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importingId !== null}
                        onClick={() => handleImport(repo)}
                      >
                        {importingId === repo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Import"
                        )}
                      </Button>
                    </div>
                  ))}

                  {hasMore && !search && (
                    <div className="pt-2 pb-1">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Load more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
