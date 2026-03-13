"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const LAUNCH_DATE = new Date("2026-03-15T14:00:00");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-bold tabular-nums md:text-5xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  const isLaunchSoon =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0
      ? true
      : LAUNCH_DATE.getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000;

  return (
    <Card className="mx-auto mb-6 max-w-lg text-center">
      <CardContent className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Countdown to Launch
        </h2>
        <div className="flex items-center gap-4">
          <TimeUnit value={timeLeft.days} label="Days" />
          <span className="text-muted-foreground text-3xl font-light">:</span>
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <span className="text-muted-foreground text-3xl font-light">:</span>
          <TimeUnit value={timeLeft.minutes} label="Minutes" />
          <span className="text-muted-foreground text-3xl font-light">:</span>
          <TimeUnit value={timeLeft.seconds} label="Seconds" />
        </div>
        {isLaunchSoon && (
          <p className="text-primary animate-pulse text-sm font-semibold uppercase tracking-widest">
            Launch Soon
          </p>
        )}
      </CardContent>
    </Card>
  );
}
