"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  archivedAt: string | null;
};

type Task = { id: string; projectId: string | null };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newParent, setNewParent] = useState("");
  const [creating, setCreating] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editArchived, setEditArchived] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/projects"), fetch("/api/tasks")])
      .then(async ([pRes, tRes]) => {
        if (!pRes.ok) throw new Error(`projects ${pRes.status}`);
        if (!tRes.ok) throw new Error(`tasks ${tRes.status}`);
        const p: Project[] = await pRes.json();
        setProjects(p);
        setExpandedIds(new Set(p.map((x) => x.id))); // default: all expanded
        setTasks(await tRes.json());
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load");
        setLoading(false);
      });
  }, []);

  const taskCount = (id: string) => tasks.filter((t) => t.projectId === id).length;
  const childrenOf = (id: string | null) =>
    projects.filter((p) => p.parentId === id && (showArchived || !p.archivedAt));

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name };
      if (newDesc.trim()) body.description = newDesc.trim();
      if (newParent) body.parentId = newParent;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not create (${res.status})`);
      }
      const created: Project = await res.json();
      setProjects((prev) => [...prev, created]);
      setExpandedIds((prev) => new Set(prev).add(created.id));
      setNewName("");
      setNewDesc("");
      setNewParent("");
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description ?? "");
    setEditParent(p.parentId ?? "");
    setEditArchived(!!p.archivedAt);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: editName.trim(),
        description: editDesc.trim() || null,
        parentId: editParent || null,
        archived: editArchived,
      };
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not save (${res.status})`);
      }
      const updated: Project = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: string) {
    if (!window.confirm("Delete this project? Tasks will be unlinked.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not delete (${res.status})`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const kids = childrenOf(parentId);
    if (kids.length === 0) return null;
    return (
      <ul
        className={
          depth > 0
            ? "flex flex-col gap-2 ml-3 border-l-2 border-mahogany/30 pl-4"
            : "flex flex-col gap-2"
        }
      >
        {kids.map((p) => {
          const hasKids = childrenOf(p.id).length > 0;
          const isOpen = expandedIds.has(p.id);
          return (
            <li key={p.id} className={`relative ${p.archivedAt ? "opacity-60" : ""}`}>
              {/* elbow connector into the parent's vertical guide line */}
              {depth > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -left-4 top-5 h-0 w-4 border-t-2 border-mahogany/30"
                />
              )}
              {editingId === p.id ? (
                <div className="card flex flex-col gap-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input text-sm" />
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input text-sm" rows={2} />
                  <select value={editParent} onChange={(e) => setEditParent(e.target.value)} className="input text-sm">
                    <option value="">No parent</option>
                    {projects
                      .filter((x) => x.id !== p.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editArchived} onChange={(e) => setEditArchived(e.target.checked)} className="accent-honey" />
                    Archived
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary text-xs" onClick={() => saveEdit(p.id)} disabled={saving}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => setEditingId(null)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="task-row justify-between">
                  <div className="flex flex-1 items-start gap-2">
                    {hasKids ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(p.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse ${p.name}` : `Expand ${p.name}`}
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-mahogany hover:bg-surface-2"
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-mahogany">
                        {p.name}
                        <span className="badge-seal badge-locked text-[9px]">{taskCount(p.id)} tasks</span>
                        {p.archivedAt && <span className="badge-seal badge-locked text-[9px]">Archived</span>}
                      </p>
                      {p.description && <p className="muted text-xs">{p.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger text-xs" onClick={() => deleteProject(p.id)}>
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => {
                        setNewName("");
                        setNewDesc("");
                        setNewParent(p.id);
                        setShowCreate(true);
                      }}
                    >
                      Add child
                    </button>
                  </div>
                </div>
              )}
              {hasKids && isOpen && renderTree(p.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  if (loading) return <p className="muted">Loading projects…</p>;

  const visibleCount = projects.filter((p) => showArchived || !p.archivedAt).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="h1">Projects</h1>
            <p className="muted text-xs">Group related work and nest projects into a tree.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Archive toggle switch */}
          <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-2 border-2 border-mahogany text-mahogany cursor-pointer select-none shadow-[0_2px_0_var(--mahogany)] transition-transform active:translate-y-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span>{showArchived ? "👁" : "🚫"}</span>
            <span className="font-label text-xs">Show Archived</span>
            <span className="w-8 h-4 bg-mahogany/30 rounded-full relative p-0.5 transition-colors">
              <span
                className={`block w-3 h-3 bg-surface rounded-full border border-mahogany transition-transform ${showArchived ? "translate-x-4" : ""}`}
              />
            </span>
          </label>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="toast-banner toast-error" role="alert">
          {error}
        </div>
      )}

      {/* Project tree — hero */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-dashed border-mahogany/30 gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="h2">Project tree</h2>
            <span className="badge-seal">{visibleCount} projects</span>
          </div>
        </div>
        {visibleCount === 0 ? (
          <p className="muted text-sm">No projects yet. Add one above.</p>
        ) : (
          renderTree(null, 0)
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-scrim flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Add Project</h2>
              <button
                type="button"
                aria-label="Close dialog"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
                  setNewParent("");
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createProject} className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Website redesign"
                className="input sm:col-span-2"
                maxLength={200}
                required
              />
              <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="input sm:col-span-2">
                <option value="">No parent</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className="input sm:col-span-2" rows={2} maxLength={2000} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Adding…" : "Add project"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                    setNewDesc("");
                    setNewParent("");
                  }}
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