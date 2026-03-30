"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SecurityPage() {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "enabled">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  async function handleSetup() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/setup", { method: "POST" });
      if (!res.ok) throw new Error("Failed to set up 2FA");
      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("setup");
    } catch {
      toast.error("Failed to set up 2FA");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Invalid code");
        return;
      }
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setStep("enabled");
      toast.success("2FA enabled successfully");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Invalid code");
        return;
      }
      setStep("idle");
      setDisableCode("");
      toast.success("2FA disabled");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage two-factor authentication
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using a TOTP authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "idle" && (
            <Button onClick={handleSetup} disabled={loading} data-testid="security-2fa-enable">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Up 2FA
            </Button>
          )}

          {step === "setup" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code" className="rounded-lg border" data-testid="2fa-qr-code" />
              </div>
              <div>
                <Label>Manual entry key</Label>
                <code className="block mt-1 text-sm bg-muted p-2 rounded font-mono break-all" data-testid="2fa-secret">
                  {secret}
                </code>
              </div>
              <div>
                <Label>Enter the code from your authenticator app</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="text"
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="font-mono tracking-widest"
                    maxLength={6}
                  />
                  <Button onClick={handleVerify} disabled={loading || code.length < 6}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "enabled" && backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
                <p className="font-medium text-sm mb-2">Save your backup codes</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Store these in a safe place. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Disable 2FA</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="text"
                    placeholder="Enter TOTP code to disable"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    className="font-mono"
                    maxLength={6}
                  />
                  <Button variant="destructive" onClick={handleDisable} disabled={loading || disableCode.length < 6} data-testid="security-2fa-disable">
                    Disable
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
