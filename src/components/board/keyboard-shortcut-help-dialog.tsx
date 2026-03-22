"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ShortcutEntry {
  key: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { key: "?", description: "Show keyboard shortcuts" },
      { key: "⌘ K", description: "Open Quick Capture" },
    ],
  },
  {
    title: "Board Navigation",
    shortcuts: [
      { key: "←", description: "Move focus to previous column" },
      { key: "→", description: "Move focus to next column" },
      { key: "↑", description: "Move focus to previous story" },
      { key: "↓", description: "Move focus to next story" },
      { key: "Enter", description: "Open focused story" },
    ],
  },
  {
    title: "Board Actions",
    shortcuts: [
      { key: "B", description: "Toggle bulk selection mode" },
      { key: "Space", description: "Select/deselect story (bulk mode)" },
      { key: "F", description: "Enter Focus Mode" },
      { key: "Esc", description: "Exit bulk mode / Focus Mode" },
    ],
  },
  {
    title: "Focus Mode",
    shortcuts: [
      { key: "←", description: "Previous story" },
      { key: "→", description: "Next story" },
      { key: "Esc", description: "Exit Focus Mode" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-medium bg-muted border rounded text-muted-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      // "?" is Shift+/ on most keyboards. Some layouts/browsers report
      // e.key as "/" with shiftKey=true instead of "?".
      const isQuestionMark =
        (e.key === "?" || (e.key === "/" && e.shiftKey)) &&
        !e.metaKey &&
        !e.ctrlKey;

      if (isQuestionMark) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    // Use capture phase so this fires before Radix Dialog/Sheet focus traps
    // can stopPropagation on the event.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Available keyboard shortcuts for navigating the board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={`${group.title}-${shortcut.key}-${shortcut.description}`}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.key.split(" ").map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
