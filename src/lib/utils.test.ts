import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className merge)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe("base visible");
  });

  it("deduplicates Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("merges conflicting Tailwind classes correctly", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty strings", () => {
    expect(cn("", "foo", "")).toBe("foo");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles objects with boolean values", () => {
    expect(cn({ "text-red-500": true, hidden: false, block: true })).toBe("text-red-500 block");
  });

  it("handles complex mixed inputs", () => {
    const result = cn(
      "base-class",
      true && "conditional",
      false && "skipped",
      { "object-true": true, "object-false": false },
      ["array-class"]
    );
    expect(result).toContain("base-class");
    expect(result).toContain("conditional");
    expect(result).not.toContain("skipped");
    expect(result).toContain("object-true");
    expect(result).not.toContain("object-false");
    expect(result).toContain("array-class");
  });

  it("handles responsive Tailwind prefixes", () => {
    expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
  });
});
