"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, Copy, Check, ArrowRight, Sparkles, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

interface Criterion {
  given: string;
  when: string;
  then: string;
}

const EXAMPLES = [
  { label: "Login form", input: "User login with email and password" },
  { label: "File upload", input: "Upload profile picture with preview" },
  { label: "Search", input: "Full-text search across all items" },
  { label: "Checkout", input: "Checkout flow with credit card payment" },
  { label: "Notifications", input: "Real-time notification bell with mark as read" },
];

function generateCriteria(input: string): Criterion[] {
  const lower = input.toLowerCase();
  const criteria: Criterion[] = [];

  // Happy path
  criteria.push({
    given: `I am on the relevant page for "${input}"`,
    when: "I complete the primary action with valid input",
    then: "the system processes my request successfully and shows a confirmation",
  });

  // Validation
  criteria.push({
    given: "I am interacting with this feature",
    when: "I submit without required fields or with invalid data",
    then: "I see specific validation errors next to each invalid field",
  });

  // Loading state
  criteria.push({
    given: "I have submitted my request",
    when: "the system is processing",
    then: "I see a loading indicator and the submit button is disabled to prevent duplicate submissions",
  });

  // Error handling
  criteria.push({
    given: "the server returns an error",
    when: "I attempt to use this feature",
    then: "I see a user-friendly error message and my input is preserved so I can retry",
  });

  // Auth-related
  if (/login|auth|signup|password|register/i.test(lower)) {
    criteria.push({
      given: "I enter incorrect credentials",
      when: "I attempt to authenticate",
      then: "I see a generic error 'Invalid email or password' without revealing which field is wrong",
    });
    criteria.push({
      given: "I am already authenticated",
      when: "I navigate to the login page",
      then: "I am redirected to the dashboard automatically",
    });
  }

  // Upload-related
  if (/upload|file|image|photo|picture|attach/i.test(lower)) {
    criteria.push({
      given: "I select a file that exceeds the size limit",
      when: "I attempt to upload",
      then: "I see an error message stating the maximum file size allowed",
    });
    criteria.push({
      given: "I select a file with an unsupported format",
      when: "I attempt to upload",
      then: "I see an error message listing the accepted file formats",
    });
  }

  // Search-related
  if (/search|filter|find|query/i.test(lower)) {
    criteria.push({
      given: "I enter a search query with no matching results",
      when: "the search completes",
      then: 'I see an empty state with the message "No results found" and suggestions to refine my search',
    });
    criteria.push({
      given: "I type in the search field",
      when: "I pause typing for 300ms",
      then: "results are filtered automatically without needing to press a button",
    });
  }

  // Payment-related
  if (/pay|checkout|billing|subscribe|purchase|order|cart/i.test(lower)) {
    criteria.push({
      given: "I enter my payment details",
      when: "the payment is processed successfully",
      then: "I see a confirmation page with my order details and receive a confirmation email",
    });
    criteria.push({
      given: "my payment is declined",
      when: "I attempt to complete the purchase",
      then: "I see an error message suggesting I try a different payment method and my cart is preserved",
    });
  }

  // Notification-related
  if (/notif|alert|bell|message|toast/i.test(lower)) {
    criteria.push({
      given: "I have unread notifications",
      when: "I view the notification list",
      then: "unread notifications are visually distinct and the unread count badge updates",
    });
  }

  return criteria;
}

