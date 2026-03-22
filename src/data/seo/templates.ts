export type Template = {
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  templateContent: {
    title: string;
    description: string;
    userStory: string;
    acceptanceCriteria: { given: string; when: string; then: string }[];
    type: string;
    priority: string;
    storyPoints: number;
  };
};

export const templates: Template[] = [
  {
    slug: "user-story",
    name: "User Story",
    category: "General",
    description:
      "A general-purpose user story template following the standard 'As a [user], I want [goal], so that [benefit]' format. Use this as a starting point for any feature that delivers direct user value.",
    icon: "BookOpen",
    templateContent: {
      title: "Implement [Feature Name]",
      description:
        "Add a new feature that allows users to accomplish a specific goal within the application. This story covers the full implementation including UI, backend logic, and data persistence.",
      userStory:
        "As a registered user, I want to be able to [perform action] so that I can [achieve desired outcome] more efficiently.",
      acceptanceCriteria: [
        {
          given: "I am logged into the application",
          when: "I navigate to the feature page and perform the primary action",
          then: "the system processes my request and displays a success confirmation within 2 seconds",
        },
        {
          given: "I have submitted valid input",
          when: "the system processes the request",
          then: "the data is persisted to the database and reflected in the UI without requiring a page refresh",
        },
        {
          given: "I provide invalid or missing required input",
          when: "I attempt to submit the form",
          then: "the system displays specific validation errors inline next to the relevant fields and does not submit the form",
        },
        {
          given: "I am on a mobile device with a viewport width under 768px",
          when: "I access the feature",
          then: "the layout adapts responsively and all functionality remains accessible",
        },
      ],
      type: "feature",
      priority: "MEDIUM",
      storyPoints: 5,
    },
  },
  {
    slug: "bug-report",
    name: "Bug Report",
    category: "Quality",
    description:
      "A structured bug report template with reproduction steps, expected vs actual behavior, and fix verification criteria. Helps developers quickly understand and resolve issues.",
    icon: "Bug",
    templateContent: {
      title: "Fix: [Brief description of the bug]",
      description:
        "A bug has been identified that causes unexpected behavior in the application. This story covers investigating the root cause, implementing a fix, and adding regression tests to prevent recurrence.\n\n**Environment:** Production / Staging\n**Browser/Device:** All modern browsers\n**Severity:** [Critical/High/Medium/Low]\n\n**Steps to Reproduce:**\n1. Navigate to [page/feature]\n2. Perform [specific action]\n3. Observe [unexpected behavior]\n\n**Expected Behavior:** [What should happen]\n**Actual Behavior:** [What actually happens]\n\n**Screenshots/Logs:** [Attach relevant screenshots or error logs]",
      userStory:
        "As a user, I expect the application to behave correctly when I [perform action], so that I can complete my task without encountering errors or unexpected behavior.",
      acceptanceCriteria: [
        {
          given: "the bug has been identified and root cause analyzed",
          when: "the fix is implemented",
          then: "the original reproduction steps no longer produce the unexpected behavior",
        },
        {
          given: "the fix has been deployed",
          when: "I perform the same actions that previously triggered the bug",
          then: "the application behaves as originally expected with no side effects on related functionality",
        },
        {
          given: "a regression test has been written for the bug",
          when: "the test suite is run",
          then: "the new test passes and covers the specific scenario that caused the bug",
        },
      ],
      type: "bug",
      priority: "HIGH",
      storyPoints: 3,
    },
  },
  {
    slug: "feature-request",
    name: "Feature Request",
    category: "General",
    description:
      "A feature request template for capturing new functionality ideas with user impact analysis, success metrics, and detailed acceptance criteria. Great for product planning and backlog grooming.",
    icon: "Lightbulb",
    templateContent: {
      title: "Feature: [Name of the new feature]",
      description:
        "A new feature has been requested that will enhance the user experience and add value to the product.\n\n**Problem Statement:** Users currently struggle with [problem] because [reason]. This leads to [negative outcome].\n\n**Proposed Solution:** Implement [feature] that allows users to [capability]. This will reduce friction by [benefit] and is expected to improve [metric] by [estimated percentage].\n\n**Success Metrics:**\n- User adoption rate of new feature within 30 days\n- Reduction in support tickets related to [problem]\n- Improvement in task completion time for [workflow]",
      userStory:
        "As a power user, I want to have access to [new feature] so that I can [accomplish goal] without relying on workarounds or external tools.",
      acceptanceCriteria: [
        {
          given: "the feature is enabled for my account",
          when: "I navigate to the feature and interact with it for the first time",
          then: "I see an onboarding tooltip or guide explaining how to use the feature",
        },
        {
          given: "I am using the feature",
          when: "I complete the primary workflow",
          then: "the result matches the expected output and is saved persistently",
        },
        {
          given: "the feature is in use",
          when: "I check the analytics dashboard",
          then: "usage events are being tracked and the success metrics are measurable",
        },
        {
          given: "the feature is not applicable to my plan tier",
          when: "I try to access it",
          then: "I see a clear upgrade prompt explaining the feature and which plan includes it",
        },
      ],
      type: "feature",
      priority: "MEDIUM",
      storyPoints: 8,
    },
  },
  {
    slug: "api-endpoint",
    name: "API Endpoint",
    category: "Backend",
    description:
      "A template for designing and implementing RESTful API endpoints with request/response contracts, authentication, validation, error handling, and rate limiting considerations.",
    icon: "Server",
    templateContent: {
      title: "API: Implement [HTTP Method] /api/[resource]",
      description:
        "Implement a new API endpoint that supports [CRUD operation] for [resource]. The endpoint should follow RESTful conventions, include proper authentication, input validation with Zod schemas, and return standardized error responses.\n\n**Endpoint:** `[GET|POST|PUT|PATCH|DELETE] /api/[resource]`\n\n**Request Body (if applicable):**\n```json\n{\n  \"field1\": \"string (required)\",\n  \"field2\": \"number (optional)\"\n}\n```\n\n**Response (200):**\n```json\n{\n  \"id\": \"string\",\n  \"field1\": \"string\",\n  \"createdAt\": \"ISO-8601\"\n}\n```\n\n**Error Responses:** 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limited)",
      userStory:
        "As an API consumer, I want a well-documented endpoint for managing [resource] so that I can integrate [resource] operations into my application or automation workflow.",
      acceptanceCriteria: [
        {
          given: "I send a valid request with proper authentication",
          when: "the server processes the request",
          then: "I receive a 200/201 response with the expected JSON payload and correct Content-Type headers",
        },
        {
          given: "I send a request with invalid or missing required fields",
          when: "the server validates the request body using Zod",
          then: "I receive a 400 response with a detailed validation error message indicating which fields failed",
        },
        {
          given: "I send a request without authentication or with an invalid API key",
          when: "the auth middleware processes the request",
          then: "I receive a 401 response and no data is returned or modified",
        },
        {
          given: "I exceed the rate limit of 60 requests per minute",
          when: "I send an additional request",
          then: "I receive a 429 response with a Retry-After header indicating when I can make the next request",
        },
        {
          given: "the endpoint is deployed",
          when: "I check the OpenAPI specification",
          then: "the new endpoint is documented with request/response schemas, authentication requirements, and example payloads",
        },
      ],
      type: "feature",
      priority: "HIGH",
      storyPoints: 5,
    },
  },
  {
    slug: "auth-page",
    name: "Auth Page",
    category: "Frontend",
    description:
      "A template for implementing authentication pages including login, signup, password reset, and OAuth provider buttons. Covers form validation, error states, loading states, and responsive design.",
    icon: "Lock",
    templateContent: {
      title: "Implement [Login/Signup/Password Reset] page",
      description:
        "Build an authentication page that provides a secure and user-friendly experience for account access. The page should support email/password credentials and OAuth providers (GitHub, Google), with proper form validation, loading states, and error handling.\n\n**UI Requirements:**\n- Centered card layout with logo and branding\n- Email and password fields with inline validation\n- OAuth provider buttons (GitHub, Google) with provider icons\n- 'Forgot password?' link on login page\n- Loading spinner on submit button during authentication\n- Error toast/banner for failed authentication attempts\n- Responsive layout that works on mobile and desktop",
      userStory:
        "As a new or returning user, I want a clear and secure authentication page so that I can access my account quickly using my preferred login method.",
      acceptanceCriteria: [
        {
          given: "I am on the authentication page",
          when: "I enter valid credentials and submit the form",
          then: "I am authenticated and redirected to the dashboard within 3 seconds with a welcome notification",
        },
        {
          given: "I am on the authentication page",
          when: "I click a social OAuth button (GitHub or Google)",
          then: "I am redirected to the provider's authorization page and returned to the app upon approval",
        },
        {
          given: "I submit the form with an invalid email format or a password shorter than 8 characters",
          when: "client-side validation runs",
          then: "inline error messages appear next to the relevant fields without a page reload or network request",
        },
        {
          given: "I enter correct email but wrong password",
          when: "the server rejects authentication",
          then: "a generic error message ('Invalid credentials') is shown without revealing whether the email exists in the system",
        },
        {
          given: "I am viewing the page on a mobile device",
          when: "the page renders",
          then: "all form fields, buttons, and OAuth options are fully visible and usable without horizontal scrolling",
        },
      ],
      type: "feature",
      priority: "HIGH",
      storyPoints: 5,
    },
  },
  {
    slug: "landing-page",
    name: "Landing Page",
    category: "Frontend",
    description:
      "A template for building a marketing landing page with hero section, feature highlights, social proof, pricing table, and call-to-action. Optimized for conversion and SEO.",
    icon: "Layout",
    templateContent: {
      title: "Build landing page for [Product/Feature]",
      description:
        "Design and implement a high-converting landing page that communicates the value proposition, showcases key features, and drives signups or conversions.\n\n**Sections:**\n1. Hero - Headline, subheadline, primary CTA button, hero image/animation\n2. Social proof - Logos, testimonials, or user count\n3. Features - 3-6 feature cards with icons and descriptions\n4. How it works - 3-step process with illustrations\n5. Pricing - Plan comparison table with feature checklist\n6. FAQ - Accordion with common questions\n7. Footer CTA - Final call-to-action with signup form\n8. Footer - Links, legal, social media\n\n**Performance:** Target Lighthouse score of 95+ for Performance and 100 for Accessibility.",
      userStory:
        "As a potential customer visiting the website, I want to quickly understand what the product does, how it benefits me, and how to get started so that I can make an informed decision about signing up.",
      acceptanceCriteria: [
        {
          given: "I visit the landing page URL",
          when: "the page loads",
          then: "the hero section is visible above the fold with a clear headline, subheadline, and CTA button within 1.5 seconds (LCP)",
        },
        {
          given: "I scroll through the page",
          when: "I reach the pricing section",
          then: "I can compare all plan tiers side by side with feature checklists and clear 'Get Started' buttons for each tier",
        },
        {
          given: "I view the page source or run Lighthouse",
          when: "I check SEO factors",
          then: "the page has proper meta tags (title, description, og:image), semantic HTML structure, and structured data (JSON-LD)",
        },
        {
          given: "I am viewing the page on a mobile device",
          when: "I interact with all sections",
          then: "the layout is fully responsive with no horizontal scroll, readable text without zooming, and tap targets at least 44px",
        },
        {
          given: "I click the primary CTA button",
          when: "the click event fires",
          then: "I am taken to the signup page or shown a signup modal and the click is tracked in analytics",
        },
      ],
      type: "feature",
      priority: "HIGH",
      storyPoints: 13,
    },
  },
  {
    slug: "crud-feature",
    name: "CRUD Feature",
    category: "Full Stack",
    description:
      "A template for implementing a complete Create, Read, Update, Delete feature with database model, API routes, form UI, list/table view, and confirmation dialogs.",
    icon: "Database",
    templateContent: {
      title: "Implement CRUD for [Resource Name]",
      description:
        "Build a complete CRUD interface for managing [resource]. This includes the Prisma data model, API routes (GET, POST, PATCH, DELETE), a list/table view with sorting and filtering, a create/edit form with validation, and a delete confirmation dialog.\n\n**Data Model:**\n- id (cuid)\n- name (string, required)\n- description (string, optional)\n- status (enum)\n- createdAt, updatedAt (timestamps)\n- userId (relation to User)\n\n**Pages/Components:**\n- List view with search, sort by column, pagination\n- Create dialog/page with validated form\n- Edit dialog/page pre-filled with existing data\n- Delete confirmation modal with resource name\n\n**API Routes:**\n- GET /api/[resource] - List with query params for search, sort, page\n- POST /api/[resource] - Create with Zod validation\n- PATCH /api/[resource]/[id] - Update with partial Zod validation\n- DELETE /api/[resource]/[id] - Soft delete or hard delete",
      userStory:
        "As an authenticated user, I want to create, view, edit, and delete [resources] so that I can manage my [resources] entirely within the application.",
      acceptanceCriteria: [
        {
          given: "I am on the resource list page",
          when: "I click 'Create New' and fill in the required fields",
          then: "a new resource is created, appears in the list without a page refresh, and I see a success toast notification",
        },
        {
          given: "I have existing resources in the list",
          when: "I click on a resource to edit it and modify a field",
          then: "the changes are saved to the database and the list updates to reflect the new values optimistically",
        },
        {
          given: "I want to delete a resource",
          when: "I click the delete button and confirm in the dialog",
          then: "the resource is removed from the database and disappears from the list with an undo option available for 5 seconds",
        },
        {
          given: "I have more than 20 resources",
          when: "I view the list page",
          then: "the list is paginated with 20 items per page and I can navigate between pages",
        },
        {
          given: "I type in the search field",
          when: "I enter at least 2 characters",
          then: "the list is filtered in real-time (debounced 300ms) to show only matching resources",
        },
      ],
      type: "feature",
      priority: "MEDIUM",
      storyPoints: 8,
    },
  },
  {
    slug: "billing-integration",
    name: "Billing Integration",
    category: "Backend",
    description:
      "A template for integrating a payment provider (Stripe, Paddle) with subscription management, webhook handling, plan upgrades/downgrades, and billing portal access.",
    icon: "CreditCard",
    templateContent: {
      title: "Integrate [Payment Provider] for subscription billing",
      description:
        "Implement subscription billing using [Stripe/Paddle] including checkout flow, webhook processing, plan management, and billing portal.\n\n**Requirements:**\n- Checkout session creation for new subscriptions\n- Webhook handler for payment events (subscription created, updated, cancelled, payment failed)\n- Plan tier enforcement (free vs pro feature gating)\n- Billing portal redirect for customers to manage their subscription\n- Subscription status tracking in the database\n- Grace period handling for failed payments\n\n**Plans:**\n- Free: Limited features, X items/month\n- Pro ($19/mo): Unlimited features, priority support\n\n**Security:** Webhook signatures must be verified using HMAC. Never trust client-side plan data.",
      userStory:
        "As a user who wants to upgrade to a paid plan, I want a smooth checkout experience with clear pricing so that I can unlock premium features and manage my subscription easily.",
      acceptanceCriteria: [
        {
          given: "I am on the free plan and click 'Upgrade to Pro'",
          when: "I complete the checkout flow with the payment provider",
          then: "my account is upgraded to Pro within 30 seconds, premium features are unlocked, and I receive a confirmation email",
        },
        {
          given: "my subscription renews or a payment event occurs",
          when: "the payment provider sends a webhook",
          then: "the webhook signature is verified using HMAC and the subscription status in our database is updated accordingly",
        },
        {
          given: "a payment fails for my subscription",
          when: "the payment provider notifies us via webhook",
          then: "my account enters a grace period with a banner prompting me to update my payment method before features are restricted",
        },
        {
          given: "I want to manage my subscription (cancel, update card, view invoices)",
          when: "I click 'Manage Billing' in my account settings",
          then: "I am redirected to the payment provider's customer portal where I can make changes",
        },
        {
          given: "I attempt to use a Pro-only feature on the free plan",
          when: "the feature gate check runs",
          then: "I see an upgrade prompt with the feature's value proposition and a direct link to the checkout page",
        },
      ],
      type: "feature",
      priority: "HIGH",
      storyPoints: 13,
    },
  },
  {
    slug: "database-migration",
    name: "Database Migration",
    category: "Backend",
    description:
      "A template for planning and executing database schema changes including new tables, column modifications, data migrations, index optimization, and rollback procedures.",
    icon: "HardDrive",
    templateContent: {
      title: "Database: [Add/Modify/Remove] [table/column] for [feature]",
      description:
        "Plan and execute a database schema change to support [feature/requirement]. This includes modifying the Prisma schema, generating and reviewing the migration, handling existing data, and verifying the change in staging before production.\n\n**Schema Changes:**\n- Add/modify/remove [table/column]\n- Add/update indexes for query performance\n- Update relations if applicable\n\n**Data Migration:**\n- Backfill strategy for existing rows\n- Default values for new non-nullable columns\n- Data transformation logic if restructuring\n\n**Rollback Plan:**\n- Document the reverse migration steps\n- Ensure the rollback doesn't cause data loss\n- Test rollback in staging environment",
      userStory:
        "As a developer, I want the database schema updated to support [feature] so that the application can store and query the new data efficiently without affecting existing functionality.",
      acceptanceCriteria: [
        {
          given: "the Prisma schema has been updated with the new changes",
          when: "I run `npx prisma db push` against the development database",
          then: "the migration applies successfully without errors and the schema matches the expected state",
        },
        {
          given: "there is existing data in the affected tables",
          when: "the migration runs",
          then: "existing data is preserved and new columns have appropriate default values or are backfilled correctly",
        },
        {
          given: "the migration has been applied",
          when: "the application runs its queries against the updated schema",
          then: "all existing features continue to work correctly and new queries for the feature return expected results",
        },
        {
          given: "the migration has been applied to staging",
          when: "I run the full test suite",
          then: "all tests pass and no regressions are detected in related functionality",
        },
      ],
      type: "chore",
      priority: "HIGH",
      storyPoints: 5,
    },
  },
  {
    slug: "testing-suite",
    name: "Testing Suite",
    category: "Quality",
    description:
      "A template for implementing a comprehensive test suite covering unit tests, integration tests, and end-to-end tests for a feature or module.",
    icon: "FlaskConical",
    templateContent: {
      title: "Add test coverage for [Feature/Module]",
      description:
        "Implement comprehensive test coverage for [feature/module] including unit tests for business logic, integration tests for API routes, and end-to-end tests for critical user flows.\n\n**Scope:**\n- Unit tests for utility functions and business logic\n- Integration tests for API endpoints (request/response contracts, auth, validation)\n- E2E tests for critical user-facing workflows\n- Edge cases and error scenarios\n\n**Tools:**\n- Unit/Integration: Vitest or Jest\n- E2E: Playwright\n- API testing: Supertest or native fetch\n- Mocking: Vitest mocks, MSW for network\n\n**Coverage Target:** 80%+ line coverage for the module",
      userStory:
        "As a developer, I want thorough test coverage for [feature] so that I can refactor and extend the code with confidence that regressions will be caught automatically.",
      acceptanceCriteria: [
        {
          given: "the test suite is written",
          when: "I run the test command",
          then: "all tests pass and line coverage for the target module is at least 80%",
        },
        {
          given: "I intentionally break the feature logic",
          when: "I run the test suite",
          then: "at least one test fails, clearly indicating which behavior broke and in which file",
        },
        {
          given: "the API integration tests are running",
          when: "they test authentication-required endpoints",
          then: "tests verify both authenticated (200) and unauthenticated (401) responses",
        },
        {
          given: "the E2E tests are running",
          when: "they simulate the primary user workflow",
          then: "the test completes the full flow (navigate, interact, submit, verify result) without flakiness across 5 consecutive runs",
        },
        {
          given: "the test suite is added to CI",
          when: "a pull request is opened",
          then: "tests run automatically and the PR is blocked from merging if any test fails",
        },
      ],
      type: "test",
      priority: "MEDIUM",
      storyPoints: 8,
    },
  },
  {
    slug: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    category: "DevOps",
    description:
      "A template for setting up or improving a continuous integration and deployment pipeline with build, lint, test, and deploy stages.",
    icon: "GitBranch",
    templateContent: {
      title: "Set up CI/CD pipeline with [GitHub Actions/GitLab CI]",
      description:
        "Implement a CI/CD pipeline that automatically builds, lints, tests, and deploys the application on every push and pull request.\n\n**Pipeline Stages:**\n1. Install - Install dependencies with caching\n2. Lint - Run ESLint and type checking\n3. Test - Run unit and integration tests\n4. Build - Production build with environment validation\n5. Deploy (main only) - Deploy to staging/production\n\n**Requirements:**\n- Parallel job execution where possible\n- Dependency caching (node_modules, .next/cache)\n- Environment-specific deploy targets\n- Slack/Discord notification on failure\n- Branch protection rules requiring CI pass",
      userStory:
        "As a developer, I want an automated CI/CD pipeline so that every change is validated before merging and deployments happen automatically without manual intervention.",
      acceptanceCriteria: [
        {
          given: "I push a commit or open a pull request",
          when: "the CI pipeline triggers",
          then: "it runs lint, type check, and tests in parallel and reports results within 5 minutes",
        },
        {
          given: "any CI step fails (lint error, test failure, build error)",
          when: "the pipeline completes",
          then: "the PR is marked as failing with a clear error message and the developer is notified",
        },
        {
          given: "a commit is pushed to the main branch and all CI checks pass",
          when: "the deploy stage runs",
          then: "the application is deployed to the target environment and a health check confirms it is running",
        },
        {
          given: "the pipeline runs multiple times in a day",
          when: "dependencies have not changed",
          then: "the cache is restored and the install step completes in under 30 seconds",
        },
      ],
      type: "chore",
      priority: "HIGH",
      storyPoints: 8,
    },
  },
  {
    slug: "performance-optimization",
    name: "Performance Optimization",
    category: "Quality",
    description:
      "A template for identifying and resolving performance bottlenecks including bundle size reduction, query optimization, caching strategies, and Core Web Vitals improvements.",
    icon: "Gauge",
    templateContent: {
      title: "Optimize performance for [Page/Feature/API]",
      description:
        "Identify and resolve performance bottlenecks in [page/feature/API endpoint] to improve load times, reduce bundle size, and meet Core Web Vitals thresholds.\n\n**Current State:**\n- LCP: [current] ms (target: < 2500ms)\n- FID/INP: [current] ms (target: < 200ms)\n- CLS: [current] (target: < 0.1)\n- Bundle size: [current] KB (target: reduce by 20%+)\n- API response time: [current] ms (target: < 500ms)\n\n**Investigation Areas:**\n- Component re-renders and memoization\n- Image optimization (next/image, WebP, lazy loading)\n- Code splitting and dynamic imports\n- Database query N+1 problems\n- Caching headers and CDN configuration\n- Third-party script impact",
      userStory:
        "As a user, I want the application to load and respond quickly so that I can complete my tasks without frustration caused by slow page loads or laggy interactions.",
      acceptanceCriteria: [
        {
          given: "the optimizations are deployed",
          when: "I run a Lighthouse performance audit on the target page",
          then: "the Performance score is 90 or above and all Core Web Vitals are in the 'Good' range",
        },
        {
          given: "the JavaScript bundle has been optimized",
          when: "I analyze the bundle with next/bundle-analyzer",
          then: "the total JS shipped to the client is reduced by at least 20% compared to the pre-optimization baseline",
        },
        {
          given: "the API endpoint has been optimized",
          when: "I measure the p95 response time under normal load",
          then: "responses return within 500ms and database queries use efficient indexes without N+1 patterns",
        },
        {
          given: "the optimizations are in place",
          when: "I navigate through the application on a mid-tier mobile device (Moto G Power)",
          then: "the experience feels smooth with no visible jank, layout shifts, or input delay",
        },
      ],
      type: "chore",
      priority: "MEDIUM",
      storyPoints: 8,
    },
  },
  {
    slug: "accessibility-audit",
    name: "Accessibility Audit",
    category: "Quality",
    description:
      "A template for conducting an accessibility audit and implementing fixes to ensure the application meets WCAG 2.1 AA standards. Covers keyboard navigation, screen reader support, color contrast, and ARIA attributes.",
    icon: "Eye",
    templateContent: {
      title: "Accessibility audit and fixes for [Page/Feature]",
      description:
        "Conduct a thorough accessibility audit of [page/feature] and implement fixes to achieve WCAG 2.1 Level AA compliance.\n\n**Audit Checklist:**\n- Keyboard navigation: All interactive elements reachable and operable via keyboard\n- Screen reader: Correct heading hierarchy, ARIA labels, live regions for dynamic content\n- Color contrast: All text meets 4.5:1 contrast ratio (3:1 for large text)\n- Focus management: Visible focus indicators, logical tab order, focus trapping in modals\n- Forms: Labels associated with inputs, error messages announced, required fields indicated\n- Images: Alt text for meaningful images, decorative images hidden from assistive tech\n- Motion: Respect prefers-reduced-motion, no auto-playing animations\n\n**Tools:** axe-core, Lighthouse Accessibility, VoiceOver/NVDA manual testing",
      userStory:
        "As a user with a disability, I want the application to be fully accessible so that I can use all features with my assistive technology (screen reader, keyboard, switch device) without barriers.",
      acceptanceCriteria: [
        {
          given: "the accessibility fixes are implemented",
          when: "I run the axe-core accessibility scanner on the target pages",
          then: "zero critical or serious accessibility violations are reported",
        },
        {
          given: "I navigate the page using only the keyboard",
          when: "I tab through all interactive elements",
          then: "every button, link, and form field is reachable with a visible focus indicator and a logical tab order",
        },
        {
          given: "I use a screen reader (VoiceOver or NVDA)",
          when: "I navigate through the page",
          then: "all content is announced correctly including headings, form labels, button purposes, and dynamic status updates via live regions",
        },
        {
          given: "I have prefers-reduced-motion enabled in my OS settings",
          when: "the page renders and I interact with it",
          then: "all animations are disabled or reduced to simple opacity/color transitions",
        },
        {
          given: "the Lighthouse Accessibility audit is run",
          when: "the audit completes",
          then: "the score is 95 or above",
        },
      ],
      type: "chore",
      priority: "MEDIUM",
      storyPoints: 8,
    },
  },
  {
    slug: "security-review",
    name: "Security Review",
    category: "Quality",
    description:
      "A template for conducting a security review covering authentication, authorization, input validation, injection prevention, secrets management, and dependency auditing.",
    icon: "Shield",
    templateContent: {
      title: "Security review for [Feature/Module/Release]",
      description:
        "Perform a comprehensive security review of [feature/module] to identify and mitigate vulnerabilities before release.\n\n**Review Scope:**\n- Authentication: Session management, token expiry, credential storage (bcrypt cost factor)\n- Authorization: RBAC enforcement, IDOR prevention, privilege escalation checks\n- Input validation: Zod schemas on all API inputs, request body size limits\n- Injection: SQL injection (parameterized queries via Prisma), XSS (output encoding), command injection (execFileSync with arrays)\n- Secrets: No hardcoded secrets, environment variable usage, timing-safe comparison\n- Dependencies: `npm audit` for known vulnerabilities\n- CSRF/CORS: Proper origin validation\n- Rate limiting: Brute force protection on auth routes\n- Error handling: No sensitive data in error responses (sanitizeError)\n\n**Severity Classification:** Critical (immediate fix), High (fix before release), Medium (fix in next sprint), Low (backlog)",
      userStory:
        "As a security-conscious developer, I want a thorough security review of this feature so that I can be confident it does not introduce vulnerabilities that could compromise user data or system integrity.",
      acceptanceCriteria: [
        {
          given: "the security review has been conducted",
          when: "all critical and high severity issues are identified",
          then: "each issue has a documented remediation plan and critical issues are fixed before the feature ships",
        },
        {
          given: "API endpoints are reviewed for authorization",
          when: "a user attempts to access a resource belonging to another user or project",
          then: "the request is rejected with a 403 or 404 response and no data is leaked",
        },
        {
          given: "all API inputs are reviewed",
          when: "malicious input is submitted (SQL injection strings, XSS payloads, oversized bodies)",
          then: "the input is rejected by Zod validation or sanitized before processing, and no injection succeeds",
        },
        {
          given: "`npm audit` is run on the project",
          when: "the audit completes",
          then: "there are zero critical or high severity vulnerabilities in production dependencies",
        },
        {
          given: "error responses are reviewed",
          when: "an internal error occurs in any API route",
          then: "the response contains a generic error message and no internal paths, stack traces, tokens, or database details are exposed",
        },
      ],
      type: "chore",
      priority: "CRITICAL",
      storyPoints: 8,
    },
  },
  {
    slug: "documentation",
    name: "Documentation",
    category: "Docs",
    description:
      "A template for writing technical documentation including API reference, setup guides, architecture decisions, and developer onboarding materials.",
    icon: "FileText",
    templateContent: {
      title: "Document [Feature/API/Architecture Decision]",
      description:
        "Write comprehensive documentation for [feature/API/architecture] to improve developer onboarding, reduce support burden, and ensure knowledge is shared across the team.\n\n**Documentation Scope:**\n- Overview and purpose of the feature/system\n- Setup and configuration instructions with environment variables\n- API reference with request/response examples\n- Architecture decision records (ADR) for significant choices\n- Troubleshooting guide with common issues and solutions\n- Code examples and usage patterns\n\n**Format:** Markdown files in the repository, API docs in OpenAPI spec, inline JSDoc for complex functions.\n\n**Audience:** New developers joining the project, external API consumers, future maintainers.",
      userStory:
        "As a developer joining the project or consuming the API, I want clear and up-to-date documentation so that I can understand how the system works and get productive quickly without relying on tribal knowledge.",
      acceptanceCriteria: [
        {
          given: "a new developer reads the documentation",
          when: "they follow the setup guide",
          then: "they can get the project running locally within 15 minutes without asking for help",
        },
        {
          given: "the API documentation is updated",
          when: "a developer checks the OpenAPI spec or Swagger UI",
          then: "all endpoints are documented with descriptions, parameter types, request/response examples, and authentication requirements",
        },
        {
          given: "the documentation covers a complex system",
          when: "I read the architecture section",
          then: "I understand the key components, data flow, and design decisions including the rationale for each significant choice",
        },
        {
          given: "the documentation is committed to the repository",
          when: "I check the troubleshooting section",
          then: "it covers at least 5 common issues with clear problem descriptions, root causes, and step-by-step solutions",
        },
      ],
      type: "docs",
      priority: "LOW",
      storyPoints: 5,
    },
  },
];

export function getTemplate(slug: string): Template | undefined {
  return templates.find((t) => t.slug === slug);
}
