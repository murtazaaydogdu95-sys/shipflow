"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StandupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function StandupDialog({ open, onOpenChange, projectId }: StandupDialogProps) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useSWR(
    open ? `/api/projects/${projectId}/standup` : null,
    fetcher
  );

  function handleCopy() {
    if (data?.summary) {
      navigator.clipboard.writeText(data.summary);
      setCopied(true);
      toast.success("Standup copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Daily Standup</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-sans bg-muted rounded-lg p-4">
                  {data?.summary || "No standup data available."}
                </pre>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
