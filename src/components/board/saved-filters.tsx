"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bookmark, Star, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { BoardFilterState } from "./board-filters";
import { EMPTY_FILTERS } from "./board-filters";

interface SavedFilter {
  id: string;
  name: string;
  filters: BoardFilterState;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SavedFiltersProps {
  projectId: string;
  currentFilters: BoardFilterState;
  onApplyFilter: (filters: BoardFilterState) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function filtersMatch(a: BoardFilterState, b: BoardFilterState): boolean {
  return (
    a.search === b.search &&
    JSON.stringify(a.priorities.slice().sort()) === JSON.stringify((b.priorities || []).slice().sort()) &&
    JSON.stringify(a.types.slice().sort()) === JSON.stringify((b.types || []).slice().sort()) &&
    JSON.stringify(a.labelIds.slice().sort()) === JSON.stringify((b.labelIds || []).slice().sort()) &&
    JSON.stringify(a.assigneeIds.slice().sort()) === JSON.stringify((b.assigneeIds || []).slice().sort()) &&
    (a.sprintId ?? null) === (b.sprintId ?? null) &&
    JSON.stringify((a.agentStatuses || []).slice().sort()) === JSON.stringify((b.agentStatuses || []).slice().sort())
  );
}

function isEmptyFilter(f: BoardFilterState): boolean {
  return filtersMatch(f, EMPTY_FILTERS);
}

export function SavedFilters({ projectId, currentFilters, onApplyFilter }: SavedFiltersProps) {
  const { data: savedFilters, mutate } = useSWR<SavedFilter[]>(
    `/api/projects/${projectId}/saved-filters`,
    fetcher
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [filterName, setFilterName] = useState("");
  const [saving, setSaving] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);

  // Auto-apply default filter on load
  useEffect(() => {
    if (defaultApplied || !savedFilters) return;
    const defaultFilter = savedFilters.find((f) => f.isDefault);
    if (defaultFilter && isEmptyFilter(currentFilters)) {
      onApplyFilter(normalizeFilter(defaultFilter.filters));
    }
    setDefaultApplied(true);
  }, [savedFilters, defaultApplied, currentFilters, onApplyFilter]);

  // Find the active saved filter that matches current filters
  const activeFilter = savedFilters?.find((f) => filtersMatch(currentFilters, normalizeFilter(f.filters)));
  const hasActiveFilters = !isEmptyFilter(currentFilters);

  const handleSave = useCallback(async () => {
    if (!filterName.trim()) return;
    setSaving(true);
    try {
      if (editingFilter) {
        const res = await fetch(
          `/api/projects/${projectId}/saved-filters/${editingFilter.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: filterName.trim() }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update");
        }
        toast.success("Filter updated");
      } else {
        const res = await fetch(`/api/projects/${projectId}/saved-filters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: filterName.trim(),
            filters: {
              search: currentFilters.search || undefined,
              priorities: currentFilters.priorities.length > 0 ? currentFilters.priorities : undefined,
              types: currentFilters.types.length > 0 ? currentFilters.types : undefined,
              labelIds: currentFilters.labelIds.length > 0 ? currentFilters.labelIds : undefined,
              assigneeIds: currentFilters.assigneeIds.length > 0 ? currentFilters.assigneeIds : undefined,
              sprintId: currentFilters.sprintId || undefined,
              agentStatuses: currentFilters.agentStatuses.length > 0 ? currentFilters.agentStatuses : undefined,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save");
        }
        toast.success("Filter saved");
      }
      mutate();
      setSaveDialogOpen(false);
      setEditingFilter(null);
      setFilterName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save filter");
    } finally {
      setSaving(false);
    }
  }, [filterName, editingFilter, projectId, currentFilters, mutate]);

  async function handleToggleDefault(filter: SavedFilter) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/saved-filters/${filter.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: !filter.isDefault }),
        }
      );
      if (!res.ok) throw new Error();
      mutate();
      toast.success(filter.isDefault ? "Default removed" : "Set as default");
    } catch {
      toast.error("Failed to update filter");
    }
  }

  async function handleDelete(filter: SavedFilter) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/saved-filters/${filter.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      mutate();
      toast.success("Filter deleted");
    } catch {
      toast.error("Failed to delete filter");
    }
  }

  function handleEdit(filter: SavedFilter) {
    setEditingFilter(filter);
    setFilterName(filter.name);
    setSaveDialogOpen(true);
  }

  function handleOpenSaveDialog() {
    setEditingFilter(null);
    setFilterName("");
    setSaveDialogOpen(true);
  }

  const filterCount = savedFilters?.length ?? 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Bookmark className="h-3 w-3" />
            Views
            {activeFilter && !isEmptyFilter(currentFilters) && (
              <span className="ml-1 max-w-[80px] truncate text-[10px] text-muted-foreground">
                {activeFilter.name}
              </span>
            )}
            {hasActiveFilters && !activeFilter && (
              <span className="ml-1 text-[10px] text-muted-foreground">Custom</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {filterCount > 0 && (
            <>
              <DropdownMenuLabel className="text-xs">Saved Views</DropdownMenuLabel>
              {savedFilters!.map((sf) => (
                <DropdownMenuItem
                  key={sf.id}
                  className="flex items-center gap-2 group"
                  onSelect={(e) => {
                    e.preventDefault();
                    onApplyFilter(normalizeFilter(sf.filters));
                  }}
                >
                  {sf.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                  <span className="flex-1 truncate">{sf.name}</span>
                  <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      className="p-0.5 hover:text-foreground text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDefault(sf);
                      }}
                      title={sf.isDefault ? "Remove default" : "Set as default"}
                    >
                      <Star className={`h-3 w-3 ${sf.isDefault ? "text-yellow-500 fill-yellow-500" : ""}`} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 hover:text-foreground text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(sf);
                      }}
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 hover:text-destructive text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(sf);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            disabled={!hasActiveFilters}
            onSelect={(e) => {
              e.preventDefault();
              handleOpenSaveDialog();
            }}
            data-testid="filter-save"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Save current filter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{editingFilter ? "Rename View" : "Save View"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. My bugs, High priority..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
              maxLength={50}
              data-testid="filter-name-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !filterName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Normalize a saved filter's JSON into a full BoardFilterState with defaults */
function normalizeFilter(f: Partial<BoardFilterState>): BoardFilterState {
  return {
    search: f.search ?? "",
    priorities: f.priorities ?? [],
    types: f.types ?? [],
    labelIds: f.labelIds ?? [],
    assigneeIds: f.assigneeIds ?? [],
    sprintId: f.sprintId ?? null,
    agentStatuses: f.agentStatuses ?? [],
  };
}
