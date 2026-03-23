"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, GitBranch, Globe, Loader2, Rocket, Send, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";

interface StoryReviewPanelProps {
  story: {
    shortId: string;
    agentNotes: string | null;
    branchName: string | null;
    previewPort: number | null;
    commitHash: string | null;
    deployStatus: string | null;
    deployUrl: string | null;
  };
  reviewLoading: boolean;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  onRevert: () => void;
  onDeploy: () => Promise<void>;
  deploying: boolean;
}

export function StoryReviewPanel({
  story,
  reviewLoading,
  onApprove,
  onReject,
  onRevert,
  onDeploy,
  deploying,
}: StoryReviewPanelProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");

  return (
    <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">Agent completed — awaiting your review</span>
      </div>
      {story.agentNotes && (
        <div className="text-sm text-muted-foreground bg-muted rounded p-3">
          <span className="font-medium text-foreground">Agent notes: </span>
          {story.agentNotes}
        </div>
      )}
      {story.branchName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="font-mono">{story.branchName}</span>
        </div>
      )}
      {(story.previewPort || story.branchName) && (
        <div className="flex items-center gap-1.5">
          <Globe className={`h-3.5 w-3.5 ${story.previewPort ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
          <a
            href={`/api/preview/${story.shortId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs hover:underline font-mono ${story.previewPort ? "text-green-500" : "text-muted-foreground"}`}
          >
            Preview: /preview/{story.shortId}
          </a>
        </div>
      )}
      {story.commitHash && (
        <p className="text-xs text-muted-foreground font-mono">
          Commit: {story.commitHash}
        </p>
      )}
      {story.deployStatus && story.deployStatus !== "idle" && (
        <div className="flex items-center gap-2 text-xs">
          <Rocket className={`h-3.5 w-3.5 ${story.deployStatus === "deployed" ? "text-green-500" : story.deployStatus === "deploying" ? "text-yellow-500 animate-pulse" : "text-red-500"}`} />
          <span className="capitalize">{story.deployStatus}</span>
          {story.deployUrl && (
            <a href={story.deployUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-mono truncate">
              {story.deployUrl}
            </a>
          )}
        </div>
      )}
      {!rejecting ? (
        <div className="flex gap-2">
          <Button
            onClick={onApprove}
            disabled={reviewLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {reviewLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={onDeploy}
            disabled={deploying || reviewLoading}
            title="Deploy branch"
          >
            {deploying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
            Deploy
          </Button>
          <Button
            variant="outline"
            onClick={() => setRejecting(true)}
            disabled={reviewLoading}
            className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            Request Changes
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRevert}
            disabled={reviewLoading}
            title="Revert agent work"
            className="text-muted-foreground hover:text-destructive"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Describe what needs to be fixed..."
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onReject(rejectFeedback);
                setRejecting(false);
                setRejectFeedback("");
              }}
              disabled={reviewLoading || !rejectFeedback.trim()}
              className="flex-1"
              variant="destructive"
            >
              {reviewLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Feedback & Re-trigger Agent
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setRejecting(false); setRejectFeedback(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
