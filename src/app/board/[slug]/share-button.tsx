"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Board link copied to clipboard");
      }}
      data-testid="public-board-share-btn"
    >
      <Share2 className="h-3.5 w-3.5" />
      Share
    </Button>
  );
}
