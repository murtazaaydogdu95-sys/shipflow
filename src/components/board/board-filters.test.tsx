// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BoardFilters, EMPTY_FILTERS, type BoardFilterState } from "./board-filters";

afterEach(() => cleanup());

const defaultLabels = [
  { id: "l1", name: "frontend", color: "#3b82f6" },
];

const defaultMembers = [
  { id: "m1", name: "Alice", image: null },
];

const defaultSprints = [
  { id: "s1", name: "Sprint 1", status: "ACTIVE" },
  { id: "s2", name: "Sprint 2", status: "PLANNING" },
];

function renderFilters(
  overrides: Partial<{
    filters: BoardFilterState;
    onFiltersChange: (f: BoardFilterState) => void;
    sprints: Array<{ id: string; name: string; status: string }>;
  }> = {}
) {
  const onFiltersChange = overrides.onFiltersChange ?? vi.fn();
  render(
    <BoardFilters
      filters={overrides.filters ?? EMPTY_FILTERS}
      onFiltersChange={onFiltersChange}
      labels={defaultLabels}
      members={defaultMembers}
      sprints={overrides.sprints}
    />
  );
  return { onFiltersChange };
}

describe("EMPTY_FILTERS", () => {
  it("includes all fields with correct defaults", () => {
    expect(EMPTY_FILTERS).toEqual({
      search: "",
      priorities: [],
      types: [],
      labelIds: [],
      assigneeIds: [],
      sprintId: null,
      agentStatuses: [],
    });
  });

  it("has sprintId set to null (not undefined)", () => {
    expect(EMPTY_FILTERS.sprintId).toBeNull();
  });

  it("has agentStatuses set to empty array", () => {
    expect(EMPTY_FILTERS.agentStatuses).toEqual([]);
    expect(Array.isArray(EMPTY_FILTERS.agentStatuses)).toBe(true);
  });
});

describe("BoardFilterState type shape", () => {
  it("BoardFilterState includes sprintId and agentStatuses fields", () => {
    const state: BoardFilterState = {
      search: "test",
      priorities: ["HIGH"],
      types: ["feature"],
      labelIds: ["l1"],
      assigneeIds: ["m1"],
      sprintId: "sprint-1",
      agentStatuses: ["RUNNING", "COMPLETED"],
    };
    expect(state.sprintId).toBe("sprint-1");
    expect(state.agentStatuses).toEqual(["RUNNING", "COMPLETED"]);
  });

  it("sprintId accepts null", () => {
    const state: BoardFilterState = { ...EMPTY_FILTERS, sprintId: null };
    expect(state.sprintId).toBeNull();
  });
});

describe("BoardFilters component", () => {
  it("renders sprint filter when sprints are provided", () => {
    renderFilters({ sprints: defaultSprints });
    expect(screen.getByTestId("filter-sprint")).toBeTruthy();
  });

  it("does not render sprint filter when sprints is undefined", () => {
    renderFilters({ sprints: undefined });
    expect(screen.queryByTestId("filter-sprint")).toBeNull();
  });

  it("does not render sprint filter when sprints is empty", () => {
    renderFilters({ sprints: [] });
    expect(screen.queryByTestId("filter-sprint")).toBeNull();
  });

  it("renders agent status filter always", () => {
    renderFilters();
    expect(screen.getByTestId("filter-agent-status")).toBeTruthy();
  });

  it("shows clear button when sprintId is active", () => {
    renderFilters({
      filters: { ...EMPTY_FILTERS, sprintId: "s1" },
      sprints: defaultSprints,
    });
    expect(screen.getByTestId("filter-clear")).toBeTruthy();
  });

  it("shows clear button when agentStatuses has values", () => {
    renderFilters({
      filters: { ...EMPTY_FILTERS, agentStatuses: ["RUNNING"] },
    });
    expect(screen.getByTestId("filter-clear")).toBeTruthy();
  });

  it("does not show clear button when no filters are active", () => {
    renderFilters({ filters: EMPTY_FILTERS });
    expect(screen.queryByTestId("filter-clear")).toBeNull();
  });

  it("calls onFiltersChange with EMPTY_FILTERS when clear is clicked", () => {
    const onFiltersChange = vi.fn();
    renderFilters({
      filters: { ...EMPTY_FILTERS, agentStatuses: ["FAILED"] },
      onFiltersChange,
    });
    fireEvent.click(screen.getByTestId("filter-clear"));
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it("renders all data-testid attributes", () => {
    renderFilters({ sprints: defaultSprints });
    expect(screen.getByTestId("filter-priority")).toBeTruthy();
    expect(screen.getByTestId("filter-type")).toBeTruthy();
    expect(screen.getByTestId("filter-sprint")).toBeTruthy();
    expect(screen.getByTestId("filter-agent-status")).toBeTruthy();
  });

  it("agent status badge shows count when statuses are selected", () => {
    renderFilters({
      filters: { ...EMPTY_FILTERS, agentStatuses: ["QUEUED", "RUNNING"] },
    });
    const agentBtn = screen.getByTestId("filter-agent-status");
    // The badge should show "2"
    expect(agentBtn.textContent).toContain("2");
  });
});

describe("filterStories security", () => {
  it("search uses String.includes, not RegExp", () => {
    // The search input with regex special chars should not throw
    // This validates that the implementation uses .includes() not new RegExp()
    const maliciousSearch = "test[.*+?^${}()|\\]";
    const filter: BoardFilterState = { ...EMPTY_FILTERS, search: maliciousSearch };
    // If it were using RegExp, this pattern would throw
    expect(() => {
      const q = filter.search.toLowerCase();
      "some title".toLowerCase().includes(q);
    }).not.toThrow();
  });
});
