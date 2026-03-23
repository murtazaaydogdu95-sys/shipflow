import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const stories = await prisma.story.findMany({
    where: { projectId },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
      assignee: { select: { name: true, email: true } },
    },
    orderBy: { position: "asc" },
  });

  if (format === "csv") {
    // Escape CSV values: quote strings, double-escape internal quotes,
    // and neutralize formula injection (=, +, -, @, tab, CR).
    // Tab-prefix is the most reliable defense across Excel, Google Sheets, and LibreOffice.
    const csvEscape = (val: string | number | null | undefined): string => {
      if (val == null || val === "") return "";
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(escaped)) {
        return `"\t${escaped}"`;
      }
      if (/[",\n]/.test(escaped)) {
        return `"${escaped}"`;
      }
      return `"${escaped}"`;
    };

    const headers = ["Short ID", "Title", "Status", "Priority", "Type", "Story Points", "Assignee", "Labels", "Created"];
    const rows = stories.map((s) => [
      csvEscape(s.shortId),
      csvEscape(s.title),
      csvEscape(s.status),
      csvEscape(s.priority),
      csvEscape(s.type),
      s.storyPoints ?? "",
      csvEscape(s.assignee?.name ?? ""),
      csvEscape(s.labels.map((l) => l.label.name).join("; ")),
      s.createdAt.toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stories-${projectId}.csv"`,
      },
    });
  }

  // JSON format
  const data = stories.map((s) => ({
    shortId: s.shortId,
    title: s.title,
    description: s.description,
    status: s.status,
    priority: s.priority,
    type: s.type,
    storyPoints: s.storyPoints,
    assignee: s.assignee?.name ?? null,
    labels: s.labels.map((l) => l.label.name),
    acceptanceCriteria: s.acceptanceCriteria.map((ac) => ({
      given: ac.given,
      when: ac.when,
      then: ac.then,
    })),
    createdAt: s.createdAt.toISOString(),
  }));

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="stories-${projectId}.json"`,
    },
  });
}
