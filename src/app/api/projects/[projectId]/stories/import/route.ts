import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { checkStoryLimit, checkStoryLimitByProject } from "@/lib/plan-limits";
import { importStorySchema, importStoryRowSchema } from "@/lib/validations/story";

const MAX_IMPORT_ROWS = 100;

/**
 * Parse a CSV field that may be quoted. Handles escaped quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Check if a CSV row is a header row by looking for known column names.
 */
function isHeaderRow(fields: string[]): boolean {
  const normalized = fields.map((f) => f.toLowerCase().replace(/[^a-z]/g, ""));
  return normalized.includes("title") || normalized.includes("shortid");
}

/**
 * Map CSV header names to our internal field names.
 */
function mapCsvHeaders(headers: string[]): Map<string, number> {
  const mapping = new Map<string, number>();
  const normalizedNames: Record<string, string> = {
    title: "title",
    description: "description",
    status: "status",
    priority: "priority",
    type: "type",
    storypoints: "storyPoints",
    "story points": "storyPoints",
    shortid: "shortId",
    "short id": "shortId",
  };

  headers.forEach((header, idx) => {
    const normalized = header.toLowerCase().replace(/^["'\t]+/, "").trim();
    const fieldName = normalizedNames[normalized];
    if (fieldName) {
      mapping.set(fieldName, idx);
    }
  });

  return mapping;
}

interface ImportRow {
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  type?: string | null;
  storyPoints?: number | null;
}

function parseCsvData(data: string): { rows: ImportRow[]; errors: Array<{ row: number; error: string }> } {
  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, error: "Empty CSV data" }] };
  }

  const rows: ImportRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  // Parse the first line to check for headers
  const firstFields = parseCsvLine(lines[0]);
  let startIdx = 0;
  let headerMap: Map<string, number>;

  if (isHeaderRow(firstFields)) {
    headerMap = mapCsvHeaders(firstFields);
    startIdx = 1;
  } else {
    // Default column order matching export: Short ID, Title, Status, Priority, Type, Story Points, ...
    headerMap = new Map([
      ["shortId", 0],
      ["title", 1],
      ["status", 2],
      ["priority", 3],
      ["type", 4],
      ["storyPoints", 5],
    ]);

    // If first column looks like a title (not a short ID pattern), use simpler mapping
    if (!firstFields[0]?.match(/^[A-Z]{2,}-\d+$/)) {
      headerMap = new Map([
        ["title", 0],
        ["description", 1],
        ["status", 2],
        ["priority", 3],
        ["type", 4],
        ["storyPoints", 5],
      ]);
    }
  }

  const titleIdx = headerMap.get("title");
  if (titleIdx === undefined) {
    return { rows: [], errors: [{ row: 0, error: "CSV must have a 'title' column" }] };
  }

  for (let i = startIdx; i < lines.length; i++) {
    const rowNum = i + 1; // 1-based for user-facing errors
    const fields = parseCsvLine(lines[i]);

    // Strip formula-injection tab prefix from fields (added by our CSV export)
    const cleanFields = fields.map((f) => f.replace(/^\t/, ""));

    const title = cleanFields[titleIdx];
    if (!title || title.trim() === "") {
      errors.push({ row: rowNum, error: "Missing title" });
      continue;
    }

    const descIdx = headerMap.get("description");
    const statusIdx = headerMap.get("status");
    const priorityIdx = headerMap.get("priority");
    const typeIdx = headerMap.get("type");
    const spIdx = headerMap.get("storyPoints");

    const rawSp = spIdx !== undefined ? cleanFields[spIdx] : undefined;
    const storyPoints = rawSp && rawSp.trim() !== "" ? parseInt(rawSp, 10) : null;

    rows.push({
      title: title.trim(),
      description: descIdx !== undefined ? cleanFields[descIdx]?.trim() || null : null,
      status: statusIdx !== undefined ? cleanFields[statusIdx]?.trim().toUpperCase() || null : null,
      priority: priorityIdx !== undefined ? cleanFields[priorityIdx]?.trim().toUpperCase() || null : null,
      type: typeIdx !== undefined ? cleanFields[typeIdx]?.trim().toLowerCase() || null : null,
      storyPoints: storyPoints !== null && !isNaN(storyPoints) ? storyPoints : null,
    });
  }

  return { rows, errors };
}

