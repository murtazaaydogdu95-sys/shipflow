"use client";

import { useState } from "react";
import { parseDiff, type DiffFile } from "@/lib/diff-parser";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileCode, FilePlus, FileMinus, FileEdit } from "lucide-react";

interface DiffViewerProps {
  rawDiff: string;
}

const STATUS_ICONS = {
  added: FilePlus,
  deleted: FileMinus,
  modified: FileEdit,
  renamed: FileEdit,
};

const STATUS_COLORS = {
  added: "text-green-500",
  deleted: "text-red-500",
  modified: "text-yellow-500",
  renamed: "text-blue-500",
};

export function DiffViewer({ rawDiff }: DiffViewerProps) {
  const files = parseDiff(rawDiff);
  const [selectedFile, setSelectedFile] = useState<string | null>(
    files[0]?.filename || null
  );
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No changes found.
      </div>
    );
  }

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  function toggleCollapse(filename: string) {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 h-full">
      {/* File sidebar */}
      <div className="md:w-64 shrink-0 border rounded-lg overflow-auto max-h-[500px]">
        <div className="p-2 border-b bg-muted/50">
          <span className="text-xs font-medium">{files.length} files</span>
          <span className="text-xs text-muted-foreground ml-2">
            <span className="text-green-500">+{totalAdditions}</span>{" "}
            <span className="text-red-500">-{totalDeletions}</span>
          </span>
        </div>
        <div className="divide-y">
          {files.map((file) => {
            const Icon = STATUS_ICONS[file.status];
            return (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file.filename)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs flex items-center gap-1.5 hover:bg-muted/50 transition-colors",
                  selectedFile === file.filename && "bg-primary/10"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", STATUS_COLORS[file.status])} />
                <span className="truncate flex-1 font-mono">
                  {file.filename.split("/").pop()}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  <span className="text-green-500">+{file.additions}</span>{" "}
                  <span className="text-red-500">-{file.deletions}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto border rounded-lg max-h-[500px]">
        {files.map((file) => (
          <div
            key={file.filename}
            className={cn(
              selectedFile && selectedFile !== file.filename && "hidden"
            )}
          >
            {/* File header */}
            <button
              onClick={() => toggleCollapse(file.filename)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 border-b text-sm font-mono sticky top-0 z-10 hover:bg-muted transition-colors"
            >
              {collapsedFiles.has(file.filename) ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
              <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-left">{file.filename}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                <span className="text-green-500">+{file.additions}</span>{" "}
                <span className="text-red-500">-{file.deletions}</span>
              </span>
            </button>

            {/* Hunks */}
            {!collapsedFiles.has(file.filename) &&
              file.hunks.map((hunk, hi) => (
                <div key={hi}>
                  {hunk.lines.map((line, li) => (
                    <div
                      key={li}
                      className={cn(
                        "flex text-xs font-mono leading-5",
                        line.type === "add" && "bg-green-500/10",
                        line.type === "remove" && "bg-red-500/10",
                        line.type === "header" && "bg-blue-500/10 text-blue-500"
                      )}
                    >
                      {line.type !== "header" && (
                        <>
                          <span className="w-10 text-right pr-1 text-muted-foreground select-none shrink-0 border-r">
                            {line.oldLine ?? ""}
                          </span>
                          <span className="w-10 text-right pr-1 text-muted-foreground select-none shrink-0 border-r">
                            {line.newLine ?? ""}
                          </span>
                          <span className="w-4 text-center select-none shrink-0">
                            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                          </span>
                        </>
                      )}
                      <span
                        className={cn(
                          "flex-1 whitespace-pre-wrap break-all px-1",
                          line.type === "header" && "px-3"
                        )}
                      >
                        {line.content}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
