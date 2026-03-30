"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

const emptySubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const DEFAULT_LAUNCH_DATE = new Date("2026-04-02T14:00:00Z");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(launchDate: Date): TimeLeft {
  const now = new Date();
  const diff = launchDate.getTime() - now.getTime();

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

function formatLaunchDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatLaunchTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-4xl font-extrabold tabular-nums bg-gradient-to-b from-primary via-chart-1 to-primary bg-clip-text text-transparent drop-shadow-[0_0_24px_var(--color-primary)] sm:text-5xl md:text-6xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer() {
  const [launchDate, setLaunchDate] = useState<Date>(DEFAULT_LAUNCH_DATE);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(DEFAULT_LAUNCH_DATE));
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mounted = useHasMounted();

  // Fetch configured launch date from API
  useEffect(() => {
    fetch("/api/launch-date")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load launch date (status ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.launchDate) {
          const d = new Date(data.launchDate);
          if (!isNaN(d.getTime())) {
            setLaunchDate(d);
            setTimeLeft(calculateTimeLeft(d));
            setFetchError(null);
          } else {
            setFetchError("Received invalid launch date from server");
          }
        }
      })
      .catch((err: Error) => {
        setFetchError(err.message || "Unable to retrieve launch date");
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(launchDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [launchDate]);

  if (!mounted) return null;

  const isLaunched =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {fetchError && (
        <p
          className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-1.5"
          data-testid="launch-date-error"
        >
          {fetchError}
        </p>
      )}

      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium">
        {isLaunched ? "We're Live" : "Launching in"}
      </span>

      {isLaunched ? (
        <div className="flex flex-col items-center gap-2" data-testid="launched-info">
          <span
            className="text-3xl font-extrabold tabular-nums bg-gradient-to-b from-primary via-chart-1 to-primary bg-clip-text text-transparent drop-shadow-[0_0_24px_var(--color-primary)] sm:text-4xl md:text-5xl"
            data-testid="launched-date"
          >
            {formatLaunchDate(launchDate)}
          </span>
          <span
            className="text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl"
            data-testid="launched-time"
          >
            {formatLaunchTime(launchDate)}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 sm:gap-5">
          <TimeUnit value={timeLeft.days} label="Days" />
          <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
          <TimeUnit value={timeLeft.minutes} label="Min" />
          <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
          <TimeUnit value={timeLeft.seconds} label="Sec" />
        </div>
      )}
    </motion.div>
  );
}
