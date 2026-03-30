"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";
import { PRIORITIES, STORY_TYPES } from "@/types";

export interface BoardFilterState {
  search: string;
  priorities: string[];
  types: string[];
  labelIds: string[];
  assigneeIds: string[];
  sprintId: string | null;
  agentStatuses: string[];
}

const EMPTY_FILTERS: BoardFilterState = {
  search: "",
  priorities: [],
  types: [],
  labelIds: [],
  assigneeIds: [],
  sprintId: null,
  agentStatuses: [],
};

const AGENT_STATUSES = ["QUEUED", "RUNNING", "COMPLETED", "FAILED"] as const;

interface BoardFiltersProps {
  filters: BoardFilterState;
  onFiltersChange: (filters: BoardFilterState) => void;
  labels: Array<{ id: string; name: string; color: string }>;
  members: Array<{ id: string; name: string | null; image: string | null }>;
  sprints?: Array<{ id: string; name: string; status: string }>;
}

export function BoardFilters({ filters, onFiltersChange, labels, members, sprints }: BoardFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.priorities.length > 0 ||
    filters.types.length > 0 ||
    filters.labelIds.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.sprintId !== null ||
    filters.agentStatuses.length > 0;

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search stories..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 w-48 text-sm"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="filter-priority">
            <Filter className="h-3 w-3" />
            Priority
            {filters.priorities.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">
                {filters.priorities.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PRIORITIES.map((p) => (
            <DropdownMenuCheckboxItem
              key={p}
              checked={filters.priorities.includes(p)}
              onCheckedChange={() =>
                onFiltersChange({ ...filters, priorities: toggleArrayItem(filters.priorities, p) })
              }
            >
              {p}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="filter-type">
            <Filter className="h-3 w-3" />
            Type
            {filters.types.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">
                {filters.types.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STORY_TYPES.map((t) => (
            <DropdownMenuCheckboxItem
              key={t}
              checked={filters.types.includes(t)}
              onCheckedChange={() =>
                onFiltersChange({ ...filters, types: toggleArrayItem(filters.types, t) })
              }
            >
              {t}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {labels.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Filter className="h-3 w-3" />
              Label
              {filters.labelIds.length > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">
                  {filters.labelIds.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {labels.map((l) => (
              <DropdownMenuCheckboxItem
                key={l.id}
                checked={filters.labelIds.includes(l.id)}
                onCheckedChange={() =>
                  onFiltersChange({ ...filters, labelIds: toggleArrayItem(filters.labelIds, l.id) })
                }
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: l.color }}
                />
                {l.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {members.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="filter-assignee">
              <Filter className="h-3 w-3" />
              Assignee
              {filters.assigneeIds.length > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">
                  {filters.assigneeIds.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {members.map((m) => (
              <DropdownMenuCheckboxItem
                key={m.id}
                checked={filters.assigneeIds.includes(m.id)}
                onCheckedChange={() =>
                  onFiltersChange({ ...filters, assigneeIds: toggleArrayItem(filters.assigneeIds, m.id) })
                }
              >
                {m.name || "Unnamed"}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {(sprints?.length ?? 0) > 0 && (
        <Select
          value={filters.sprintId ?? "all"}
          onValueChange={(val) => onFiltersChange({ ...filters, sprintId: val === "all" ? null : val })}
        >
          <SelectTrigger className="h-8 w-auto text-xs gap-1" data-testid="filter-sprint">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {sprints?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="filter-agent-status">
            <Filter className="h-3 w-3" />
            Agent
            {filters.agentStatuses.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">
                {filters.agentStatuses.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {AGENT_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.agentStatuses.includes(status)}
              onCheckedChange={() =>
                onFiltersChange({ ...filters, agentStatuses: toggleArrayItem(filters.agentStatuses, status) })
              }
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          data-testid="filter-clear"
        >
          <X className="mr-1 h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

export { EMPTY_FILTERS };
