"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  current?: boolean;
  onSelect?: () => void;
  loading?: boolean;
}

export function PricingCard({ name, price, description, features, current, onSelect, loading }: PricingCardProps) {
  return (
    <Card className={current ? "border-primary" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {name}
          {current && (
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
              Current plan
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="text-3xl font-bold pt-2">{price}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        {onSelect && !current && (
          <Button onClick={onSelect} className="w-full" disabled={loading}>
            {loading ? "Loading..." : "Upgrade"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
