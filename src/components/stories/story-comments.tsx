"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Trash2 } from "lucide-react";

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string | null; image: string | null };
}

interface StoryCommentsProps {
  comments: CommentData[] | undefined;
  newComment: string;
  setNewComment: (value: string) => void;
  addComment: () => void;
  deleteComment: (commentId: string) => void;
  commentLoading: boolean;
}

export function StoryComments({
  comments,
  newComment,
  setNewComment,
  addComment,
  deleteComment,
  commentLoading,
}: StoryCommentsProps) {
  return (
    <>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {(!comments || comments.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Start the conversation.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={comment.user.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(comment.user.name?.[0] || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.user.name || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <Separator />
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px]"
          data-testid="story-detail-comment-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              addComment();
            }
          }}
        />
        <Button
          size="icon"
          onClick={addComment}
          disabled={commentLoading || !newComment.trim()}
          className="shrink-0 self-end"
          data-testid="story-detail-comment-submit"
        >
          {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}
