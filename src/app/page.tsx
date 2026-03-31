import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";
import { OrganizationSchema, SoftwareApplicationSchema, FAQSchema } from "@/components/seo/json-ld";

const homepageFaqs = [
  {
    question: "What is Codepylot?",
    answer: "Codepylot is an AI-powered sprint board with a managed agent workforce. You describe what you want built, AI structures it into stories, and persistent agents — running on Claude, OpenAI, or Ollama — write the code. Every change goes through Trust Gate: a mandatory human review with risk detection before anything merges.",
  },
  {
    question: "How do the AI agents work?",
    answer: "Codepylot runs persistent AI agents with specialized roles (Coder, Tester, Reviewer, Architect, and more). Agents pick up stories from your board, create branches, and write code autonomously. You choose the AI provider, set budget limits, and schedule agent work with cron expressions. Approve, reject with feedback, or let agents learn from your review patterns.",
  },
  {
    question: "Is Codepylot free?",
    answer: "Yes. The free plan includes 3 projects, 15 stories per project, 1 AI agent, and 15 AI rewrites per month. Pro ($19/user/mo) adds unlimited projects, 3 agents, multi-provider support, and budget tracking. Pro Max ($39/user/mo) adds 5 agents, approval workflows, advanced routines, and full cost analytics.",
  },
  {
    question: "How is Codepylot different from Linear or Jira?",
    answer: "Unlike Linear or Jira, Codepylot doesn't just track work — it does the work. You get a managed AI workforce with budget controls, approval workflows, goal alignment, and Trust Gate code review. It's project management plus an AI engineering team in one platform.",
  },
  {
    question: "What is Trust Gate?",
    answer: "Trust Gate is Codepylot's mandatory human review system. Before any AI-written code can merge, you must review the diff. The built-in viewer detects 7 risk patterns — hardcoded secrets, eval/XSS, raw SQL, debug logging, environment variables, and unresolved TODOs. Nothing ships without your explicit approval.",
  },
  {
    question: "Can I use my own AI provider?",
    answer: "Yes. Codepylot supports Claude, OpenAI, Ollama (run models locally), and custom HTTP webhook adapters. There's no vendor lock-in — switch providers at any time or use different providers for different agents.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <SocialProof />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <FAQSchema faqs={homepageFaqs} />
    </div>
  );
}
