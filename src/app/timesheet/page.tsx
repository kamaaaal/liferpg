"use client";

import { useEffect, useState } from "react";

type TimeEntry = {
  id: string;
  taskId: string | null;
  projectId: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  notes: string | null;
  source?: string;
};

type DailyTotal = { day: string; seconds: number };

type Task = { id: string; title: string };
type Project = { id: string; name: string };

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TimesheetPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [daily, setDaily] = useState<DailyTotal[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mTaskId, setMTaskId] = useState("");
  const [mProjectId, setMProjectId] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/timesheets?${params.toString()}`);
      if (!res.ok) throw new Error(`Could not load timesheet (${res.status})`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      const dailyArr = Object.entries(data.daily ?? {}).map(([day, seconds]) => ({
        day,
        seconds: seconds as number,
      }));
      setDaily(dailyArr);
      setTotalSeconds(data.totalSeconds ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load timesheet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/timesheets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setEntries(d.entries ?? []);
          const dailyArr = Object.entries(d.daily ?? {}).map(([day, seconds]) => ({
            day,
            seconds: seconds as number,
          }));
          setDaily(dailyArr);
          setTotalSeconds(d.totalSeconds ?? 0);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load timesheet");
        setLoading(false);
      });
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTasks(Array.isArray(d) ? d : []));
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(Array.isArray(d) ? d : []));
  }, []);

  function taskName(id: string | null): string | null {
    if (!id) return null;
    return tasks.find((t) => t.id === id)?.title ?? "Unknown task";
  }

  function projectName(id: string | null): string | null {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name ?? "Unknown project";
  }

  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditStart(toLocalInput(entry.startedAt));
    setEditEnd(toLocalInput(entry.endedAt));
    setEditNotes(entry.notes ?? "");
    setEditTaskId(entry.taskId ?? "");
    setEditProjectId(entry.projectId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditStart("");
    setEditEnd("");
    setEditNotes("");
    setEditTaskId("");
    setEditProjectId("");
  }

  async function saveEdit(id: string) {
    if (!editStart || !editEnd) {
      setError("Start and end are required");
      return;
    }
    const s = new Date(editStart);
    const en = new Date(editEnd);
    if (en <= s) {
      setError("End must be after start");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt: s.toISOString(),
          endedAt: en.toISOString(),
          notes: editNotes,
          taskId: editTaskId || null,
          projectId: editProjectId || null,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not save (${res.status})`);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not delete (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!mStart || !mEnd) {
      setError("Start and end are required");
      return;
    }
    const s = new Date(mStart);
    const en = new Date(mEnd);
    if (en <= s) {
      setError("End must be after start");
      return;
    }
    setSavingManual(true);
    setError(null);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt: s.toISOString(),
          endedAt: en.toISOString(),
          notes: mNotes || null,
          taskId: mTaskId || null,
          projectId: mProjectId || null,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not log (${res.status})`);
      }
      setMStart("");
      setMEnd("");
      setMNotes("");
      setMTaskId("");
      setMProjectId("");
      setShowManual(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log");
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Timesheet</h1>
        <span className="hud-pill">
          Total Tracked: {formatDuration(totalSeconds)}
        </span>
      </div>

      {error && (
        <div className="toast-banner toast-error" role="alert">
          {error}
        </div>
      )}

      {/* Manual entry form */}
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="h2">Log time manually</h2>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Cancel" : "+ Add entry"}
          </button>
        </div>
        {showManual && (
          <form onSubmit={submitManual} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label mb-1 block">Start</label>
              <input
                type="datetime-local"
                value={mStart}
                onChange={(e) => setMStart(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">End</label>
              <input
                type="datetime-local"
                value={mEnd}
                onChange={(e) => setMEnd(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">Task (optional)</label>
              <select
                value={mTaskId}
                onChange={(e) => setMTaskId(e.target.value)}
                className="input"
              >
                <option value="">— None —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-1 block">Project (optional)</label>
              <select
                value={mProjectId}
                onChange={(e) => setMProjectId(e.target.value)}
                className="input"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label mb-1 block">Notes</label>
              <input
                type="text"
                value={mNotes}
                onChange={(e) => setMNotes(e.target.value)}
                className="input"
                placeholder="What did you work on?"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingManual}
              >
                {savingManual ? "Saving…" : "Log entry"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter card */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label mb-1 block">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label mb-1 block">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input"
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={load}>
          Filter
        </button>
      </div>

      {/* Daily totals */}
      <div className="card">
        <h2 className="h2 mb-3">Daily Totals</h2>
        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : daily.length === 0 ? (
          <p className="muted text-sm">No entries in this range.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {daily.map((d) => (
              <div key={d.day} className="task-row justify-between">
                <span className="label text-xs">{d.day}</span>
                <span className="badge-seal badge-honey">{formatDuration(d.seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entries ledger */}
      <div className="card">
        <h2 className="h2 mb-3">Entries</h2>
        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="muted text-sm">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="label pb-2 pr-3 text-xs">Start</th>
                  <th className="label pb-2 pr-3 text-xs">End</th>
                  <th className="label pb-2 pr-3 text-xs">Duration</th>
                  <th className="label pb-2 pr-3 text-xs">Task / Project</th>
                  <th className="label pb-2 pr-3 text-xs">Source</th>
                  <th className="label pb-2 pr-3 text-xs">Notes</th>
                  <th className="label pb-2 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const qName = taskName(entry.taskId);
                  const pName = projectName(entry.projectId);
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            className="input text-xs"
                          />
                        ) : (
                          new Date(entry.startedAt).toLocaleString()
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                            className="input text-xs"
                          />
                        ) : (
                          new Date(entry.endedAt).toLocaleString()
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="badge-seal badge-honey">
                          {formatDuration(entry.durationSeconds)}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <select
                              value={editTaskId}
                              onChange={(e) => setEditTaskId(e.target.value)}
                              className="input text-xs"
                            >
                              <option value="">— No task —</option>
                              {tasks.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.title}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editProjectId}
                              onChange={(e) => setEditProjectId(e.target.value)}
                              className="input text-xs"
                            >
                              <option value="">— No project —</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {qName && (
                              <span className="badge-seal badge-sage text-[10px]">
                                📋 {qName}
                              </span>
                            )}
                            {pName && (
                              <span className="badge-seal badge-honey text-[10px]">
                                🌿 {pName}
                              </span>
                            )}
                            {!qName && !pName && (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted">{entry.source ?? "manual"}</td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="input text-xs"
                          />
                        ) : (
                          entry.notes ?? "—"
                        )}
                      </td>
                      <td className="py-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="btn btn-primary text-xs"
                              onClick={() => saveEdit(entry.id)}
                              disabled={saving}
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost text-xs"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost text-xs"
                              onClick={() => startEdit(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger text-xs"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}