import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

export async function seedTestDb() {
  // Clean existing data in dependency order
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.storyDependency.deleteMany();
  await prisma.acceptanceCriterion.deleteMany();
  await prisma.storyLabel.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.story.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.label.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const user = await prisma.user.create({
    data: {
      id: "test-user-id",
      name: "Test User",
      email: "test@codepylot.dev",
      passwordHash: hashSync("testpassword123", 10),
      isAdmin: false,
      onboardingCompleted: true,
    },
  });

  // Create test org
  const org = await prisma.organization.create({
    data: {
      id: "test-org-id",
      name: "Test Workspace",
      slug: "test-workspace",
      plan: "PRO",
      isPersonal: true,
    },
  });

  await prisma.orgMember.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "OWNER",
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentOrgId: org.id },
  });

  // Create test project
  const project = await prisma.project.create({
    data: {
      id: "test-project-id",
      name: "Test Project",
      slug: "test-project",
      description: "A test project for E2E testing",
      techStack: "Next.js, TypeScript, Prisma",
      orgId: org.id,
      aiProvider: "ollama",
      agentAutoAssign: false,
    },
  });

  await prisma.projectMember.create({
    data: {
      userId: user.id,
      projectId: project.id,
      role: "OWNER",
    },
  });

  // Create labels
  const labelFrontend = await prisma.label.create({
    data: { id: "label-frontend", name: "frontend", color: "#3b82f6", projectId: project.id },
  });
  const labelBackend = await prisma.label.create({
    data: { id: "label-backend", name: "backend", color: "#10b981", projectId: project.id },
  });
  await prisma.label.create({
    data: { id: "label-urgent", name: "urgent", color: "#ef4444", projectId: project.id },
  });

  // Create stories across all statuses
  const stories = [
    {
      id: "story-icebox-1",
      shortId: "SF-001",
      title: "Explore WebSocket integration",
      status: "ICEBOX",
      priority: "LOW",
      type: "feature",
      position: 0,
    },
    {
      id: "story-backlog-1",
      shortId: "SF-002",
      title: "Add dark mode toggle",
      status: "BACKLOG",
      priority: "MEDIUM",
      type: "feature",
      storyPoints: 3,
      position: 0,
    },
    {
      id: "story-backlog-2",
      shortId: "SF-003",
      title: "Fix mobile responsive layout",
      status: "BACKLOG",
      priority: "HIGH",
      type: "bug",
      storyPoints: 2,
      position: 1,
    },
    {
      id: "story-todo-1",
      shortId: "SF-004",
      title: "Implement user settings page",
      description: "Create a settings page where users can manage their profile",
      status: "TODO",
      priority: "HIGH",
      type: "feature",
      storyPoints: 5,
      position: 0,
    },
    {
      id: "story-todo-2",
      shortId: "SF-005",
      title: "Add input validation for forms",
      status: "TODO",
      priority: "MEDIUM",
      type: "chore",
      storyPoints: 3,
      position: 1,
    },
    {
      id: "story-inprogress-1",
      shortId: "SF-006",
      title: "Build notification system",
      status: "IN_PROGRESS",
      priority: "HIGH",
      type: "feature",
      storyPoints: 8,
      position: 0,
      assigneeId: user.id,
    },
    {
      id: "story-review-1",
      shortId: "SF-007",
      title: "Implement search functionality",
      status: "REVIEW",
      priority: "CRITICAL",
      type: "feature",
      storyPoints: 5,
      position: 0,
      assignedToAgent: true,
      agentStatus: "COMPLETED",
      branchName: "feat/SF-007-search",
      commitHash: "abc1234",
    },
    {
      id: "story-done-1",
      shortId: "SF-008",
      title: "Setup project scaffolding",
      status: "DONE",
      priority: "HIGH",
      type: "chore",
      storyPoints: 2,
      position: 0,
    },
    {
      id: "story-done-2",
      shortId: "SF-009",
      title: "Configure CI/CD pipeline",
      status: "DONE",
      priority: "MEDIUM",
      type: "chore",
      storyPoints: 3,
      position: 1,
    },
  ];

  for (const story of stories) {
    await prisma.story.create({
      data: { ...story, projectId: project.id },
    });
  }

  // Add labels to stories
  await prisma.storyLabel.create({
    data: { storyId: "story-todo-1", labelId: labelFrontend.id },
  });
  await prisma.storyLabel.create({
    data: { storyId: "story-inprogress-1", labelId: labelBackend.id },
  });

  // Add acceptance criteria to story-todo-1
  await prisma.acceptanceCriterion.create({
    data: {
      storyId: "story-todo-1",
      given: "I am a logged-in user",
      when: "I navigate to the settings page",
      then: "I should see my profile information",
      position: 0,
    },
  });
  await prisma.acceptanceCriterion.create({
    data: {
      storyId: "story-todo-1",
      given: "I am on the settings page",
      when: "I update my name and click save",
      then: "my profile should be updated",
      position: 1,
    },
  });

  // Add a comment to story-todo-1
  await prisma.comment.create({
    data: {
      id: "comment-1",
      content: "This should follow the existing UI patterns.",
      storyId: "story-todo-1",
      userId: user.id,
    },
  });

  // Create sprints
  await prisma.sprint.create({
    data: {
      id: "sprint-active",
      name: "Sprint 1",
      goal: "Complete core features",
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      projectId: project.id,
    },
  });

  await prisma.sprint.create({
    data: {
      id: "sprint-planning",
      name: "Sprint 2",
      goal: "Polish and deploy",
      status: "PLANNING",
      projectId: project.id,
    },
  });

  // Create story dependency: story-todo-2 blocked by story-todo-1
  await prisma.storyDependency.create({
    data: {
      blockedId: "story-todo-2",
      blockerId: "story-todo-1",
    },
  });

  console.log("Test database seeded successfully");
}

if (require.main === module) {
  seedTestDb()
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
