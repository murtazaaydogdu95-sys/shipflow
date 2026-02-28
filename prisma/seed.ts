import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@shipflow.dev" },
    update: {},
    create: {
      email: "demo@shipflow.dev",
      name: "Demo User",
      image: "https://avatar.vercel.sh/demo",
    },
  });

  // Create demo project
  const project = await prisma.project.upsert({
    where: { slug: "shipflow-mvp" },
    update: {},
    create: {
      name: "ShipFlow MVP",
      slug: "shipflow-mvp",
      description: "Building the MVP of ShipFlow — an AI-powered sprint board",
      techStack: "Next.js, TypeScript, Tailwind, Prisma, PostgreSQL",
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  // Create default labels
  const labelData = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "database", color: "#8b5cf6" },
    { name: "API", color: "#f59e0b" },
    { name: "UI", color: "#ec4899" },
    { name: "auth", color: "#ef4444" },
    { name: "payments", color: "#14b8a6" },
    { name: "testing", color: "#6366f1" },
    { name: "devops", color: "#78716c" },
    { name: "bug", color: "#dc2626" },
    { name: "feature", color: "#2563eb" },
    { name: "chore", color: "#737373" },
  ];

  const labels: Record<string, string> = {};
  for (const l of labelData) {
    const label = await prisma.label.upsert({
      where: { name_projectId: { name: l.name, projectId: project.id } },
      update: {},
      create: { name: l.name, color: l.color, projectId: project.id },
    });
    labels[l.name] = label.id;
  }

  // Create a sprint
  const sprint = await prisma.sprint.upsert({
    where: { id: "demo-sprint-1" },
    update: {},
    create: {
      id: "demo-sprint-1",
      name: "Sprint 1",
      goal: "Core board + AI rewrite functionality",
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      projectId: project.id,
    },
  });

  // Create sample stories
  const stories = [
    {
      shortId: "SF-001",
      title: "Set up project scaffolding",
      description: "Initialize Next.js project with TypeScript, Tailwind, and Prisma",
      userStory: "As a developer, I want the project to be properly scaffolded so that I can start building features.",
      status: "DONE",
      priority: "HIGH",
      storyPoints: 2,
      position: 0,
      sprintId: sprint.id,
      labelNames: ["devops", "chore"],
      ac: [
        { given: "a new project directory", when: "I run the setup commands", then: "Next.js, Tailwind, and Prisma are configured" },
      ],
    },
    {
      shortId: "SF-002",
      title: "Implement user authentication",
      description: "Add GitHub and Google OAuth login using NextAuth.js",
      userStory: "As a user, I want to sign in with GitHub or Google so that my data is securely associated with my account.",
      status: "DONE",
      priority: "HIGH",
      storyPoints: 3,
      position: 1,
      sprintId: sprint.id,
      labelNames: ["auth", "backend"],
      ac: [
        { given: "I am on the login page", when: "I click 'Sign in with GitHub'", then: "I am redirected to GitHub OAuth and returned authenticated" },
        { given: "I am authenticated", when: "I visit protected pages", then: "I can access them without re-logging in" },
      ],
    },
    {
      shortId: "SF-003",
      title: "Build Kanban board with drag and drop",
      description: "Create a visual Kanban board with 5 columns and drag-and-drop story cards",
      userStory: "As a user, I want a visual Kanban board so that I can see and manage the status of all my stories at a glance.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      storyPoints: 8,
      position: 0,
      sprintId: sprint.id,
      labelNames: ["frontend", "UI"],
      ac: [
        { given: "I am on the project board", when: "I view the board", then: "I see 5 columns: Backlog, To Do, In Progress, Review, Done" },
        { given: "a story card in the 'To Do' column", when: "I drag it to 'In Progress'", then: "the card moves and the status updates" },
        { given: "I refresh the page", when: "I view the board", then: "the card positions are preserved" },
      ],
    },
    {
      shortId: "SF-004",
      title: "Add AI story rewrite feature",
      description: "Integrate Claude API to rewrite rough feature ideas into structured user stories",
      userStory: "As a user, I want to type a rough idea and have AI rewrite it into a proper user story with acceptance criteria.",
      status: "TODO",
      priority: "CRITICAL",
      storyPoints: 5,
      position: 0,
      sprintId: sprint.id,
      labelNames: ["backend", "API", "feature"],
      ac: [
        { given: "I type 'add dark mode'", when: "I click 'Rewrite with AI'", then: "I get a structured user story with title, description, and acceptance criteria" },
        { given: "the AI returns a rewrite", when: "I review it", then: "I can edit any field before saving" },
      ],
    },
    {
      shortId: "SF-005",
      title: "Implement Quick Capture modal",
      description: "Build a Cmd+K modal for rapidly capturing new story ideas",
      userStory: "As a user, I want to press Cmd+K to quickly capture a new story idea without leaving my current view.",
      status: "TODO",
      priority: "MEDIUM",
      storyPoints: 3,
      position: 1,
      sprintId: sprint.id,
      labelNames: ["frontend", "UI"],
      ac: [
        { given: "I am anywhere in the app", when: "I press Cmd+K", then: "a capture modal opens" },
        { given: "the capture modal is open", when: "I type an idea and submit", then: "a new story is created in the backlog" },
      ],
    },
    {
      shortId: "SF-006",
      title: "Add sprint velocity chart",
      description: "Build a chart showing story points committed vs completed per sprint",
      status: "BACKLOG",
      priority: "LOW",
      storyPoints: 3,
      position: 0,
      sprintId: null,
      labelNames: ["frontend", "feature"],
      ac: [
        { given: "I have completed at least 2 sprints", when: "I view the analytics page", then: "I see a bar chart with committed vs completed points" },
      ],
    },
    {
      shortId: "SF-007",
      title: "Build MCP server for Claude Code integration",
      description: "Create an MCP server that allows Claude Code to interact with ShipFlow stories",
      status: "BACKLOG",
      priority: "MEDIUM",
      storyPoints: 5,
      position: 1,
      sprintId: null,
      labelNames: ["backend", "API", "feature"],
      ac: [
        { given: "Claude Code is connected to the MCP server", when: "it calls get_next_story", then: "it receives the highest-priority TODO story" },
        { given: "Claude Code completes a story", when: "it calls complete_story", then: "the story moves to DONE with the commit hash linked" },
      ],
    },
    {
      shortId: "SF-008",
      title: "Add dark mode support",
      description: "Implement dark mode toggle using next-themes",
      userStory: "As a user, I want to switch between light and dark mode so that I can use the app comfortably at any time of day.",
      status: "BACKLOG",
      priority: "LOW",
      storyPoints: 2,
      position: 2,
      sprintId: null,
      labelNames: ["frontend", "UI"],
      ac: [
        { given: "I am using the app in light mode", when: "I click the theme toggle", then: "the app switches to dark mode" },
        { given: "I have dark mode enabled", when: "I reload the page", then: "dark mode persists" },
      ],
    },
  ];

  for (const s of stories) {
    const existing = await prisma.story.findUnique({ where: { shortId: s.shortId } });
    if (existing) continue;

    await prisma.story.create({
      data: {
        shortId: s.shortId,
        title: s.title,
        description: s.description,
        userStory: s.userStory,
        status: s.status,
        priority: s.priority,
        storyPoints: s.storyPoints,
        position: s.position,
        projectId: project.id,
        sprintId: s.sprintId,
        acceptanceCriteria: {
          create: (s.ac || []).map((ac, i) => ({
            given: ac.given,
            when: ac.when,
            then: ac.then,
            position: i,
          })),
        },
        labels: {
          create: (s.labelNames || [])
            .filter((name) => labels[name])
            .map((name) => ({ labelId: labels[name] })),
        },
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log(`  User: ${user.email}`);
  console.log(`  Project: ${project.name} (${project.slug})`);
  console.log(`  Labels: ${Object.keys(labels).length}`);
  console.log(`  Sprint: ${sprint.name}`);
  console.log(`  Stories: ${stories.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
