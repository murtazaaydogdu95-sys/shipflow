"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ImportError {
  row: number;
  error: string;
}

interface ImportResult {
  imported: number;
  errors: ImportError[];
}

interface StoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImported?: () => void;
}

export function StoryImportDialog({
  open,
  onOpenChange,
  projectId,
  onImported,
}: StoryImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setFileContent("");
    setFormat("csv");
    setImporting(false);
    setResult(null);
    setPreviewCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      // Auto-detect format from extension
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "json") {
        setFormat("json");
      } else {
        setFormat("csv");
      }

      setFile(selectedFile);
      setResult(null);

      try {
        const text = await selectedFile.text();
        setFileContent(text);

        // Count rows for preview
        if (ext === "json") {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              setPreviewCount(parsed.length);
            } else {
              setPreviewCount(null);
            }
          } catch {
            setPreviewCount(null);
          }
        } else {
          // CSV: count non-empty lines, minus potential header
          const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
          if (lines.length > 0) {
            // Check if first row looks like a header
            const firstRow = lines[0].toLowerCase();
            const hasHeader = firstRow.includes("title") || firstRow.includes("short id");
            setPreviewCount(hasHeader ? lines.length - 1 : lines.length);
          } else {
            setPreviewCount(0);
          }
        }
      } catch {
        toast.error("Failed to read file");
        setFile(null);
        setFileContent("");
        setPreviewCount(null);
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!fileContent) return;

    setImporting(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/stories/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, data: fileContent }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.imported !== undefined) {
          // Partial result with errors
          setResult({ imported: data.imported, errors: data.errors || [] });
          if (data.imported === 0) {
            toast.error("Import failed: no valid stories found");
          }
        } else {
          toast.error(data.error || "Import failed");
        }
        return;
      }

      const importResult: ImportResult = {
        imported: data.imported,
        errors: data.errors || [],
      };
      setResult(importResult);

      if (importResult.imported > 0) {
        toast.success(
          `Imported ${importResult.imported} ${importResult.imported === 1 ? "story" : "stories"}${importResult.errors.length > 0 ? ` (${importResult.errors.length} skipped)` : ""}`
        );
        onImported?.();
      }
    } catch {
      toast.error("Failed to import stories");
    } finally {
      setImporting(false);
    }
  }, [fileContent, format, projectId, onImported]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Stories</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import stories into this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
              data-testid="import-file-input"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select a CSV or JSON file
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 100 stories, 1MB file size
                </p>
              </div>
            )}
          </div>

          {/* Preview Count */}
          {previewCount !== null && !result && (
            <p className="text-sm text-muted-foreground text-center">
              Found approximately <span className="font-medium text-foreground">{previewCount}</span>{" "}
              {previewCount === 1 ? "story" : "stories"} to import
              <span className="text-xs ml-1">({format.toUpperCase()} format)</span>
            </p>
          )}

          {/* Result Summary */}
          {result && (
            <div className="space-y-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Imported {result.imported} {result.imported === 1 ? "story" : "stories"} successfully
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {result.errors.length} {result.errors.length === 1 ? "row" : "rows"} skipped
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded border bg-muted/50 p-2 text-xs space-y-1">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <div key={i} className="text-muted-foreground">
                        <span className="font-medium">Row {err.row}:</span> {err.error}
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <div className="text-muted-foreground italic">
                        ...and {result.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result && result.imported > 0 ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || !fileContent || importing}
                data-testid="import-submit-btn"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
