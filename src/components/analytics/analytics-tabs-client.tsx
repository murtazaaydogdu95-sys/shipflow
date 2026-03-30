"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { BurndownTab } from "./burndown-tab";

interface AnalyticsTabsClientProps {
  projectId: string;
}

export function AnalyticsTabsClient({ projectId }: AnalyticsTabsClientProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger
          value="burndown"
          data-testid="analytics-burndown-tab"
        >
          Burndown
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab projectId={projectId} />
      </TabsContent>
      <TabsContent value="burndown">
        <BurndownTab projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
