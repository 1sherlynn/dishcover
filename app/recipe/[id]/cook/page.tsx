"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRecipeStore, useHydrated } from "@/lib/store";

// Cooking Mode (CONTEXT.md): full-screen one-step-per-screen player.
// Always rendered in the Midnight palette via .force-midnight
// (PRODUCT-SPEC.md §5), whatever Theme the rest of the app is wearing.

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const done = remaining === 0;

  useEffect(() => {
    if (!running || done) return;
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(tick);
  }, [running, done]);

  return (
    <div
      className={`rise mt-8 flex items-center justify-between gap-4 rounded-card p-6 transition-colors ${
        done ? "bg-highlight" : "bg-surface"
      }`}
      style={{ "--rise-delay": "140ms" } as React.CSSProperties}
    >
      <div role="timer" aria-live={done ? "assertive" : "off"}>
        <span
          className={`text-xs font-bold uppercase tracking-[0.18em] ${
            done ? "text-accent-ink" : "text-ink-soft"
          }`}
        >
          {done ? "Time's up!" : "Timer"}
        </span>
        <p
          className={`mt-1 font-display text-5xl font-semibold tabular-nums ${
            done ? "text-accent-ink" : "text-ink"
          }`}
        >
          {formatClock(remaining)}
        </p>
      </div>
      <button
        type="button"
        aria-label={done ? "Restart timer" : running ? "Pause timer" : "Start timer"}
        onClick={() => {
          if (done) {
            setRemaining(seconds);
            setRunning(true);
          } else {
            setRunning((v) => !v);
          }
        }}
        className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl transition-transform active:scale-90 ${
          done ? "bg-ink text-bg" : "bg-accent text-accent-ink"
        }`}
      >
        {done ? "↺" : running ? "❚❚" : "▶"}
      </button>
    </div>
  );
}

export default function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const recipe = useRecipeStore((s) => s.recipes.find((r) => r.id === id));
  const [stepIndex, setStepIndex] = useState(0);

  // Keep the screen awake while cooking; fail silently where unsupported.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock?.request("screen");
        if (!lock) return;
        if (active) sentinel = lock;
        else lock.release().catch(() => {});
      } catch {
        // Unsupported or denied — cooking works fine without it.
      }
    };
    acquire();
    const reacquire = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", reacquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", reacquire);
      sentinel?.release().catch(() => {});
    };
  }, []);

  if (!hydrated) return null;
  if (!recipe) {
    return (
      <div className="force-midnight fixed inset-0 z-50 grid place-items-center bg-bg px-5 text-center text-ink">
        <div>
          <h1 className="text-3xl font-semibold">Recipe not found</h1>
          <Link href="/" className="mt-4 inline-block font-bold text-highlight underline">
            Back to my recipes
          </Link>
        </div>
      </div>
    );
  }

  const steps = recipe.steps;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  return (
    <div className="force-midnight fixed inset-0 z-50 overflow-y-auto bg-bg text-ink">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pb-8 pt-6 md:px-6">
        <Link
          href={`/recipe/${recipe.id}`}
          aria-label="Close cooking mode"
          className="grid h-11 w-11 place-items-center rounded-full bg-surface text-xl transition-colors hover:text-highlight"
        >
          ×
        </Link>

        <div
          className="mt-5 flex gap-1.5"
          role="progressbar"
          aria-label="Cooking progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
        >
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? "bg-accent" : "bg-ink/15"
              }`}
            />
          ))}
        </div>

        {/* key remounts on step change so the rise animation and timer reset */}
        <section key={stepIndex} className="mt-8 grow">
          <p className="rise text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h1
            className="rise mt-2 text-4xl font-semibold leading-[1.05] md:text-5xl"
            style={{ "--rise-delay": "60ms" } as React.CSSProperties}
          >
            {step.title}
          </h1>
          <p
            className="rise mt-5 text-xl leading-relaxed text-ink-soft"
            style={{ "--rise-delay": "100ms" } as React.CSSProperties}
          >
            {step.body}
          </p>
          {step.timerSeconds && <StepTimer seconds={step.timerSeconds} />}
        </section>

        <footer className="mt-10 flex items-center gap-4">
          <button
            type="button"
            aria-label="Previous step"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-xl transition-opacity active:scale-90 disabled:opacity-35"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() =>
              isLast ? router.push(`/recipe/${recipe.id}`) : setStepIndex((i) => i + 1)
            }
            className="h-14 grow rounded-control bg-accent text-lg font-bold text-accent-ink transition-transform active:scale-[0.98]"
          >
            {isLast ? "Finish cooking ✓" : "Next step →"}
          </button>
        </footer>
      </div>
    </div>
  );
}
