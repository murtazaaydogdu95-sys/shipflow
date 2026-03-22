export interface GlossaryTerm {
  slug: string;
  term: string;
  shortDefinition: string;
  content: string;
  relatedTerms: string[];
  relatedLinks: { label: string; href: string }[];
  faqs: { question: string; answer: string }[];
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: "user-story",
    term: "User Story",
    shortDefinition:
      "A user story is a short, plain-language description of a software feature written from the end user's perspective, typically following the format: 'As a [user], I want [goal] so that [benefit].'",
    content: `A user story is one of the core building blocks of agile software development. It captures a feature or requirement from the point of view of the person who will use it, keeping the team focused on delivering real value rather than just implementing technical requirements. The classic format — "As a [type of user], I want [some goal] so that [some reason]" — forces teams to think about who is affected, what they need, and why it matters.

User stories are intentionally small and focused. They represent a single unit of work that can typically be completed within one sprint. This constraint encourages teams to break large features into manageable chunks, estimate effort more accurately, and deliver incremental value. A story that takes more than a few days to complete is often a candidate for splitting into smaller stories.

The real power of user stories comes from the conversations they spark. Unlike detailed requirements documents, stories are placeholders for discussion between developers, designers, and stakeholders. The story card itself is less important than the shared understanding built through those conversations. Acceptance criteria — the conditions that must be met for a story to be considered done — are typically written alongside each story to make that shared understanding concrete and testable.

Tools like Codepylot take user stories further by using AI to automatically generate well-structured stories from rough ideas. Instead of spending time formatting requirements, you type a quick description and the AI produces a full story with title, description, acceptance criteria in Given/When/Then format, story points, priority, and type — ready to drop onto your sprint board. AI coding agents can then pick up those stories and autonomously implement them, creating a direct pipeline from idea to shipped code.`,
    relatedTerms: [
      "acceptance-criteria",
      "story-points",
      "sprint-planning",
      "backlog-grooming",
      "definition-of-done",
      "given-when-then",
    ],
    relatedLinks: [
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      {
        label: "How to Write User Stories as a Developer",
        href: "/blog/developers-guide-writing-user-stories",
      },
      { label: "Codepylot for Solo Developers", href: "/use-cases/solo-developers" },
      { label: "Codepylot vs Linear", href: "/compare/linear" },
    ],
    faqs: [
      {
        question: "What is the difference between a user story and a task?",
        answer:
          "A user story describes a feature from the user's perspective and represents business value, while a task is a specific technical step needed to implement that story. A single user story may be broken down into multiple tasks. Stories answer 'what' and 'why'; tasks answer 'how'.",
      },
      {
        question: "How long should a user story be?",
        answer:
          "A user story should be completable within a single sprint — typically one to five days of work. If a story takes longer, it is often called an epic and should be broken down into smaller stories. Story points or time estimates help teams gauge whether a story is appropriately sized.",
      },
      {
        question: "Who writes user stories?",
        answer:
          "User stories are usually written by a product owner or product manager in collaboration with the development team and stakeholders. In smaller teams or solo projects, the developer often writes their own stories. AI tools like Codepylot can automatically generate well-structured user stories from rough plain-text ideas, saving significant time.",
      },
    ],
  },
  {
    slug: "acceptance-criteria",
    term: "Acceptance Criteria",
    shortDefinition:
      "Acceptance criteria are the specific conditions a user story must satisfy to be considered complete and accepted by the product owner or stakeholder.",
    content: `Acceptance criteria define the boundaries of a user story. They answer the question: "How will we know this story is done?" Without acceptance criteria, teams risk building features that technically work but miss the intent of the original requirement. Well-written criteria create a shared, testable definition of success that developers, testers, and stakeholders can all agree on before work begins.

Acceptance criteria are typically written as a list of conditions that must all be true for the story to pass. Some teams write them as simple bullet points; others use the more structured Given/When/Then (Gherkin) format popularised by behavior-driven development. The Given/When/Then format is especially useful because it ties each criterion to a specific user action and an expected outcome, making it straightforward to convert criteria directly into automated tests.

Good acceptance criteria are unambiguous, testable, and focused on behavior rather than implementation details. They should describe what the system does, not how it does it. For example, "The login form validates email format" is a behavioral criterion; "The login form uses a regex pattern /^[a-z0-9]/" is an implementation detail that belongs in a technical specification, not an acceptance criterion.

Codepylot's AI story rewrite feature automatically generates acceptance criteria in Given/When/Then format alongside the story title, description, story points, and priority. This means teams can go from a rough idea to a fully specified, board-ready story in seconds. When an AI coding agent then picks up that story, it uses the acceptance criteria as a specification — dramatically reducing ambiguity and back-and-forth between the agent and the human reviewer.`,
    relatedTerms: [
      "given-when-then",
      "user-story",
      "definition-of-done",
      "story-points",
      "sprint-planning",
    ],
    relatedLinks: [
      { label: "Acceptance Criteria Generator", href: "/tools/acceptance-criteria-generator" },
      {
        label: "Acceptance Criteria: Given/When/Then Guide",
        href: "/blog/acceptance-criteria-given-when-then",
      },
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      { label: "Codepylot for Startup Founders", href: "/use-cases/startup-founders" },
    ],
    faqs: [
      {
        question: "What is the difference between acceptance criteria and definition of done?",
        answer:
          "Acceptance criteria are specific to an individual user story and define what that particular feature must do to be accepted. The definition of done is a team-wide checklist that applies to every story — things like 'code reviewed', 'tests passing', 'deployed to staging'. Both must be satisfied for a story to be truly complete.",
      },
      {
        question: "How many acceptance criteria should a user story have?",
        answer:
          "Most user stories benefit from three to eight acceptance criteria. Too few and the story may be ambiguous; too many often indicates the story is too large and should be split. Each criterion should be independently testable and describe a distinct behavioral expectation.",
      },
      {
        question: "Can AI generate acceptance criteria automatically?",
        answer:
          "Yes. Tools like Codepylot use AI to automatically generate acceptance criteria in Given/When/Then format from a plain-text idea. The AI infers the implied requirements from context, producing testable criteria that developers and agents can use directly. You can also use the standalone Acceptance Criteria Generator tool to create criteria for any story.",
      },
    ],
  },
  {
    slug: "vibe-coding",
    term: "Vibe Coding",
    shortDefinition:
      "Vibe coding is a style of software development where a programmer describes what they want in natural language and an AI writes the actual code, with the human guiding direction rather than writing every line.",
    content: `Vibe coding emerged as a term around 2025 to describe a new relationship between developers and AI tools. Instead of sitting down to write every function, class, and module by hand, the vibe coder works at a higher level of abstraction — describing intent, reviewing AI-generated output, testing behavior, and iterating. The name captures the intuitive, flow-state feeling of working with a capable AI partner that handles the mechanical parts of coding.

The practice sits on a spectrum. At one end, vibe coding looks like using GitHub Copilot or Cursor to autocomplete individual lines while you stay in full control of the architecture. At the other end — increasingly common in 2026 — it means giving an AI agent a user story and letting it autonomously create a branch, write the full implementation, and open a pull request for review. The developer shifts from author to editor and architect.

Vibe coding is not just for beginners or people who "can't code." Many experienced developers use it to dramatically accelerate output on well-understood problem domains — CRUD endpoints, auth flows, dashboard components — freeing mental energy for the harder design decisions. The key skill in vibe coding becomes writing precise, context-rich descriptions of what you want rather than writing the code itself.

Codepylot is built around the vibe coding workflow. You capture a rough idea in plain English using Quick Capture (Cmd+K), optionally rewrite it into a structured user story with AI, then let an autonomous Claude Code agent implement the feature on its own branch. The agent uses the story's acceptance criteria as a specification, writes the code, and moves the story to Review when done. You review the diff, approve or request changes, and merge — shipping features without ever touching the implementation yourself if you choose.`,
    relatedTerms: [
      "ai-coding-agent",
      "user-story",
      "acceptance-criteria",
      "sprint-planning",
      "kanban-board",
    ],
    relatedLinks: [
      { label: "What Is Vibe Coding?", href: "/blog/what-is-vibe-coding" },
      {
        label: "Complete Guide to AI-Assisted Development",
        href: "/blog/complete-guide-ai-assisted-software-development",
      },
      { label: "Codepylot for Indie Hackers", href: "/use-cases/indie-hackers" },
      { label: "Codepylot for Side Projects", href: "/use-cases/side-projects" },
      { label: "Codepylot vs Cursor", href: "/compare/cursor" },
      { label: "Codepylot vs GitHub Copilot", href: "/compare/copilot" },
    ],
    faqs: [
      {
        question: "Is vibe coding real programming?",
        answer:
          "Yes. Vibe coding is a legitimate form of software development that requires strong problem-solving, architecture skills, and the ability to evaluate AI output critically. The skills shift from syntax and boilerplate toward design, specification, and review — but the outcome is real, working software. Many professional developers use vibe coding techniques to ship faster.",
      },
      {
        question: "What tools do you need for vibe coding?",
        answer:
          "Common vibe coding tools include AI-powered IDEs like Cursor, code-generation tools like GitHub Copilot, and autonomous agent platforms like Codepylot. Codepylot is purpose-built for vibe coding: it provides the sprint board, AI story generation, and autonomous coding agents all in one place, so ideas go from rough description to shipped feature with minimal friction.",
      },
      {
        question: "What are the risks of vibe coding?",
        answer:
          "The main risks are accepting AI-generated code without understanding it, accumulating technical debt from poorly reviewed output, and over-relying on AI for security-sensitive code. Best practice is to review all AI output carefully, run automated tests, and maintain clear acceptance criteria so the AI has a precise target. Tools like Codepylot include built-in AI code review to score and flag issues in agent-generated code.",
      },
    ],
  },
  {
    slug: "sprint-planning",
    term: "Sprint Planning",
    shortDefinition:
      "Sprint planning is an agile ceremony where a team selects user stories from the backlog to work on during an upcoming sprint, estimates effort, and commits to a sprint goal.",
    content: `Sprint planning is the ritual that kicks off every sprint in Scrum and many agile workflows. The team gathers — in a room or a video call — to answer two questions: what can we deliver in this sprint, and how will we do it? The outcome is a sprint backlog: a prioritised list of user stories the team commits to completing within the sprint's timeframe, typically one to four weeks.

Effective sprint planning starts with a healthy, groomed backlog. Stories should be clearly defined with acceptance criteria, estimated in story points, and prioritised before the planning session. Teams pull stories from the top of the backlog until they have filled the sprint to their historical velocity — the average number of story points completed per sprint. This makes planning predictable rather than optimistic.

During planning, each story is reviewed and any ambiguities are resolved before work starts. Developers often decompose stories into tasks at this stage, identifying technical unknowns and surfacing potential blockers. The goal is to leave the meeting with a sprint backlog that every team member understands and believes is achievable. A clear sprint goal — a one-sentence description of the sprint's purpose — helps the team make trade-off decisions when surprises arise mid-sprint.

For solo developers and small teams, sprint planning does not need to be elaborate. Even a fifteen-minute review of your Kanban board, selecting the top three to five stories for the week, and checking for dependencies constitutes meaningful sprint planning. Tools like Codepylot support this with story splitting, dependency tracking, and an AI standup summary that shows what's in progress, blocked, and up next — giving you the context you need for a fast, effective planning session.`,
    relatedTerms: [
      "user-story",
      "story-points",
      "backlog-grooming",
      "kanban-board",
      "definition-of-done",
    ],
    relatedLinks: [
      {
        label: "Sprint Planning for Teams of One",
        href: "/blog/sprint-planning-for-teams-of-one",
      },
      {
        label: "How to Run Sprints as a Solo Developer",
        href: "/blog/how-to-run-sprints-as-solo-developer",
      },
      { label: "Codepylot for Small Teams", href: "/use-cases/small-teams" },
      { label: "Codepylot vs Jira", href: "/compare/jira" },
      { label: "Codepylot vs Linear", href: "/compare/linear" },
    ],
    faqs: [
      {
        question: "How long should sprint planning take?",
        answer:
          "A common rule of thumb is two hours of planning for every week of sprint length — so a two-week sprint calls for roughly a four-hour planning meeting. In practice, well-groomed backlogs and experienced teams can plan much faster. Solo developers and small teams often complete planning in fifteen to thirty minutes.",
      },
      {
        question: "What is the difference between sprint planning and backlog grooming?",
        answer:
          "Backlog grooming (or backlog refinement) is an ongoing process of adding detail, estimates, and priority to stories in the backlog before they are needed. Sprint planning is a time-boxed meeting at the start of a sprint where the team selects and commits to stories from the groomed backlog. Grooming feeds planning.",
      },
      {
        question: "Can AI help with sprint planning?",
        answer:
          "AI can assist sprint planning in several ways: automatically generating and structuring user stories from rough ideas, estimating story points based on complexity, detecting story dependencies that could block the sprint, and generating daily standup summaries. Codepylot's AI rewrite feature and agent queue make it possible to plan a sprint, assign stories to AI agents, and have implementation underway within minutes.",
      },
    ],
  },
  {
    slug: "kanban-board",
    term: "Kanban Board",
    shortDefinition:
      "A Kanban board is a visual project management tool that organises work items into columns representing stages of a workflow, helping teams track progress and limit work in progress.",
    content: `The Kanban board originated in Toyota's manufacturing system in the 1940s as a way to visualise production flow and signal when new work should start. Software teams adopted it in the 2000s as a flexible alternative to Scrum's rigid sprint structure. Today, Kanban boards are one of the most widely used tools in software development, from enterprise teams running Linear or Jira to solo developers using sticky notes on a whiteboard.

A Kanban board consists of columns that represent the stages work passes through — commonly something like Backlog, To Do, In Progress, Review, and Done. Work items (cards) start in the leftmost column and move right as they progress. The visual layout makes it immediately obvious how much work is in each stage, where bottlenecks are forming, and which items are blocked. A card that has been sitting in In Progress for two weeks stands out in a way it never would in a text-based task list.

One of Kanban's core principles is Work in Progress (WIP) limits: a cap on the number of cards allowed in a column at one time. WIP limits force teams to finish work before starting new work, reducing context switching and revealing bottlenecks. When a column hits its limit, the team must resolve the constraint rather than piling on more work. This discipline often exposes systemic problems — a slow review process, a single bottleneck reviewer — that would otherwise be masked by constantly starting new tasks.

Codepylot's Kanban board extends the classic format with features designed for AI-assisted development. Columns include Icebox (a parking lot for ideas), Backlog, To Do, In Progress, Review, and Done. Cards show priority badges, story point estimates, epic indicators, and AI agent status. You can drag and drop stories between columns, use keyboard shortcuts for navigation, and bulk-select cards for mass operations. When an AI agent completes a story, it automatically moves the card to Review and starts a dev preview — so your board reflects actual code state, not just human updates.`,
    relatedTerms: [
      "user-story",
      "sprint-planning",
      "story-points",
      "backlog-grooming",
      "definition-of-done",
    ],
    relatedLinks: [
      {
        label: "Kanban vs Scrum for Small Teams",
        href: "/blog/kanban-vs-scrum-for-small-teams",
      },
      { label: "Codepylot for Solo Developers", href: "/use-cases/solo-developers" },
      { label: "Codepylot for Small Teams", href: "/use-cases/small-teams" },
      { label: "Codepylot vs Trello", href: "/compare/trello" },
      { label: "Codepylot vs Linear", href: "/compare/linear" },
    ],
    faqs: [
      {
        question: "What is the difference between a Kanban board and a Scrum board?",
        answer:
          "A Scrum board is reset at the start of each sprint and shows only the stories committed to that sprint. A Kanban board is a continuous flow board with no fixed time boxes — work items flow through whenever capacity is available. Scrum boards are better for teams that plan in sprints; Kanban boards suit teams with continuous incoming work or less predictable workloads.",
      },
      {
        question: "How many columns should a Kanban board have?",
        answer:
          "Most software teams use five to seven columns: something like Backlog, To Do, In Progress, Review, and Done, with optional columns like Icebox or Blocked. Fewer columns reduce complexity; more columns add granularity. The right number is whatever accurately represents your team's actual workflow stages without creating unnecessary handoffs.",
      },
      {
        question: "What are WIP limits and why do they matter?",
        answer:
          "Work in Progress (WIP) limits cap the number of cards allowed in a column at one time. They prevent teams from starting too many tasks simultaneously, which causes context switching and delays. When a column hits its WIP limit, team members must help finish existing work before picking up anything new. This discipline typically improves flow, reduces cycle time, and surfaces bottlenecks.",
      },
    ],
  },
  {
    slug: "story-points",
    term: "Story Points",
    shortDefinition:
      "Story points are a unit of measure used in agile development to estimate the relative effort, complexity, and uncertainty of user stories, typically using a Fibonacci sequence scale.",
    content: `Story points are one of agile's most misunderstood concepts — and one of its most useful when used correctly. A story point is not a unit of time. It is a relative measure of effort that combines three factors: the volume of work involved, the complexity of the problem, and the uncertainty or risk. Two stories with similar descriptions might have very different point values if one involves a well-understood API and the other requires integrating an unfamiliar third-party system.

Teams typically use a Fibonacci-like scale — 1, 2, 3, 5, 8, 13, 21 — for estimating story points. The non-linear sequence reflects a key truth: the larger and more uncertain a story is, the less precisely we can estimate it. There is a meaningful difference between a 1-point and a 2-point story, but the difference between a 13-point and an 18-point story is largely noise. The Fibonacci sequence discourages false precision for large estimates.

The real value of story points comes from tracking velocity over time. Velocity is the average number of story points a team completes per sprint. Once a team has a few sprints of velocity data, they can use it to predict how many points they can realistically commit to in future sprints. This makes sprint planning more data-driven and honest. Teams stop over-committing and under-delivering because they have empirical evidence of their capacity.

Story points work best when the whole team estimates together using techniques like Planning Poker, where each person reveals their estimate simultaneously to avoid anchoring bias. Discussion happens when estimates diverge significantly, which often surfaces hidden complexity or misunderstood requirements. Codepylot's AI story rewrite feature automatically suggests story point estimates based on the complexity of the generated story, giving teams a starting point for discussion and speeding up backlog grooming sessions.`,
    relatedTerms: [
      "user-story",
      "sprint-planning",
      "backlog-grooming",
      "definition-of-done",
      "kanban-board",
    ],
    relatedLinks: [
      {
        label: "Sprint Planning for Teams of One",
        href: "/blog/sprint-planning-for-teams-of-one",
      },
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      { label: "Codepylot for Startup Founders", href: "/use-cases/startup-founders" },
      { label: "Codepylot vs Jira", href: "/compare/jira" },
    ],
    faqs: [
      {
        question: "Are story points better than time estimates?",
        answer:
          "Story points are generally better for relative estimation because they decouple effort from calendar time and account for team-specific factors. Time estimates are often overconfident and don't account for interruptions, meetings, or unexpected complexity. That said, story points require a calibration period — new teams often benefit from time estimates until they build a velocity history.",
      },
      {
        question: "What does a 1-point story look like versus an 8-point story?",
        answer:
          "A 1-point story is a trivial, well-understood change with no uncertainty — updating a copy string, fixing a typo in a config, adding a single field to a form. An 8-point story is large and complex: perhaps implementing a new auth flow, integrating a third-party payment system, or building a new dashboard with multiple charts. The gap represents effort, complexity, and risk — not just raw time.",
      },
      {
        question: "Can AI estimate story points?",
        answer:
          "AI can provide useful starting estimates based on the complexity and scope described in a user story. Codepylot's AI story rewrite automatically suggests story point values alongside acceptance criteria, priority, and type. These AI estimates are best treated as a starting point for team discussion rather than final values, since teams know their own codebase, technical debt, and velocity better than any model.",
      },
    ],
  },
  {
    slug: "ai-coding-agent",
    term: "AI Coding Agent",
    shortDefinition:
      "An AI coding agent is an autonomous software system that can read a feature description, write code to implement it, create git branches, run tests, and open pull requests with minimal human intervention.",
    content: `AI coding agents represent a qualitative leap beyond AI code completion tools like GitHub Copilot. While a completion tool suggests the next line or block as a developer types, an agent operates autonomously over a longer horizon: reading a feature specification, exploring the codebase to understand context, writing multiple files, running tests, fixing errors, and producing a pull request — all without a human in the loop for each step.

The architecture of most AI coding agents in 2026 follows a similar pattern: a large language model at the core, access to tools (file read/write, terminal commands, git operations, web search), and a control loop that lets the model decide which tools to invoke and in what order to achieve a goal. The model reasons about what needs to be done, executes actions, observes the results, and adjusts its plan. This "tool-calling loop" is what transforms a chatbot into an agent.

Quality AI coding agents do more than write syntactically correct code. They read existing code to match the project's conventions and architecture, reference documentation and tests, handle edge cases described in acceptance criteria, and write tests for their own implementations. The most capable agents in 2026 can handle stories of moderate complexity — new API endpoints, UI components, database integrations, third-party service connections — with human review reserved for approval rather than line-by-line guidance.

Codepylot's agent system is built on Claude Code, Anthropic's autonomous coding agent. Agents connect to your project via an MCP (Model Context Protocol) server that gives them access to your story board — they can read story details, update status, add progress notes, and mark stories complete. Each agent runs on its own feature branch, with live logs viewable in the story detail modal. You can run up to three concurrent agents per project, and the system automatically queues stories by priority and respects dependency blockers. On completion, an AI code review scores the agent's output 0–100 with a detailed issue breakdown.`,
    relatedTerms: [
      "vibe-coding",
      "user-story",
      "acceptance-criteria",
      "definition-of-done",
      "kanban-board",
    ],
    relatedLinks: [
      {
        label: "How AI Coding Agents Work",
        href: "/blog/how-ai-coding-agents-work",
      },
      {
        label: "Complete Guide to AI-Assisted Development",
        href: "/blog/complete-guide-ai-assisted-software-development",
      },
      { label: "Codepylot for Indie Hackers", href: "/use-cases/indie-hackers" },
      { label: "Codepylot for MVP Development", href: "/use-cases/mvp-development" },
      { label: "Codepylot vs Cursor", href: "/compare/cursor" },
      { label: "Codepylot vs GitHub Copilot", href: "/compare/copilot" },
    ],
    faqs: [
      {
        question: "How is an AI coding agent different from GitHub Copilot?",
        answer:
          "GitHub Copilot is an inline code completion tool — it assists as you type, suggesting lines and blocks, but you remain in full control of every keystroke. An AI coding agent operates autonomously over a multi-step task: it reads a feature description, explores the codebase, writes all necessary files, runs commands, and delivers a complete implementation. Copilot is a co-pilot; an agent is an autopilot for well-defined features.",
      },
      {
        question: "What kinds of tasks are AI coding agents good at?",
        answer:
          "AI coding agents excel at well-specified, bounded tasks: REST API endpoints, UI components, CRUD operations, authentication flows, third-party integrations, database migrations, and test coverage. They struggle with vague specifications, tasks requiring deep domain knowledge, and complex architectural decisions. Clear user stories with acceptance criteria in Given/When/Then format produce the best agent results.",
      },
      {
        question: "How do I review code written by an AI coding agent?",
        answer:
          "Start by reviewing the acceptance criteria — does the implementation actually satisfy each criterion? Check the git diff for any files modified outside the expected scope. Run the test suite. Look for security issues, hardcoded values, and edge cases not covered by tests. Codepylot includes a built-in AI code review that automatically scores agent output and highlights specific issues by severity, file, and line number — a useful first filter before your own review.",
      },
    ],
  },
  {
    slug: "given-when-then",
    term: "Given/When/Then Format",
    shortDefinition:
      "Given/When/Then is a structured format for writing acceptance criteria and test scenarios that describes a precondition (Given), a user action (When), and an expected outcome (Then).",
    content: `Given/When/Then — sometimes called Gherkin syntax or BDD (Behavior-Driven Development) format — is a template for writing acceptance criteria and test cases in plain English that is both human-readable and machine-parseable. The three clauses work together: "Given" establishes the context or precondition before an action occurs; "When" describes the specific action or event; "Then" specifies the observable outcome that should result.

A concrete example helps illustrate the format: "Given a logged-in user on the checkout page, When they enter a valid credit card and click 'Pay', Then they should see an order confirmation page and receive a confirmation email." This single criterion captures the who, the action, and the measurable result in a form that a developer, tester, and non-technical stakeholder can all understand and agree on.

The format's power lies in its precision without technical jargon. Because each criterion has a defined starting state, a specific trigger, and a verifiable outcome, there is little room for ambiguous interpretation. Developers know exactly what behavior to implement; testers know exactly what to verify; product owners can read criteria without needing technical knowledge. Tools like Cucumber can even execute Given/When/Then steps directly as automated tests, creating a living specification that proves the system behaves as described.

Codepylot's AI story rewrite feature automatically generates acceptance criteria in Given/When/Then format for every story it produces. When an AI coding agent picks up a story, it uses these structured criteria as a precise specification — each "Then" clause is a test it knows it must satisfy. This tight loop between human-readable criteria and automated implementation is one of the key reasons AI agents produce higher-quality output when working with well-structured stories compared to loose, informal descriptions.`,
    relatedTerms: [
      "acceptance-criteria",
      "user-story",
      "definition-of-done",
      "ai-coding-agent",
      "sprint-planning",
    ],
    relatedLinks: [
      {
        label: "Acceptance Criteria: Given/When/Then Guide",
        href: "/blog/acceptance-criteria-given-when-then",
      },
      { label: "Acceptance Criteria Generator", href: "/tools/acceptance-criteria-generator" },
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      { label: "Codepylot for QA Engineers", href: "/use-cases/devops-engineers" },
    ],
    faqs: [
      {
        question: "What does Given/When/Then stand for in BDD?",
        answer:
          "In Behavior-Driven Development (BDD), 'Given' describes the initial context or state of the system before an action. 'When' describes the action or event that triggers a behavior. 'Then' describes the expected observable outcome. Together, they form a complete, unambiguous test scenario that bridges communication between developers, testers, and stakeholders.",
      },
      {
        question: "Can I have multiple 'And' clauses in Given/When/Then?",
        answer:
          "Yes. 'And' extends any of the three clauses with additional conditions. For example: 'Given a logged-in admin user, And the user has billing enabled, When they navigate to the billing page, Then they should see their current plan, And they should see an upgrade button.' Using 'And' avoids repeating the clause keyword while keeping scenarios readable.",
      },
      {
        question: "Is Given/When/Then only for BDD or can I use it for regular acceptance criteria?",
        answer:
          "Given/When/Then is widely used for plain acceptance criteria regardless of whether you follow a formal BDD process or use BDD test frameworks like Cucumber or SpecFlow. The format's clarity makes it valuable for any team that wants unambiguous, testable acceptance criteria. Codepylot generates Given/When/Then criteria for all AI-rewritten stories regardless of your testing setup.",
      },
    ],
  },
  {
    slug: "definition-of-done",
    term: "Definition of Done",
    shortDefinition:
      "Definition of done (DoD) is a team-agreed checklist of criteria that every user story must meet before it can be considered complete and accepted, ensuring consistent quality across all delivered work.",
    content: `The definition of done is a quality gate that prevents the silent accumulation of technical debt. Without a shared definition, "done" means different things to different people: one developer considers a story done when the feature works locally; another requires code review and passing tests; a third adds documentation requirements. The definition of done makes these expectations explicit and applies them uniformly to every story, every sprint.

A typical definition of done for a software team might include: code written and passing all existing tests, new unit tests written for new functionality, code reviewed by at least one other developer, feature deployed to a staging environment, acceptance criteria verified by the product owner, and documentation updated if relevant. Some teams add performance benchmarks, accessibility checks, or security review requirements depending on the nature of the work.

The definition of done operates at the team level, above individual stories. Every story must satisfy the DoD to be counted as "Done" — not just "Dev Done" or "Code Complete." This distinction matters enormously for sprint velocity and delivery predictability. A story that is 95% done but stuck in review is worth zero points in that sprint. The DoD incentivises teams to complete work fully rather than moving on to new stories while leaving a trail of partially-done work behind them.

Acceptance criteria and the definition of done are complementary but different. Acceptance criteria are unique to each story and describe what that story must do. The definition of done is universal and describes how every story must be built. Both must be satisfied for a story to be truly complete. Codepylot's story board enforces a natural definition of done through its workflow: a story moves to Done only after an agent's branch is merged, AI code review passes, and acceptance criteria are confirmed — creating a lightweight but consistent quality gate for every feature.`,
    relatedTerms: [
      "acceptance-criteria",
      "user-story",
      "given-when-then",
      "sprint-planning",
      "story-points",
    ],
    relatedLinks: [
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      { label: "Acceptance Criteria Generator", href: "/tools/acceptance-criteria-generator" },
      { label: "Codepylot for Small Teams", href: "/use-cases/small-teams" },
      { label: "Codepylot vs Jira", href: "/compare/jira" },
      { label: "Codepylot vs Linear", href: "/compare/linear" },
    ],
    faqs: [
      {
        question: "What is the difference between definition of done and definition of ready?",
        answer:
          "The definition of done specifies what a story must achieve to be considered complete (exiting the board). The definition of ready specifies what a story must have in place before a team can start working on it (entering the sprint). Definition of ready typically requires a clear description, acceptance criteria, a story point estimate, and no unresolved blocking dependencies.",
      },
      {
        question: "Should the definition of done change over time?",
        answer:
          "Yes. Teams should review and update their definition of done at sprint retrospectives as their standards mature. Early-stage teams might start with minimal criteria and add requirements — like automated tests or performance checks — as they build the capability to meet them. A definition of done that never changes suggests the team has stopped improving.",
      },
      {
        question: "How does the definition of done relate to AI coding agents?",
        answer:
          "AI coding agents need a clear definition of done to produce high-quality output. When an agent implements a story, it should aim to satisfy not just the acceptance criteria but also any universal standards like test coverage, code style, and documentation. Codepylot's agents automatically run an AI code review on completion, surfacing issues against a consistent quality rubric — acting as an automated first pass of the definition of done.",
      },
    ],
  },
  {
    slug: "backlog-grooming",
    term: "Backlog Grooming",
    shortDefinition:
      "Backlog grooming (also called backlog refinement) is the ongoing process of reviewing, prioritising, estimating, and adding detail to user stories in a product backlog before they are pulled into a sprint.",
    content: `Backlog grooming — officially called "backlog refinement" in the Scrum Guide — is the discipline of keeping your story backlog healthy and actionable. A backlog that is never groomed becomes a graveyard: hundreds of vague stories with no estimates, outdated descriptions, and unclear priorities. A well-groomed backlog is a prioritised, estimated queue of clearly-defined stories ready to be picked up the moment capacity is available.

In practice, grooming involves four activities: adding detail and acceptance criteria to rough ideas, estimating story points for stories approaching the top of the backlog, re-prioritising based on changing business needs, and splitting large stories (epics) into smaller, sprint-sized stories. Teams typically run a dedicated grooming session once per sprint, lasting one to two hours, though many teams prefer short, frequent grooming over a single long session.

A groomed story that is "ready" for a sprint typically meets a definition of ready: it has a clear title and description, acceptance criteria in a testable format, a story point estimate, assigned priority, and no unresolved blocking dependencies. Without these elements, a story is likely to cause confusion, scope creep, or delays when it is actually worked on. The investment in grooming pays for itself many times over in reduced churn during sprint execution.

AI tools are transforming backlog grooming from a time-intensive ceremony into a lightweight, continuous process. Codepylot's Quick Capture and AI story rewrite turn rough ideas into groomed, sprint-ready stories in seconds: a sentence like "add forgot password flow" becomes a fully structured story with a title, user story description, Given/When/Then acceptance criteria, story point estimate, priority, and type. The AI story split feature can take an epic and decompose it into three to five smaller stories with inter-story dependencies set automatically — compressing what used to be an hour of grooming into a single click.`,
    relatedTerms: [
      "user-story",
      "sprint-planning",
      "story-points",
      "acceptance-criteria",
      "definition-of-done",
    ],
    relatedLinks: [
      {
        label: "Sprint Planning for Teams of One",
        href: "/blog/sprint-planning-for-teams-of-one",
      },
      {
        label: "How to Write User Stories as a Developer",
        href: "/blog/developers-guide-writing-user-stories",
      },
      { label: "AI User Story Generator", href: "/tools/user-story-generator" },
      { label: "Codepylot for Solo Developers", href: "/use-cases/solo-developers" },
      { label: "Codepylot vs Jira", href: "/compare/jira" },
    ],
    faqs: [
      {
        question: "How often should you do backlog grooming?",
        answer:
          "Most Scrum teams groom the backlog once per sprint, typically mid-sprint, so the next sprint's stories are ready before planning. Some teams prefer shorter, more frequent sessions — even fifteen minutes daily — to keep the backlog current without a big periodic ceremony. The right cadence depends on how quickly requirements change and how fast new ideas come in.",
      },
      {
        question: "Who should attend backlog grooming sessions?",
        answer:
          "Backlog grooming is most valuable when it includes the product owner, tech lead, and a representative subset of the development team. The product owner brings business context and priorities; developers bring technical insight, effort estimates, and dependency knowledge. Including too many people slows the session; too few risks stories being misunderstood when they are actually worked on.",
      },
      {
        question: "Can AI replace backlog grooming?",
        answer:
          "AI can dramatically reduce the effort required for grooming. Tools like Codepylot can auto-generate acceptance criteria, suggest story point estimates, and split large epics into smaller stories — tasks that typically consume most of a grooming session. However, human judgment is still needed for business prioritisation, technical feasibility assessment, and surfacing unknown unknowns that AI cannot anticipate from a story description alone.",
      },
    ],
  },
];

export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return glossaryTerms.find((t) => t.slug === slug);
}
