"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

const emptySubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const DEFAULT_LAUNCH_DATE = new Date("2026-03-28T16:00:00");

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
  const mounted = useHasMounted();

  // Fetch configured launch date from API
  useEffect(() => {
    fetch("/api/launch-date")
      .then((res) => res.json())
      .then((data) => {
        if (data.launchDate) {
          const d = new Date(data.launchDate);
          if (!isNaN(d.getTime())) {
            setLaunchDate(d);
            setTimeLeft(calculateTimeLeft(d));
          }
        }
      })
      .catch(() => {
        // Use default launch date on error
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
      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium">
        {isLaunched ? "We're Live" : "Launching in"}
      </span>

      <div className="flex items-center gap-3 sm:gap-5">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <span className="text-2xl font-light text-muted-foreground/50 sm:text-3xl">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" />
      </div>
    </motion.div>
  );
}
