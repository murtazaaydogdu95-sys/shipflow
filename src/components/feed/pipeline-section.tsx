"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineSectionProps {
  label: string;
  icon: LucideIcon;
  color: string;
  count: number;
  totalPoints: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export function PipelineSection({
  label,
  icon: Icon,
  color,
  count,
  totalPoints,
  defaultCollapsed = false,
  children,
}: PipelineSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 ml-1">
          {count}
        </Badge>
        {totalPoints > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalPoints} pts
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-2 pb-2 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
