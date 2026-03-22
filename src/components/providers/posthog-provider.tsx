"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, Suspense } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function PostHogInit() {
  const initRef = useRef(false);

  useEffect(() => {
    if (!POSTHOG_KEY || initRef.current) return;
    initRef.current = true;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      enable_recording_console_log: true,
    });
  }, []);

  return null;
}

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { data: session, status } = useSession();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;

    if (status === "authenticated" && session?.user?.id) {
      if (prevUserId.current !== session.user.id) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.name,
          orgId: session.user.orgId,
        });
        prevUserId.current = session.user.id;
      }
    } else if (status === "unauthenticated" && prevUserId.current) {
      posthog.reset();
      prevUserId.current = null;
    }
  }, [session, status]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
