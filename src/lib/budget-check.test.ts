import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";

// ── Mocks ────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// Add costEvent and budgetPolicy models to mock if missing
if (!mockPrisma.costEvent) {
  (mockPrisma as Record<string, unknown>).costEvent = {
    aggregate: vi.fn(),
  };
}
if (!mockPrisma.budgetPolicy) {
  (mockPrisma as Record<string, unknown>).budgetPolicy = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };
}
if (!mockPrisma.budgetIncident) {
  (mockPrisma as Record<string, unknown>).budgetIncident = {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  };
}
if (!mockPrisma.agent) {
  (mockPrisma as Record<string, unknown>).agent = {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const costEventMock = (mockPrisma as any).costEvent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const budgetPolicyMock = (mockPrisma as any).budgetPolicy;

describe("budget-check", () => {
  beforeEach(() => {
    resetAllMocks();
    // Re-add mocks after reset
    if (!mockPrisma.costEvent) {
      (mockPrisma as Record<string, unknown>).costEvent = {
        aggregate: vi.fn(),
      };
    }
    if (!mockPrisma.budgetPolicy) {
      (mockPrisma as Record<string, unknown>).budgetPolicy = {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      };
    }
    if (!mockPrisma.budgetIncident) {
      (mockPrisma as Record<string, unknown>).budgetIncident = {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
      };
    }
    if (!mockPrisma.agent) {
      (mockPrisma as Record<string, unknown>).agent = {
        updateMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      };
    }
  });

  describe("getMonthStart", () => {
    it("returns first day of current month in UTC", async () => {
      const { getMonthStart } = await import("./budget-check");

      const result = getMonthStart();
      const now = new Date();

      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe("computeCurrentSpend", () => {
    it("aggregates correctly for calendar_month window", async () => {
      const { computeCurrentSpend, getMonthStart } = await import("./budget-check");

      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 4200 },
      });

      const policy = {
        orgId: "org-1",
        scope: "org",
        scopeId: null,
        window: "calendar_month",
      };

      const result = await computeCurrentSpend(policy);

      expect(result).toBe(4200);
      expect(costEventMock.aggregate).toHaveBeenCalledWith({
        where: {
          orgId: "org-1",
          createdAt: { gte: getMonthStart() },
        },
        _sum: { costCents: true },
      });
    });

    it("aggregates correctly for lifetime window", async () => {
      const { computeCurrentSpend } = await import("./budget-check");

      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 10000 },
      });

      const policy = {
        orgId: "org-1",
        scope: "org",
        scopeId: null,
        window: "lifetime",
      };

      const result = await computeCurrentSpend(policy);

      expect(result).toBe(10000);
      // lifetime window should not include a date filter
      expect(costEventMock.aggregate).toHaveBeenCalledWith({
        where: { orgId: "org-1" },
        _sum: { costCents: true },
      });
    });

    it("filters by agentId for agent scope", async () => {
      const { computeCurrentSpend } = await import("./budget-check");

      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 500 },
      });

      const policy = {
        orgId: "org-1",
        scope: "agent",
        scopeId: "agent-42",
        window: "lifetime",
      };

      const result = await computeCurrentSpend(policy);

      expect(result).toBe(500);
      expect(costEventMock.aggregate).toHaveBeenCalledWith({
        where: { orgId: "org-1", agentId: "agent-42" },
        _sum: { costCents: true },
      });
    });

    it("filters by projectId for project scope", async () => {
      const { computeCurrentSpend } = await import("./budget-check");

      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 750 },
      });

      const policy = {
        orgId: "org-1",
        scope: "project",
        scopeId: "project-99",
        window: "lifetime",
      };

      const result = await computeCurrentSpend(policy);

      expect(result).toBe(750);
      expect(costEventMock.aggregate).toHaveBeenCalledWith({
        where: { orgId: "org-1", projectId: "project-99" },
        _sum: { costCents: true },
      });
    });

    it("returns 0 when no cost events exist", async () => {
      const { computeCurrentSpend } = await import("./budget-check");

      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: null },
      });

      const policy = {
        orgId: "org-1",
        scope: "org",
        scopeId: null,
        window: "lifetime",
      };

      const result = await computeCurrentSpend(policy);

      expect(result).toBe(0);
    });
  });

  describe("checkBudget", () => {
    it("returns allowed when no policies exist", async () => {
      const { checkBudget } = await import("./budget-check");

      budgetPolicyMock.findMany.mockResolvedValue([]);

      const result = await checkBudget("agent-1", "project-1", "org-1");

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns not allowed when hard stop is enabled and budget exceeded", async () => {
      const { checkBudget } = await import("./budget-check");

      budgetPolicyMock.findMany.mockResolvedValue([
        {
          id: "policy-1",
          orgId: "org-1",
          scope: "org",
          scopeId: null,
          window: "calendar_month",
          amountCents: 1000,
          warnPercent: 80,
          hardStopEnabled: true,
          notifyEnabled: true,
        },
      ]);

      // Spend is 1500 out of 1000 (150%)
      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 1500 },
      });

      const result = await checkBudget("agent-1", "project-1", "org-1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Budget exceeded");
      expect(result.reason).toContain("Hard stop");
    });

    it("returns allowed with warnings when at warn threshold but hard stop not triggered", async () => {
      const { checkBudget } = await import("./budget-check");

      budgetPolicyMock.findMany.mockResolvedValue([
        {
          id: "policy-1",
          orgId: "org-1",
          scope: "org",
          scopeId: null,
          window: "calendar_month",
          amountCents: 1000,
          warnPercent: 80,
          hardStopEnabled: false,
          notifyEnabled: true,
        },
      ]);

      // Spend is 900 out of 1000 (90%, above 80% warn)
      costEventMock.aggregate.mockResolvedValue({
        _sum: { costCents: 900 },
      });

      const result = await checkBudget("agent-1", "project-1", "org-1");

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("90.0%");
    });
  });
});
