"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TimerSession = {
  id: string;
  state: "running" | "paused";
  taskId: string | null;
  startedAt: string;
  accumulatedSeconds: number;
};

type Task = { id: string; title: string };

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function TimerPage() {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [manual, setManual] = useState({ startedAt: "", endedAt: "", notes: "" });
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/timer");
    const data = await res.json();
    setSession(data && data.id ? data : null);
  }

  useEffect(() => {
    fetch("/api/timer")
      .then((r) => r.json())
      .then((d) => {
        const s = d && d.id ? d : null;
        setSession(s);
        if (s?.taskId) setSelectedTask(s.taskId);
      })
      .catch(() => setSession(null));
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : []));
  }, []);

  const displayedElapsed =
    session && session.state === "paused"
      ? session.accumulatedSeconds
      : session && session.state === "running"
        ? elapsed
        : 0;

  useEffect(() => {
    if (!session || session.state !== "running") return;
    const start = new Date(session.startedAt).getTime();
    const acc = session.accumulatedSeconds;
    const tick = () => {
      const now = Date.now();
      setElapsed(acc + Math.floor((now - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  async function call(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(data?.error || "Error");
    else setMessage(null);
    await refresh();
    return data;
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manual.startedAt || !manual.endedAt) {
      setMessage("Start and end are required");
      return;
    }
    const s = new Date(manual.startedAt);
    const en = new Date(manual.endedAt);
    if (en <= s) {
      setMessage("End must be after start");
      return;
    }
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: s.toISOString(),
        endedAt: en.toISOString(),
        notes: manual.notes || null,
        taskId: selectedTask || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(data?.error || "Error");
    else {
      setMessage("Manual entry added");
      setManual({ startedAt: "", endedAt: "", notes: "" });
    }
  }

  const isRunning = session?.state === "running";
  const isPaused = session?.state === "paused";

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <div
          className="toast-banner toast-error"
          role="alert"
        >
          {message}
        </div>
      )}

      <div className="woodgrain p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Main pomodoro card */}
          <div className="card flex flex-col items-center gap-4 lg:col-span-8">
            <div className="flex w-full items-center justify-between">
              <h1 className="h1">Timer</h1>
              <span
                className={[
                  "badge-seal",
                  isRunning ? "badge-sage" : isPaused ? "badge-honey" : "",
                ].join(" ")}
              >
                {isRunning ? "Focus" : isPaused ? "Paused" : "Idle"}
              </span>
            </div>

            <div className="timer-dial" aria-label="Elapsed time">
              <span className="font-mono text-4xl font-extrabold text-mahogany">
                {formatSeconds(displayedElapsed)}
              </span>
              <span className="label text-[10px] text-muted">Elapsed</span>
            </div>

            <div className="w-full">
              <label className="label mb-1 block">Linked Task</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="input w-full"
                disabled={!!session}
              >
                <option value="">No task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {!session && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => call("/api/timer/start", { taskId: selectedTask || null })}
                >
                  Start
                </button>
              )}
              {isRunning && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => call("/api/timer/pause")}>
                    Pause
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => call("/api/timer/stop")}>
                    Stop
                  </button>
                </>
              )}
              {isPaused && (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => call("/api/timer/resume")}>
                    Resume
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => call("/api/timer/stop")}>
                    Stop
                  </button>
                </>
              )}
            </div>

            {!session && (
              <p className="muted text-xs">No active timer. Press Start to begin a focus session.</p>
            )}
          </div>

          {/* Side: manual entry */}
          <div className="card flex flex-col gap-3 lg:col-span-4">
            <h2 className="h2">Manual entry</h2>
            <p className="muted text-xs">
              Record a session after the fact. Times are validated on save.
            </p>
            <form onSubmit={submitManual} className="flex flex-col gap-3">
              <div>
                <label className="label mb-1 block">Start</label>
                <input
                  type="datetime-local"
                  value={manual.startedAt}
                  onChange={(e) => setManual({ ...manual, startedAt: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label mb-1 block">End</label>
                <input
                  type="datetime-local"
                  value={manual.endedAt}
                  onChange={(e) => setManual({ ...manual, endedAt: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label mb-1 block">Notes</label>
                <input
                  type="text"
                  value={manual.notes}
                  onChange={(e) => setManual({ ...manual, notes: e.target.value })}
                  placeholder="What did you work on?"
                  className="input w-full"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Record Entry
              </button>
            </form>
            <Link href="/timesheet" className="text-xs text-muted underline underline-offset-2">
              View the Timesheet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}