"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Rocket, ArrowRight, Check, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "there";

  async function handleOrgStep() {
    if (orgName.trim() && session?.user?.orgId) {
      setLoading(true);
      try {
        await fetch(`/api/orgs/${session.user.orgId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName.trim() }),
        });
      } catch {
        // Non-blocking - continue even if rename fails
      }
      setLoading(false);
    }
    setStep(1);
  }

  async function handleProjectStep() {
    if (!projectName.trim()) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });
    } catch {
      // Non-blocking
    }
    setLoading(false);
    setStep(2);
  }

  async function handleComplete() {
    setLoading(true);
    await fetch("/api/account/onboarding", { method: "PATCH" }).catch(() => {});
    // Refresh the session so the JWT gets the updated onboardingCompleted=true
    // Use a timeout to avoid hanging indefinitely
    await Promise.race([
      update().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    // Full page navigation so middleware picks up the fresh JWT cookie
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg p-8 space-y-6">
        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i <= step ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Rocket className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome to Codepylot, {userName}!</h1>
              <p className="text-muted-foreground mt-2">
                Let&apos;s set up your workspace in a few seconds.
              </p>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Workspace Name</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={`${userName}'s Workspace`}
              />
            </div>
            <Button onClick={handleOrgStep} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-xl font-bold">Create Your First Project</h2>
              <p className="text-muted-foreground mt-2">
                Give your project a name or skip for now.
              </p>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome App"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleProjectStep} className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Project
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
                <Check className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground mt-2">
                Your workspace is ready. Start capturing ideas and let AI turn them into code.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
