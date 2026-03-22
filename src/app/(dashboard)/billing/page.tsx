"use client";

import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { useState, useEffect } from "react";
import { PricingCard } from "@/components/billing/pricing-card";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import useSWR from "swr";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: { token: string; environment?: string }) => void;
      Checkout: {
        open: (config: {
          items: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: { successUrl?: string };
        }) => void;
      };
    };
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground">{used} (unlimited)</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: "5%" }} />
        </div>
      </div>
    );
  }
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{used} / {limit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct < 70 ? "bg-green-500" : pct < 90 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || "sandbox";
const PADDLE_PRO_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || "";
const PADDLE_PRO_MAX_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRO_MAX_PRICE_ID || "";

export default function BillingPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const { data: org } = useSWR(orgId ? `/api/orgs/${orgId}` : null, fetcher);
  const { data: usage } = useSWR(orgId ? `/api/orgs/${orgId}/usage` : null, fetcher);
  const plan = org?.plan ?? "FREE";
  const isOwner = org?.role === "OWNER";
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) return;

    const init = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          environment: PADDLE_ENVIRONMENT,
        });
        setPaddleReady(true);
      }
    };

    if (window.Paddle) {
      init();
    } else {
      // Wait for Paddle.js to load
      const interval = setInterval(() => {
        if (window.Paddle) {
          init();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  function handleUpgrade(targetPlan: "PRO" | "PRO_MAX" = "PRO") {
    if (!window.Paddle || !paddleReady) return;

    const priceId = targetPlan === "PRO_MAX" ? PADDLE_PRO_MAX_PRICE_ID : PADDLE_PRO_PRICE_ID;
    if (!priceId) return;

    setLoading(true);
    posthog.capture("upgrade_initiated", { targetPlan, currentPlan: plan });
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: session?.user?.email || "" },
        customData: {
          orgId: orgId || "",
          userId: session?.user?.id || "",
        },
        settings: {
          successUrl: `${window.location.origin}/billing?success=true`,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    window.location.href = "/api/account/export";
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and account</p>
      </div>

      {usage && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Usage</h2>
          <div className="space-y-3">
            <UsageBar label="Projects" used={usage.projects.used} limit={usage.projects.limit} />
            <UsageBar
              label={`Stories${usage.stories.note ? ` (${usage.stories.note})` : ""}`}
              used={usage.stories.used}
              limit={usage.stories.limit}
            />
            <UsageBar
              label="AI Rewrites (this month)"
              used={usage.aiRewrites.used}
              limit={usage.aiRewrites.limit}
            />
            <div className="flex justify-between text-sm">
              <span>Team Members</span>
              <span className="text-muted-foreground">{usage.members.count}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <PricingCard
          name="Free"
          price="$0"
          description="For getting started"
          features={[
            "Up to 3 projects",
            "15 stories per project",
            "Kanban board",
            "4 AI rewrites/month",
          ]}
          current={plan === "FREE"}
        />
        <PricingCard
          name="Pro"
          price="$19/mo"
          description="For serious builders"
          features={[
            "Unlimited projects",
            "Unlimited stories",
            "50 AI rewrites/month",
            "Up to 3 parallel agents",
            "GitHub integration",
            "Priority support",
          ]}
          current={plan === "PRO"}
          onSelect={isOwner && plan === "FREE" ? () => handleUpgrade("PRO") : undefined}
          loading={loading}
        />
        <PricingCard
          name="Pro Max"
          price="$39/mo"
          description="For power users & teams"
          features={[
            "Everything in Pro",
            "Unlimited AI rewrites",
            "Up to 5 parallel agents",
            "Priority agent queue",
          ]}
          current={plan === "PRO_MAX"}
          onSelect={isOwner && plan !== "PRO_MAX" ? () => handleUpgrade("PRO_MAX") : undefined}
          loading={loading}
        />
      </div>

      {(plan === "PRO" || plan === "PRO_MAX") && isOwner && (
        <div>
          <Button onClick={handleManage} variant="outline" disabled={loading}>
            Manage Subscription
          </Button>
        </div>
      )}

      {!isOwner && (
        <p className="text-sm text-muted-foreground">
          Only organization owners can manage billing. Contact your org owner to make changes.
        </p>
      )}

      <div className="border-t pt-8 space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>Export Data</Button>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>Delete Account</Button>
        </div>
      </div>

      <DeleteAccountDialog open={showDelete} onOpenChange={setShowDelete} />
    </div>
  );
}
