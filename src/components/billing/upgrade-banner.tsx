"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface UpgradeBannerProps {
  message: string;
}

export function UpgradeBanner({ message }: UpgradeBannerProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-primary">{message}</p>
      <Button asChild size="sm" variant="outline" className="flex-shrink-0">
        <Link href="/billing">
          Upgrade <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
