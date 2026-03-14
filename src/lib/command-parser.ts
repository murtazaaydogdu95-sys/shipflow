export interface ParsedCommand {
  type: "move" | "delete" | "prioritize" | "close" | "assign-sprint";
  storyRef: string;
  target?: string;
  description: string;
}

const PATTERNS: Array<{
  regex: RegExp;
  type: ParsedCommand["type"];
  descriptionFn: (match: RegExpMatchArray) => string;
  targetFn?: (match: RegExpMatchArray) => string;
}> = [
  {
    regex: /^move\s+(SF-\d+)\s+to\s+(backlog|todo|in[_ ]progress|review|done|icebox)/i,
    type: "move",
    descriptionFn: (m) => `Move ${m[1]} to ${m[2]}`,
    targetFn: (m) => m[2].toUpperCase().replace(" ", "_").replace("IN_PROGRESS", "IN_PROGRESS"),
  },
  {
    regex: /^close\s+(SF-\d+)/i,
    type: "close",
    descriptionFn: (m) => `Close ${m[1]} (move to Done)`,
    targetFn: () => "DONE",
  },
  {
    regex: /^delete\s+(SF-\d+)/i,
    type: "delete",
    descriptionFn: (m) => `Delete ${m[1]}`,
  },
  {
    regex: /^prioritize\s+(SF-\d+)\s+(?:as\s+)?(critical|high|medium|low)/i,
    type: "prioritize",
    descriptionFn: (m) => `Set ${m[1]} priority to ${m[2]}`,
    targetFn: (m) => m[2].toUpperCase(),
  },
  {
    regex: /^assign\s+(SF-\d+)\s+to\s+next\s+sprint/i,
    type: "assign-sprint",
    descriptionFn: (m) => `Assign ${m[1]} to next sprint`,
  },
];

export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      return {
        type: pattern.type,
        storyRef: match[1].toUpperCase(),
        target: pattern.targetFn?.(match),
        description: pattern.descriptionFn(match),
      };
    }
  }
  return null;
}
