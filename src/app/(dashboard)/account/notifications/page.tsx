"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NotificationPrefs {
  email: boolean;
  inApp: boolean;
  digest: "instant" | "daily" | "off";
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account/notification-preferences")
      .then((r) => r.json())
      .then(setPrefs);
  }, []);

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) return <div className="p-6">Loading...</div>;

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Choose which notification channels are active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>In-app notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the bell icon dropdown
              </p>
            </div>
            <Switch
              checked={prefs.inApp}
              onCheckedChange={(checked) => setPrefs({ ...prefs, inApp: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={prefs.email}
              onCheckedChange={(checked) => setPrefs({ ...prefs, email: checked })}
              data-testid="notif-email-toggle"
            />
          </div>
          {prefs.email && (
            <div>
              <Label>Email digest frequency</Label>
              <Select
                value={prefs.digest}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, digest: value as NotificationPrefs["digest"] })
                }
              >
                <SelectTrigger className="mt-1 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily summary</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} data-testid="notif-save">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
