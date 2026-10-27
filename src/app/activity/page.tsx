"use client";

import { useEffect, useState } from "react";

type ActivityLog = {
  id: string;
  kind: string;
  occurredAt: string;
  durationMinutes: number | null;
  notes: string | null;
  taskId: string | null;
  projectId: string | null;
};

type Task = { id: string; title: string };
type Project = { id: string; name: string };

const KIND_FILTERS = [
  { key: "all", label: "All" },
  { key: "focus", label: "Focus" },
  { key: "milestone", label: "Milestone" },
  { key: "letter", label: "Letter" },
  { key: "scribing", label: "Note" },
] as const;

// Module-level (not during render) to satisfy react-hooks/purity.
const NOW_MS = Date.now();
const WEEK_AGO_MS = NOW_MS - 7 * 24 * 60 * 60 * 1000;

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters (mockup interactivity: chips + search + range)
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week">("all");

  // modal form
  const [showModal, setShowModal] = useState(false);
  const [kind, setKind] = useState("activity");
  const [occurredAt, setOccurredAt] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [taskId, setTaskId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/activity-logs"), fetch("/api/tasks"), fetch("/api/projects")])
      .then(async ([lRes, tRes, pRes]) => {
        if (!lRes.ok) throw new Error(`logs ${lRes.status}`);
        if (!tRes.ok) throw new Error(`tasks ${tRes.status}`);
        if (!pRes.ok) throw new Error(`projects ${pRes.status}`);
        setLogs(await lRes.json());
        setTasks(await tRes.json());
        setProjects(await pRes.json());
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load");
        setLoading(false);
      });
  }, []);

  const taskName = (id: string | null) => (id ? tasks.find((t) => t.id === id)?.title ?? "Unknown task" : null);
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? "Unknown project" : null);

  const sorted = [...logs]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .filter((l) => {
      if (kindFilter !== "all" && l.kind.toLowerCase() !== kindFilter) return false;
      if (search && !(l.kind + " " + (l.notes ?? "")).toLowerCase().includes(search.toLowerCase())) return false;
      if (range !== "all") {
        const occurred = new Date(l.occurredAt).getTime();
        if (range === "today") {
          if (new Date(occurred).toDateString() !== new Date(NOW_MS).toDateString()) return false;
        } else if (range === "week") {
          if (occurred < WEEK_AGO_MS || occurred > NOW_MS) return false;
        }
      }
      return true;
    });

  async function createLog(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { kind: kind.trim() || "activity" };
      if (occurredAt) body.occurredAt = new Date(occurredAt).toISOString();
      if (duration) body.durationMinutes = Number(duration);
      if (notes.trim()) body.notes = notes.trim();
      if (taskId) body.taskId = taskId;
      if (projectId) body.projectId = projectId;
      const res = await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not log (${res.status})`);
      }
      const created: ActivityLog = await res.json();
      setLogs((prev) => [created, ...prev]);
      setKind("activity");
      setOccurredAt("");
      setDuration("");
      setNotes("");
      setTaskId("");
      setProjectId("");
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="muted">Loading activity…</p>;

  const focusHours = logs
    .filter((l) => l.kind.toLowerCase() === "focus")
    .reduce((s, l) => s + (l.durationMinutes ?? 0), 0) / 60;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h1-xl">Activity Log</h1>
          <p className="muted text-sm mt-1">
            Logged work periods, focus sessions, and task milestones.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="hud-pill">{logs.length} entries</span>
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Quick Log
          </button>
        </div>
      </div>
      <p className="muted text-xs -mt-2">{focusHours.toFixed(1)} focus hours</p>

      {error && (
        <div className="toast-banner toast-error" role="alert">
          {error}
        </div>
      )}

      {/* Filter chips + range + search (mockup interactivity) */}
      <div className="card flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKindFilter(f.key)}
              className={[
                "px-3 py-1.5 rounded-full font-label text-xs font-bold border-2 transition-all",
                kindFilter === f.key
                  ? "border-mahogany bg-honey text-parchment shadow-[0_2px_0_var(--honey-deep)]"
                  : "border-mahogany/40 bg-surface text-muted hover:border-mahogany hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRange("today")}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all",
              range === "today"
                ? "border-mahogany bg-surface-2 text-mahogany"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setRange("week")}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all",
              range === "week"
                ? "border-mahogany bg-surface-2 text-mahogany"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setRange("all")}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all",
              range === "all"
                ? "border-mahogany bg-surface-2 text-mahogany"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            All
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs…"
          className="input flex-1 min-w-[180px] text-sm"
        />
      </div>

      {/* Recent activity — hero */}
      <div className="card">
        <h2 className="h2 mb-3">Recent activity</h2>
        {sorted.length === 0 ? (
          <p className="muted text-sm">No activity logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="label pb-2 pr-3 text-xs">Kind</th>
                  <th className="label pb-2 pr-3 text-xs">When</th>
                  <th className="label pb-2 pr-3 text-xs">Duration</th>
                  <th className="label pb-2 pr-3 text-xs">Task / Project</th>
                  <th className="label pb-2 text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="py-2 pr-3">
                      <span className="badge-seal badge-honey">{l.kind}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted">
                      {new Date(l.occurredAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {l.durationMinutes != null ? (
                        <span className="badge-seal badge-locked">{l.durationMinutes}m</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col gap-0.5">
                        {taskName(l.taskId) && (
                          <span className="badge-seal badge-sage text-[10px]">
                            📋 {taskName(l.taskId)}
                          </span>
                        )}
                        {projectName(l.projectId) && (
                          <span className="badge-seal badge-honey text-[10px]">
                            🌿 {projectName(l.projectId)}
                          </span>
                        )}
                        {!taskName(l.taskId) && !projectName(l.projectId) && (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-sm text-mahogany">{l.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick log modal */}
      {showModal && (
        <div className="modal-scrim flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Log activity</h2>
              <button
                type="button"
                aria-label="Close dialog"
                className="btn btn-ghost text-xs"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createLog} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1 block">Kind</label>
                <input
                  type="text"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="input"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="label mb-1 block">Occurred at</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1 block">Duration (min)</label>
                <input
                  type="number"
                  min={0}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1 block">Task (optional)</label>
                <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input">
                  <option value="">No task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label mb-1 block">Project (optional)</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="input"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label mb-1 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full"
                  rows={2}
                  maxLength={2000}
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Logging…" : "Log activity"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}