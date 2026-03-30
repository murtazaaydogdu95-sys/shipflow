"use client";

import { Paperclip, FileText } from "lucide-react";

interface AttachmentData {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface StoryAttachmentsProps {
  attachments: AttachmentData[] | undefined;
  onUpload: (file: File) => void;
}

export function StoryAttachments({
  attachments,
  onUpload,
}: StoryAttachmentsProps) {
  return (
    <>
      <div data-testid="attach-upload-btn">
        <label
          className="flex items-center gap-2 text-sm font-medium cursor-pointer border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors text-center justify-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) onUpload(file);
          }}
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Drop file or click to upload (max 10MB)</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {attachments && attachments.length > 0 ? (
        <div className="space-y-2" data-testid="attach-list">
          {attachments.map((att) => (
            <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/50 transition-colors">
              {att.mimeType.startsWith("image/") ? (
                <img src={att.url} alt={att.filename} className="h-8 w-8 object-cover rounded" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 truncate">{att.filename}</span>
              <span className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No attachments yet.</p>
      )}
    </>
  );
}
