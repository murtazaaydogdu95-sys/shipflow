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
    answer: "Codepylot is an AI-powered sprint board that turns your rough ideas into shipped code. You type what you want to build, AI structures it into a user story with acceptance criteria, and autonomous Claude Code agents implement it while you review.",
  },
  {
    question: "How does the AI coding agent work?",
    answer: "Codepylot spawns Claude Code agents that autonomously pick up stories from your board, create feature branches, write the code, and submit it for your review. You approve, request changes, or revert with one click.",
  },
  {
    question: "Is Codepylot free?",
    answer: "Yes. The free plan includes 3 projects, 15 stories per project, and 4 AI rewrites per month. Pro ($19/mo) and Pro Max ($39/mo) plans unlock unlimited projects, stories, and parallel agents.",
  },
  {
    question: "How is Codepylot different from Linear or Jira?",
    answer: "Unlike Linear or Jira, Codepylot doesn't just track work — it does the work. AI agents autonomously write code from your stories, create branches, and submit pull requests. It's a sprint board that ships code.",
  },
  {
    question: "Does Codepylot work with GitHub?",
    answer: "Yes. Codepylot integrates with GitHub for automatic branch creation, commit linking via [SF-XXX] tags, webhook-driven status updates, and one-click merge from the review panel.",
  },
  {
    question: "What is vibe coding?",
    answer: "Vibe coding is a development approach where you describe what you want in natural language and AI builds it. Codepylot takes this further by combining vibe coding with structured sprint management, so your AI-built code is organized and reviewable.",
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
