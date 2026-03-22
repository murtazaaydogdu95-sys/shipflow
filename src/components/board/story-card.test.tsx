// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StoryCard } from "./story-card";
import type { StoryWithRelations } from "@/types";

afterEach(() => cleanup());

function makeStory(overrides: Partial<StoryWithRelations> = {}): StoryWithRelations {
  return {
    id: "story-1",
    shortId: "CP-001",
    title: "Build login page",
    description: null,
    rawInput: null,
    userStory: null,
    status: "TODO",
    priority: "HIGH",
    type: "feature",
    storyPoints: 5,
    position: 0,
    projectId: "proj-1",
    sprintId: null,
    parentId: null,
    assigneeId: null,
    assignedToAgent: false,
    agentStatus: null,
    agentNotes: null,
    commitHash: null,
    branchName: null,
    previewPort: null,
    previewPid: null,
    reviewScore: null,
    reviewSummary: null,
    reviewIssues: null,
    deployStatus: null,
    deployUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    labels: [],
    acceptanceCriteria: [],
    assignee: null,
    ...overrides,
  } as StoryWithRelations;
}

describe("StoryCard", () => {
  it("renders the story title", () => {
    render(<StoryCard story={makeStory()} />);
    expect(screen.getByText("Build login page")).toBeInTheDocument();
  });

  it("renders the story short ID", () => {
    render(<StoryCard story={makeStory()} />);
    expect(screen.getByText("CP-001")).toBeInTheDocument();
  });

  it("renders the priority badge", () => {
    render(<StoryCard story={makeStory({ priority: "CRITICAL" })} />);
    // Badge shows first letter of priority
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders story points when present", () => {
    render(<StoryCard story={makeStory({ storyPoints: 8 })} />);
    expect(screen.getByText("8 pts")).toBeInTheDocument();
  });

  it("does not render story points when null", () => {
    render(<StoryCard story={makeStory({ storyPoints: null })} />);
    expect(screen.queryByText(/pts$/)).not.toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(<StoryCard story={makeStory()} onClick={onClick} />);
    fireEvent.click(container.querySelector("[data-slot='card']")!);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows type badge for non-feature types", () => {
    render(<StoryCard story={makeStory({ type: "bug" } as Partial<StoryWithRelations>)} />);
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("does not show type badge for feature type", () => {
    render(<StoryCard story={makeStory({ type: "feature" } as Partial<StoryWithRelations>)} />);
    expect(screen.queryByText("feature")).not.toBeInTheDocument();
  });

  it("shows Blocked indicator when story has unresolved blockers", () => {
    const story = makeStory({
      blockedByDeps: [
        { blocker: { id: "s2", shortId: "CP-002", title: "Blocker", status: "TODO" } },
      ],
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("does not show Blocked when all blockers are DONE", () => {
    const story = makeStory({
      blockedByDeps: [
        { blocker: { id: "s2", shortId: "CP-002", title: "Resolved", status: "DONE" } },
      ],
    });
    render(<StoryCard story={story} />);
    expect(screen.queryByText("Blocked")).not.toBeInTheDocument();
  });

  it("shows epic child count when story has children", () => {
    const story = makeStory({
      children: [
        { id: "c1", shortId: "CP-010", title: "Child 1", status: "TODO" },
        { id: "c2", shortId: "CP-011", title: "Child 2", status: "DONE" },
      ],
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows acceptance criteria progress bar", () => {
    const story = makeStory({
      acceptanceCriteria: [
        { id: "ac1", storyId: "s1", given: "g", when: "w", then: "t", completed: true, createdAt: new Date() },
        { id: "ac2", storyId: "s1", given: "g", when: "w", then: "t", completed: false, createdAt: new Date() },
        { id: "ac3", storyId: "s1", given: "g", when: "w", then: "t", completed: true, createdAt: new Date() },
      ] as StoryWithRelations["acceptanceCriteria"],
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("does not show AC progress when no criteria exist", () => {
    render(<StoryCard story={makeStory({ acceptanceCriteria: [] })} />);
    // The "5 pts" text contains no "/" pattern, but to be safe, check there's no "x/y" ratio
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("renders agent status when assigned to agent", () => {
    render(
      <StoryCard
        story={makeStory({ assignedToAgent: true, agentStatus: "RUNNING" })}
      />
    );
    expect(screen.getByText("Working...")).toBeInTheDocument();
  });

  it("renders agent queued status", () => {
    render(
      <StoryCard
        story={makeStory({ assignedToAgent: true, agentStatus: "QUEUED" })}
      />
    );
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("renders agent failed status", () => {
    render(
      <StoryCard
        story={makeStory({ assignedToAgent: true, agentStatus: "FAILED" })}
      />
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows label badges (max 2 visible)", () => {
    const story = makeStory({
      labels: [
        { label: { id: "l1", name: "frontend", color: "#blue" }, labelId: "l1", storyId: "s1" },
        { label: { id: "l2", name: "urgent", color: "#red" }, labelId: "l2", storyId: "s1" },
        { label: { id: "l3", name: "backend", color: "#green" }, labelId: "l3", storyId: "s1" },
      ] as StoryWithRelations["labels"],
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows delete button on hover when onDelete is provided", () => {
    const onDelete = vi.fn();
    render(<StoryCard story={makeStory()} onDelete={onDelete} />);
    const deleteButton = screen.getByTitle("Delete story");
    expect(deleteButton).toBeInTheDocument();
  });

  it("calls onDelete with story id", () => {
    const onDelete = vi.fn();
    render(<StoryCard story={makeStory()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete story"));
    expect(onDelete).toHaveBeenCalledWith("story-1");
  });

  it("applies selected ring when isSelected is true", () => {
    const { container } = render(<StoryCard story={makeStory()} isSelected />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("ring-2");
  });

  it("shows assignee avatar when present", () => {
    const story = makeStory({
      assignee: { id: "u1", name: "Alice", image: null },
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows Preview Live when in REVIEW with previewPort", () => {
    const story = makeStory({
      status: "REVIEW",
      previewPort: 3001,
    });
    render(<StoryCard story={story} />);
    expect(screen.getByText("Preview Live")).toBeInTheDocument();
  });
});
