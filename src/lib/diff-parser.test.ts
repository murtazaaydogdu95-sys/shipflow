import { describe, it, expect } from "vitest";
import { parseDiff } from "./diff-parser";

describe("diff-parser", () => {
  it("returns empty array for empty string", () => {
    expect(parseDiff("")).toEqual([]);
  });

  it("returns empty array for non-diff text", () => {
    expect(parseDiff("just some random text")).toEqual([]);
  });

  it("parses a single modified file with one hunk", () => {
    const raw = [
      "diff --git a/src/app.ts b/src/app.ts",
      "index abc1234..def5678 100644",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -1,3 +1,4 @@",
      " import express from 'express';",
      "-const port = 3000;",
      "+const port = 8080;",
      "+const host = 'localhost';",
      " const app = express();",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("src/app.ts");
    expect(files[0].status).toBe("modified");
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(1);
    expect(files[0].hunks).toHaveLength(1);
  });

  it("detects new file status", () => {
    const raw = [
      "diff --git a/src/new.ts b/src/new.ts",
      "new file mode 100644",
      "index 0000000..abc1234",
      "--- /dev/null",
      "+++ b/src/new.ts",
      "@@ -0,0 +1,2 @@",
      "+export const foo = 1;",
      "+export const bar = 2;",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe("added");
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(0);
  });

  it("detects deleted file status", () => {
    const raw = [
      "diff --git a/src/old.ts b/src/old.ts",
      "deleted file mode 100644",
      "index abc1234..0000000",
      "--- a/src/old.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-export const foo = 1;",
      "-export const bar = 2;",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe("deleted");
    expect(files[0].deletions).toBe(2);
  });

  it("detects renamed file status", () => {
    const raw = [
      "diff --git a/src/old-name.ts b/src/new-name.ts",
      "rename from src/old-name.ts",
      "rename to src/new-name.ts",
      "index abc1234..def5678 100644",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe("renamed");
    expect(files[0].filename).toBe("src/new-name.ts");
  });

  it("parses multiple files in one diff", () => {
    const raw = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,1 +1,2 @@",
      " line1",
      "+line2",
      "diff --git a/src/b.ts b/src/b.ts",
      "--- a/src/b.ts",
      "+++ b/src/b.ts",
      "@@ -1,2 +1,1 @@",
      " line1",
      "-line2",
      "diff --git a/src/c.ts b/src/c.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/c.ts",
      "@@ -0,0 +1,1 @@",
      "+new file content",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(3);
    expect(files[0].filename).toBe("src/a.ts");
    expect(files[1].filename).toBe("src/b.ts");
    expect(files[2].filename).toBe("src/c.ts");
  });

  it("counts additions and deletions correctly", () => {
    const raw = [
      "diff --git a/file.ts b/file.ts",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -1,5 +1,6 @@",
      " context line",
      "-removed line 1",
      "-removed line 2",
      "+added line 1",
      "+added line 2",
      "+added line 3",
      " context line",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files[0].additions).toBe(3);
    expect(files[0].deletions).toBe(2);
  });

  it("assigns line numbers correctly", () => {
    const raw = [
      "diff --git a/file.ts b/file.ts",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -10,4 +20,5 @@",
      " context",
      "-old line",
      "+new line",
      "+extra line",
      " more context",
    ].join("\n");

    const files = parseDiff(raw);
    const lines = files[0].hunks[0].lines;

    // Header line
    expect(lines[0].type).toBe("header");

    // Context line (oldLine=10, newLine=20)
    const contextLine = lines[1];
    expect(contextLine.type).toBe("context");
    expect(contextLine.oldLine).toBe(10);
    expect(contextLine.newLine).toBe(20);

    // Removed line (oldLine=11)
    const removedLine = lines[2];
    expect(removedLine.type).toBe("remove");
    expect(removedLine.oldLine).toBe(11);

    // Added lines (newLine=21, 22)
    const addedLine1 = lines[3];
    expect(addedLine1.type).toBe("add");
    expect(addedLine1.newLine).toBe(21);

    const addedLine2 = lines[4];
    expect(addedLine2.type).toBe("add");
    expect(addedLine2.newLine).toBe(22);
  });

  it("handles multiple hunks per file", () => {
    const raw = [
      "diff --git a/file.ts b/file.ts",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -1,3 +1,3 @@",
      " line1",
      "-old2",
      "+new2",
      " line3",
      "@@ -10,3 +10,4 @@",
      " line10",
      " line11",
      "+inserted",
      " line12",
    ].join("\n");

    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].hunks).toHaveLength(2);
    expect(files[0].hunks[0].header).toContain("@@ -1,3 +1,3 @@");
    expect(files[0].hunks[1].header).toContain("@@ -10,3 +10,4 @@");
  });
});
