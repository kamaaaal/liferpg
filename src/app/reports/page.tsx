"use client";

import { useEffect, useState } from "react";

type Report = {
  totalSeconds: number;
  byProject: Record<string, { name: string | null; seconds: number }>;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/time?${params.toString()}`);
      if (!res.ok) throw new Error(`Could not load report (${res.status})`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/reports/time?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setReport(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load report");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = report?.totalSeconds ?? 0;
  const projects = report
    ? Object.entries(report.byProject).map(([key, v]) => ({
        key,
        name: v.name ?? "No project",
        seconds: v.seconds,
      }))
    : [];
  const maxSeconds = projects.reduce((m, p) => Math.max(m, p.seconds), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="h1">Reports</h1>

      {error && (
        <div className="toast-banner toast-error" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="hud-pill flex-col items-start gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted">Total Tracked</span>
          <span className="font-display text-2xl font-extrabold text-mahogany">
            {formatDuration(total)}
          </span>
        </div>
        <div className="hud-pill flex-col items-start gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted">Projects Tracked</span>
          <span className="font-display text-2xl font-extrabold text-mahogany">
            {projects.length}
          </span>
        </div>
      </div>

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
          Apply
        </button>
      </div>

      <div className="card">
        <h2 className="h2 mb-3">Time by Project</h2>
        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="muted text-sm">No data yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {projects
              .sort((a, b) => b.seconds - a.seconds)
              .map((p) => (
                <li key={p.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label text-xs">{p.name}</span>
                    <span className="badge-seal badge-honey">{formatDuration(p.seconds)}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: maxSeconds ? `${(p.seconds / maxSeconds) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      <p className="muted text-xs">
        Tracked time is not a measure of your worth.
      </p>
    </div>
  );
}