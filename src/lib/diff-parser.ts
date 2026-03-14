export interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  filename: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = raw.split("\n");
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        if (currentHunk) currentFile.hunks.push(currentHunk);
        files.push(currentFile);
      }
      currentHunk = null;

      const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
      const filename = match?.[2] || match?.[1] || "unknown";

      currentFile = {
        filename,
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      continue;
    }

    if (!currentFile) continue;

    // File status indicators
    if (line.startsWith("new file")) {
      currentFile.status = "added";
      continue;
    }
    if (line.startsWith("deleted file")) {
      currentFile.status = "deleted";
      continue;
    }
    if (line.startsWith("rename from")) {
      currentFile.status = "renamed";
      continue;
    }
    if (line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }
    if (line.startsWith("index ") || line.startsWith("Binary ")) {
      continue;
    }

    // Hunk header
    if (line.startsWith("@@")) {
      if (currentHunk) currentFile.hunks.push(currentHunk);
      const hunkMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      oldLine = parseInt(hunkMatch?.[1] || "1", 10);
      newLine = parseInt(hunkMatch?.[2] || "1", 10);
      currentHunk = {
        header: line,
        lines: [{ type: "header", content: line }],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "add",
        content: line.slice(1),
        newLine: newLine++,
      });
      currentFile.additions++;
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "remove",
        content: line.slice(1),
        oldLine: oldLine++,
      });
      currentFile.deletions++;
    } else if (line.startsWith(" ") || line === "") {
      currentHunk.lines.push({
        type: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldLine: oldLine++,
        newLine: newLine++,
      });
    }
  }

  // Push last file/hunk
  if (currentFile) {
    if (currentHunk) currentFile.hunks.push(currentHunk);
    files.push(currentFile);
  }

  return files;
}
