"use client";

import { useState } from "react";
import Link from "next/link";
import { Wand2, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

interface GeneratedStory {
  title: string;
  userStory: string;
  acceptanceCriteria: { given: string; when: string; then: string }[];
  storyPoints: number;
  priority: string;
  type: string;
}

const EXAMPLES = [
  "Add a dark mode toggle to the settings page",
  "User should be able to export data as CSV",
  "Implement forgot password flow with email reset",
  "Add real-time notifications for team updates",
  "Build a dashboard with charts showing key metrics",
];

function generateStory(input: string): GeneratedStory {
  const lower = input.toLowerCase();
  const isAuth = /auth|login|signup|password|2fa|oauth/i.test(lower);
  const isUI = /page|button|modal|form|ui|design|dark|theme|toggle/i.test(lower);
  const isAPI = /api|endpoint|webhook|integration|export|import/i.test(lower);
  const isBug = /fix|bug|broken|error|crash|issue/i.test(lower);

  const type = isBug ? "bug" : isAPI ? "feature" : isUI ? "feature" : isAuth ? "feature" : "feature";
  const points = isAuth ? 5 : isAPI ? 3 : isUI ? 2 : 3;
  const priority = isBug ? "HIGH" : isAuth ? "HIGH" : "MEDIUM";

  const title = input.length > 80 ? input.slice(0, 77) + "..." : input.charAt(0).toUpperCase() + input.slice(1);

  const role = isAuth ? "registered user" : isAPI ? "developer" : isUI ? "user" : "user";
  const benefit = isAuth
    ? "I can securely access my account"
    : isAPI
    ? "I can integrate with external systems"
    : isUI
    ? "I have a better experience using the application"
    : "I can accomplish my goals more efficiently";

  const criteria: { given: string; when: string; then: string }[] = [
    {
      given: `I am a ${role} on the relevant page`,
      when: `I interact with the ${title.toLowerCase().includes("button") ? "button" : "feature"}`,
      then: "the expected behavior occurs without errors",
    },
    {
      given: "I have the required permissions",
      when: "I perform the main action described in the story",
      then: "the system responds within 2 seconds and shows a success confirmation",
    },
    {
      given: "I provide invalid or missing input",
      when: "I attempt to use the feature",
      then: "I see a clear, user-friendly error message explaining what went wrong",
    },
  ];

  if (isAuth) {
    criteria.push({
      given: "I am not authenticated",
      when: "I try to access a protected resource",
      then: "I am redirected to the login page with a return URL preserved",
    });
  }

  if (isAPI) {
    criteria.push({
      given: "the external service is unavailable",
      when: "I trigger the integration",
      then: "I see a graceful error message and my data is not lost",
    });
  }

  return {
    title,
    userStory: `As a ${role}, I want to ${input.toLowerCase()} so that ${benefit}.`,
    acceptanceCriteria: criteria,
    storyPoints: points,
    priority,
    type,
  };
}

function StoryOutput({ story }: { story: GeneratedStory }) {
  const [copied, setCopied] = useState(false);

  const markdown = `## ${story.title}

**User Story:** ${story.userStory}

**Type:** ${story.type} | **Priority:** ${story.priority} | **Story Points:** ${story.storyPoints}

### Acceptance Criteria

${story.acceptanceCriteria.map((ac) => `- **Given** ${ac.given}\n  **When** ${ac.when}\n  **Then** ${ac.then}`).join("\n\n")}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{story.title}</h3>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="text-muted-foreground">{story.userStory}</p>

      <div className="flex gap-3 text-sm">
        <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-blue-800 dark:text-blue-200">
          {story.type}
        </span>
        <span className="rounded-full bg-orange-100 dark:bg-orange-900 px-2.5 py-0.5 text-orange-800 dark:text-orange-200">
          {story.priority}
        </span>
        <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2.5 py-0.5 text-purple-800 dark:text-purple-200">
          {story.storyPoints} pts
        </span>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">Acceptance Criteria</h4>
        {story.acceptanceCriteria.map((ac, i) => (
          <div key={i} className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><span className="font-medium text-green-600 dark:text-green-400">Given</span> {ac.given}</p>
            <p><span className="font-medium text-blue-600 dark:text-blue-400">When</span> {ac.when}</p>
            <p><span className="font-medium text-purple-600 dark:text-purple-400">Then</span> {ac.then}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserStoryGeneratorPage() {
  const [input, setInput] = useState("");
  const [story, setStory] = useState<GeneratedStory | null>(null);

  function handleGenerate() {
    if (!input.trim()) return;
    setStory(generateStory(input.trim()));
  }

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/tools/user-story-generator" },
            { label: "User Story Generator" },
          ]}
        />

        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free User Story Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Turn your rough feature idea into a structured user story with acceptance criteria in
            Given/When/Then format. No signup required.
          </p>
        </div>

        <div className="space-y-4">
          <label htmlFor="idea" className="block font-medium">
            Describe your feature idea
          </label>
          <textarea
            id="idea"
            className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Add a dark mode toggle to the settings page"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Press Cmd+Enter to generate</p>
            <Button onClick={handleGenerate} disabled={!input.trim()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Story
            </Button>
          </div>
        </div>

        {!story && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  onClick={() => {
                    setInput(ex);
                    setStory(generateStory(ex));
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {story && <StoryOutput story={story} />}

        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Want AI-powered story generation?</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Codepylot uses Claude to generate richer stories with context-aware acceptance criteria,
            story points, and priority — plus autonomous AI agents that implement the stories for you.
          </p>
          <Button asChild>
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">How to Write Good User Stories</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <p>
              A user story follows the format: <strong>As a</strong> [type of user], <strong>I want</strong> [action] <strong>so that</strong> [benefit].
              This format keeps stories focused on user value rather than technical implementation.
            </p>
            <h3>Tips for Better Stories</h3>
            <ul>
              <li><strong>Keep them small</strong> — If a story takes more than a few days, split it.</li>
              <li><strong>Write acceptance criteria</strong> — Given/When/Then format makes stories testable.</li>
              <li><strong>Focus on the user</strong> — Stories describe what users need, not how to build it.</li>
              <li><strong>Include the &ldquo;so that&rdquo;</strong> — Understanding the benefit prevents building the wrong thing.</li>
            </ul>
            <h3>Common Mistakes</h3>
            <ul>
              <li>Writing technical tasks instead of user stories</li>
              <li>Making stories too large (split into smaller pieces)</li>
              <li>Skipping acceptance criteria (how do you know it&apos;s done?)</li>
              <li>Forgetting edge cases and error states</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "What is a user story?",
                a: "A user story is a short description of a feature from the end user's perspective. It follows the format: As a [user], I want [action] so that [benefit]. It helps teams understand what to build and why.",
              },
              {
                q: "What is the Given/When/Then format?",
                a: "Given/When/Then is a structured format for writing acceptance criteria. 'Given' sets the context, 'When' describes the action, and 'Then' states the expected outcome. It makes requirements clear and testable.",
              },
              {
                q: "How many acceptance criteria should a story have?",
                a: "Most stories should have 3-5 acceptance criteria covering the happy path, error cases, and edge cases. If you have more than 7, consider splitting the story.",
              },
              {
                q: "Is this tool free?",
                a: "Yes, this user story generator is completely free with no signup required. For AI-powered story generation with richer output, try Codepylot's free tier.",
              },
            ].map((faq) => (
              <details key={faq.q} className="rounded-lg border p-4 group">
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
            name: "Free User Story Generator",
            description: "Turn rough feature ideas into structured user stories with acceptance criteria in Given/When/Then format.",
            url: "https://codepylot.io/tools/user-story-generator",
            applicationCategory: "DeveloperApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            author: { "@type": "Organization", name: "Codepylot" },
          }),
        }}
      />
    </SeoPageLayout>
  );
}