function CriteriaOutput({ criteria, featureName }: { criteria: Criterion[]; featureName: string }) {
  const [copied, setCopied] = useState(false);

  const markdown = `## Acceptance Criteria: ${featureName}\n\n${criteria
    .map(
      (c, i) =>
        `### Criterion ${i + 1}\n- **Given** ${c.given}\n- **When** ${c.when}\n- **Then** ${c.then}`
    )
    .join("\n\n")}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {criteria.length} Acceptance Criteria Generated
        </h3>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>
      </div>

      <div className="space-y-3">
        {criteria.map((ac, i) => (
          <div key={i} className="rounded-md bg-muted p-4 text-sm space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Criterion {i + 1}</p>
            <p>
              <span className="font-medium text-green-600 dark:text-green-400">Given </span>
              {ac.given}
            </p>
            <p>
              <span className="font-medium text-blue-600 dark:text-blue-400">When </span>
              {ac.when}
            </p>
            <p>
              <span className="font-medium text-purple-600 dark:text-purple-400">Then </span>
              {ac.then}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AcceptanceCriteriaGeneratorPage() {
  const [input, setInput] = useState("");
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);

  function handleGenerate() {
    if (!input.trim()) return;
    setCriteria(generateCriteria(input.trim()));
  }

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/tools/user-story-generator" },
            { label: "Acceptance Criteria Generator" },
          ]}
        />

        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <ListChecks className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free Acceptance Criteria Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate structured acceptance criteria in Given/When/Then format for any feature.
            Covers happy path, validation, errors, and edge cases. No signup required.
          </p>
        </div>

        <div className="space-y-4">
          <label htmlFor="feature" className="block font-medium">
            Describe the feature
          </label>
          <textarea
            id="feature"
            className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., User login with email and password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Press Cmd+Enter to generate</p>
            <Button onClick={handleGenerate} disabled={!input.trim()} className="bg-green-600 hover:bg-green-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Criteria
            </Button>
          </div>
        </div>

        {!criteria && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  onClick={() => {
                    setInput(ex.input);
                    setCriteria(generateCriteria(ex.input));
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {criteria && <CriteriaOutput criteria={criteria} featureName={input} />}

        <div className="rounded-lg border bg-gradient-to-r from-green-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Want AI-powered acceptance criteria?</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Codepylot uses Claude to generate context-aware acceptance criteria based on your
            codebase, tech stack, and existing patterns — then AI agents implement them automatically.
          </p>
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Guide to Given/When/Then Acceptance Criteria</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <p>
              The Given/When/Then format (also known as Gherkin syntax) is the industry standard for writing
              clear, testable acceptance criteria for user stories.
            </p>
            <h3>The Three Parts</h3>
            <ul>
              <li><strong>Given</strong> — The precondition or starting context. What state is the system in?</li>
              <li><strong>When</strong> — The action the user takes. What triggers the behavior?</li>
              <li><strong>Then</strong> — The expected outcome. What should happen?</li>
            </ul>
            <h3>Best Practices</h3>
            <ul>
              <li>Write from the user&apos;s perspective, not the developer&apos;s</li>
              <li>Cover the happy path, error cases, and edge cases</li>
              <li>Keep each criterion focused on one behavior</li>
              <li>Make criteria specific enough to test but general enough to allow implementation flexibility</li>
              <li>Aim for 3-5 criteria per story — more means the story should be split</li>
            </ul>
            <h3>Why AI Agents Love Given/When/Then</h3>
            <p>
              Autonomous coding agents (like those in Codepylot) perform significantly better when stories
              have clear Given/When/Then acceptance criteria. The structured format eliminates ambiguity
              and gives the agent concrete success conditions to implement against.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "What are acceptance criteria?",
                a: "Acceptance criteria define the conditions that must be met for a user story to be considered complete. They specify the expected behavior of a feature, including success scenarios, error handling, and edge cases.",
              },
              {
                q: "Why use Given/When/Then format?",
                a: "Given/When/Then provides a structured, consistent format that is easy to read, write, and test. It separates the precondition (Given), action (When), and expected result (Then), making requirements unambiguous.",
              },
              {
                q: "How many acceptance criteria should each story have?",
                a: "Most stories should have 3-5 acceptance criteria. If you need more than 7, the story is likely too large and should be split into smaller stories.",
              },
              {
                q: "Can AI agents use acceptance criteria?",
                a: "Yes. AI coding agents perform much better with clear acceptance criteria. Codepylot's autonomous agents read the Given/When/Then criteria and implement each condition, resulting in higher-quality code with fewer review cycles.",
              },
            ].map((faq) => (
              <details key={faq.q} className="rounded-lg border p-4">
                <summary className="font-medium cursor-pointer">{faq.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Free Acceptance Criteria Generator",
            description: "Generate structured acceptance criteria in Given/When/Then format for any feature.",
            url: "https://codepylot.io/tools/acceptance-criteria-generator",
            applicationCategory: "DeveloperApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            author: { "@type": "Organization", name: "Codepylot" },
          }),
        }}
      />
    </SeoPageLayout>
  );
}
