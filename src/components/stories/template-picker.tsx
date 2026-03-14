"use client";

import { STORY_TEMPLATES, type StoryTemplate } from "@/lib/story-templates";
import { Shield, Database, Layout, CreditCard, Zap, BarChart3, FormInput, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  Database,
  Layout,
  CreditCard,
  Zap,
  BarChart3,
  FormInput,
  Mail,
};

interface TemplatePickerProps {
  onSelect: (template: StoryTemplate) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STORY_TEMPLATES.map((template) => {
        const Icon = ICON_MAP[template.icon] || Zap;
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              "flex items-start gap-2.5 p-3 rounded-lg border text-left",
              "hover:border-primary/50 hover:bg-primary/5 transition-colors"
            )}
          >
            <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{template.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