function parseJsonData(data: string): { rows: ImportRow[]; errors: Array<{ row: number; error: string }> } {
  const rows: ImportRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { rows: [], errors: [{ row: 0, error: "Invalid JSON format" }] };
  }

  if (!Array.isArray(parsed)) {
    return { rows: [], errors: [{ row: 0, error: "JSON data must be an array of story objects" }] };
  }

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    const rowNum = i + 1;

    if (!item || typeof item !== "object") {
      errors.push({ row: rowNum, error: "Invalid story object" });
      continue;
    }

    const obj = item as Record<string, unknown>;
    if (!obj.title || typeof obj.title !== "string" || obj.title.trim() === "") {
      errors.push({ row: rowNum, error: "Missing or empty title" });
      continue;
    }

    const sp = obj.storyPoints;
    const storyPoints = typeof sp === "number" ? sp : typeof sp === "string" && sp.trim() !== "" ? parseInt(sp, 10) : null;

    rows.push({
      title: String(obj.title).trim(),
      description: obj.description ? String(obj.description).trim() : null,
      status: obj.status ? String(obj.status).trim().toUpperCase() : null,
      priority: obj.priority ? String(obj.priority).trim().toUpperCase() : null,
      type: obj.type ? String(obj.type).trim().toLowerCase() : null,
      storyPoints: storyPoints !== null && !isNaN(storyPoints) ? storyPoints : null,
    });
  }

  return { rows, errors };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  try {
    const parsed = await parseJsonBody(req, 1_048_576); // 1MB limit
    if (!parsed.ok) return parsed.response;

    const input = importStorySchema.parse(parsed.data);

    // Parse the data based on format
    const { rows, errors } =
      input.format === "csv" ? parseCsvData(input.data) : parseJsonData(input.data);

    if (rows.length === 0 && errors.length > 0) {
      return NextResponse.json({ imported: 0, errors }, { status: 400 });
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMPORT_ROWS} stories per import. Got ${rows.length}.` },
        { status: 400 }
      );
    }

    // Check plan limits
    if (access.type === "session") {
      const limitCheck = await checkStoryLimit(projectId, access.userId);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.message }, { status: 403 });
      }
    } else if (access.type === "apikey") {
      const limitCheck = await checkStoryLimitByProject(projectId);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.message }, { status: 403 });
      }
    }

    // Validate each row and collect valid ones
    const validRows: Array<{ idx: number; data: ImportRow }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = errors.length > 0
        ? i + 1 + (errors.filter((e) => e.row <= i + 1).length)
        : i + 1;

      try {
        importStoryRowSchema.parse({
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          type: row.type,
          storyPoints: row.storyPoints,
        });
        validRows.push({ idx: rowNum, data: row });
      } catch (err) {
        const message =
          err && typeof err === "object" && "issues" in err
            ? (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ")
            : "Validation failed";
        errors.push({ row: rowNum, error: message });
      }
    }

    if (validRows.length === 0) {
      return NextResponse.json({ imported: 0, errors }, { status: 400 });
    }

    // Create stories in a transaction
    const imported = await prisma.$transaction(async (tx) => {
      // Get next shortId sequence
      const maxResult = await tx.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING("shortId" FROM 4) AS INTEGER)) as max_num
        FROM "Story"
      `;
      let seq = (maxResult[0]?.max_num ?? 0) + 1;

      const created = [];
      for (const { data: row } of validRows) {
        const shortId = `CP-${String(seq++).padStart(3, "0")}`;

        const story = await tx.story.create({
          data: {
            shortId,
            title: row.title,
            description: row.description || null,
            status: row.status || "BACKLOG",
            priority: row.priority || "MEDIUM",
            type: row.type || "feature",
            storyPoints: row.storyPoints ?? null,
            projectId,
          },
        });

        created.push(story);
      }

      return created;
    });

    return NextResponse.json({
      imported: imported.length,
      errors,
      stories: imported,
    });
  } catch (err) {
    // Handle Zod validation errors
    if (err && typeof err === "object" && "issues" in err) {
      const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
      const messages = issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return NextResponse.json(
        { error: `Validation failed: ${messages.join(", ")}` },
        { status: 400 }
      );
    }

    const message = sanitizeError(err, "Failed to import stories");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
