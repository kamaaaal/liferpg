"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  projectId: string | null;
  parentTaskId: string | null;
  dueDate: string | null;
  estimateMinutes: number | null;
  personalPoints: number;
};

type Project = { id: string; name: string; parentId: string | null; archivedAt: string | null };
type Tag = { id: string; name: string };

const STATUS_FILTERS = [
  { key: "all", label: "All Tasks" },
  { key: "todo", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Completed" },
] as const;

// Module-level (not during render) to satisfy react-hooks/purity.
const NOW_MS = Date.now();
const TODAY_STR = new Date(NOW_MS).toISOString().slice(0, 10);

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [projectFilter, setProjectFilter] = useState("");

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newStatus, setNewStatus] = useState<Task["status"]>("todo");
  const [newDue, setNewDue] = useState("");
  const [newEstimate, setNewEstimate] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");
  const [editProjectId, setEditProjectId] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editEstimate, setEditEstimate] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function projectName(id: string | null) {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name ?? "Unknown";
  }

  useEffect(() => {
    Promise.all([fetch("/api/tasks"), fetch("/api/projects"), fetch("/api/tags")])
      .then(async ([tRes, pRes, gRes]) => {
        if (!tRes.ok) throw new Error(`tasks ${tRes.status}`);
        if (!pRes.ok) throw new Error(`projects ${pRes.status}`);
        if (!gRes.ok) throw new Error(`tags ${gRes.status}`);
        const t: Task[] = await tRes.json();
        setTasks(t);
        setProjects(await pRes.json());
        setTags(await gRes.json());
        // fetch tags for each task so chips render inline
        t.forEach((task) => {
          fetch(`/api/tasks/${task.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) setTaskTags((prev) => ({ ...prev, [task.id]: d.tagIds ?? [] }));
            })
            .catch(() => {});
        });
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load");
        setLoading(false);
      });
  }, []);

  async function fetchTaskTags(id: string) {
    if (taskTags[id]) return;
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const d = await res.json();
        setTaskTags((prev) => ({ ...prev, [id]: d.tagIds ?? [] }));
      }
    } catch {
      /* ignore */
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { title, status: newStatus };
      if (newProjectId) body.projectId = newProjectId;
      if (newDue) body.dueDate = newDue;
      if (newEstimate) body.estimateMinutes = Number(newEstimate);
      body.personalPoints = Number(newPoints) || 0;
      if (newTagIds.length) body.tagIds = newTagIds;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not create (${res.status})`);
      }
      const created: Task = await res.json();
      setTasks((prev) => [created, ...prev]);
      setTaskTags((prev) => ({ ...prev, [created.id]: newTagIds }));
      resetCreate();
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setCreating(false);
    }
  }

  function resetCreate() {
    setNewTitle("");
    setNewProjectId("");
    setNewStatus("todo");
    setNewDue("");
    setNewEstimate("");
    setNewPoints("");
    setNewTagIds([]);
  }

  async function toggleStatus(task: Task, checked: boolean) {
    const next = checked ? "done" : "todo";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("update failed");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      setError("Could not update task");
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStatus(task.status);
    setEditProjectId(task.projectId ?? "");
    setEditDue(task.dueDate ?? "");
    setEditEstimate(task.estimateMinutes != null ? String(task.estimateMinutes) : "");
    setEditPoints(String(task.personalPoints ?? 0));
    if (!taskTags[task.id]) fetchTaskTags(task.id);
    setEditTagIds(taskTags[task.id] ?? []);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { title: editTitle.trim(), status: editStatus };
      body.projectId = editProjectId || null;
      if (editDue) body.dueDate = editDue; else body.dueDate = null;
      if (editEstimate) body.estimateMinutes = Number(editEstimate); else body.estimateMinutes = null;
      body.personalPoints = Number(editPoints) || 0;
      body.tagIds = editTagIds;
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `Could not save (${res.status})`);
      }
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      setTaskTags((prev) => ({ ...prev, [id]: editTagIds }));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(id: string) {
    if (!window.confirm("Delete this task?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not delete (${res.status})`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  // filter logic
  const filtered = tasks.filter((t) => {
    if (projectFilter && t.projectId !== projectFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (range !== "all") {
      const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
      if (range === "today") {
        if (!due) return false;
        if (t.dueDate !== TODAY_STR) return false;
      } else if (range === "week") {
        if (!due) return false;
        const weekAgo = NOW_MS - 7 * 24 * 60 * 60 * 1000;
        if (due < weekAgo || due > NOW_MS) return false;
      }
    }
    return true;
  });

  const childrenOf = (id: string) => tasks.filter((t) => t.parentTaskId === id);

  if (loading) return <p className="muted">Loading tasks…</p>;

  const completed = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="h1">Tasks</h1>
          <span className="badge-seal">{total} total</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="toast-banner toast-error" role="alert">
          {error}
        </div>
      )}

      {/* Main parchment ledger card */}
      <div className="card">
        {/* Search + filters row */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center pb-5">
          {/* Search input with icon */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="input w-full pl-10 text-sm"
            />
          </div>
          {/* Filter chips in segmented pill + range + project */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={[
                    "px-3 py-1.5 rounded-lg font-label text-xs transition-colors",
                    statusFilter === f.key
                      ? "bg-surface text-mahogany shadow-sm font-bold"
                      : "text-muted hover:text-mahogany",
                  ].join(" ")}
                >
                  {f.label}
                  {f.key === "all" ? ` (${tasks.length})` : ""}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2">
              {(["today", "week", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={[
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    range === r
                      ? "bg-surface text-mahogany shadow-sm"
                      : "text-muted hover:text-mahogany",
                  ].join(" ")}
                >
                  {r === "today" ? "Today" : r === "week" ? "Week" : "All"}
                </button>
              ))}
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input text-xs"
            >
              <option value="">All projects</option>
              {projects
                .filter((p) => !p.archivedAt)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Daily progress */}
        <div className="bg-surface-2/70 rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-honey">✓</div>
            <div>
              <span className="font-label text-xs text-muted uppercase tracking-wide block">Daily progress</span>
              <span className="text-xs text-muted">
                {completed} of {total} completed
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1 h-3 rounded-full bg-surface overflow-hidden border-2 border-mahogany">
              <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-label text-xs text-sage font-bold">{pct}%</span>
          </div>
        </div>

        {/* Task list — hero */}
        {filtered.length === 0 ? (
          <p className="muted text-sm">
            {tasks.length === 0
              ? "No tasks yet. Add one above."
              : "No tasks match these filters."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered
              .filter((t) => !t.parentTaskId)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  subtasks={childrenOf(task.id)}
                  projects={projects}
                  tags={tags}
                  taskTags={taskTags}
                  editingId={editingId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editStatus={editStatus}
                  setEditStatus={setEditStatus}
                  editProjectId={editProjectId}
                  setEditProjectId={setEditProjectId}
                  editDue={editDue}
                  setEditDue={setEditDue}
                  editEstimate={editEstimate}
                  setEditEstimate={setEditEstimate}
                  editPoints={editPoints}
                  setEditPoints={setEditPoints}
                  editTagIds={editTagIds}
                  setEditTagIds={setEditTagIds}
                  saving={saving}
                  expanded={!!expanded[task.id]}
                  onToggleExpand={() => setExpanded((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                  onToggleStatus={toggleStatus}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={deleteTask}
                  projectName={projectName}
                />
              ))}
          </ul>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-scrim flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Add Task</h2>
              <button
                type="button"
                aria-label="Close dialog"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createTask} className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Write weekly status update"
                className="input sm:col-span-2"
                maxLength={300}
                required
              />
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="input"
              >
                <option value="">— No project —</option>
                {projects
                  .filter((p) => !p.archivedAt)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Task["status"])}
                className="input"
              >
                <option value="todo">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="input"
                placeholder="Due date"
              />
              <input
                type="number"
                min={0}
                value={newEstimate}
                onChange={(e) => setNewEstimate(e.target.value)}
                placeholder="Estimate (min)"
                className="input"
              />
              <input
                type="number"
                min={0}
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                placeholder="Points"
                className="input"
              />
              <input
                type="text"
                value={newTagIds.join(", ")}
                onChange={(e) =>
                  setNewTagIds(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((name) => tags.find((t) => t.name === name)?.id)
                      .filter((x): x is string => !!x),
                  )
                }
                placeholder="Tags (comma-separated)"
                className="input sm:col-span-2"
              />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Adding…" : "Add Task"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCreate(false);
                    resetCreate();
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

function TaskRow(props: {
  task: Task;
  subtasks: Task[];
  projects: Project[];
  tags: Tag[];
  taskTags: Record<string, string[]>;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editStatus: Task["status"];
  setEditStatus: (v: Task["status"]) => void;
  editProjectId: string;
  setEditProjectId: (v: string) => void;
  editDue: string;
  setEditDue: (v: string) => void;
  editEstimate: string;
  setEditEstimate: (v: string) => void;
  editPoints: string;
  setEditPoints: (v: string) => void;
  editTagIds: string[];
  setEditTagIds: (v: string[]) => void;
  saving: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: (t: Task, c: boolean) => void;
  onStartEdit: (t: Task) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  projectName: (id: string | null) => string | null;
}) {
  const {
    task, subtasks, projects, tags, taskTags, editingId, editTitle, setEditTitle,
    editStatus, setEditStatus, editProjectId, setEditProjectId, editDue, setEditDue, editEstimate,
    setEditEstimate, editPoints, setEditPoints, editTagIds, setEditTagIds, saving, expanded,
    onToggleExpand, onToggleStatus, onStartEdit, onSaveEdit, onCancelEdit, onDelete, projectName,
  } = props;
  const isEditing = editingId === task.id;
  const done = task.status === "done";
  const tagIds = taskTags[task.id] ?? [];

  return (
    <li className={done ? "task-row task-row-done" : "task-row"}>
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => onToggleStatus(task, e.target.checked)}
        aria-label={`Mark ${task.title} ${done ? "incomplete" : "complete"}`}
        className="mt-1 h-5 w-5 shrink-0 rounded-lg border-2 border-mahogany accent-honey"
      />
      <div className="flex-1">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input text-sm" />
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Task["status"])} className="input text-sm">
                <option value="todo">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
              <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="input text-sm">
                <option value="">No project</option>
                {projects
                  .filter((p) => !p.archivedAt)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="input text-sm" />
              <input type="number" min={0} value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} placeholder="estimate min" className="input text-sm" />
              <input type="number" min={0} value={editPoints} onChange={(e) => setEditPoints(e.target.value)} placeholder="points" className="input text-sm" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <label key={t.id} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={editTagIds.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) setEditTagIds([...editTagIds, t.id]);
                      else setEditTagIds(editTagIds.filter((x) => x !== t.id));
                    }}
                    className="accent-honey"
                  />
                  {t.name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary text-xs" onClick={() => onSaveEdit(task.id)} disabled={saving}>
                {saving ? "…" : "Save"}
              </button>
              <button type="button" className="btn btn-ghost text-xs" onClick={onCancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="task-row-title font-display text-sm font-bold text-mahogany">{task.title}</p>
              <span
                className={[
                  "badge-seal text-[10px]",
                  task.status === "done"
                    ? "badge-sage"
                    : task.status === "in_progress"
                      ? "badge-honey"
                      : "badge-locked",
                ].join(" ")}
              >
                {task.status === "done"
                  ? "Completed ✓"
                  : task.status === "in_progress"
                    ? "In Progress"
                    : "Pending"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {projectName(task.projectId) && <span>🌿 {projectName(task.projectId)}</span>}
              {task.dueDate && <span>📅 {task.dueDate}</span>}
              {task.estimateMinutes != null && <span>⏱ {task.estimateMinutes}m</span>}
              {task.personalPoints > 0 && (
                <span className="badge-seal badge-honey text-[9px]">+{task.personalPoints} Points</span>
              )}
              {tagIds.map((tid) => {
                const t = tags.find((x) => x.id === tid);
                return t ? (
                  <span key={tid} className="badge-seal badge-sage text-[9px]">
                    #{t.name}
                  </span>
                ) : null;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost text-xs" onClick={() => onStartEdit(task)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger text-xs" onClick={() => onDelete(task.id)}>
                Delete
              </button>
              {subtasks.length > 0 && (
                <button type="button" className="btn btn-ghost text-xs" onClick={onToggleExpand}>
                  {expanded ? "Hide" : "Show"} subtasks ({subtasks.length})
                </button>
              )}
            </div>
            {expanded && subtasks.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2 border-l-2 border-mahogany/30 pl-3">
                {subtasks.map((c) => (
                  <li key={c.id} className="text-sm text-mahogany">
                    • {c.title}{" "}
                    <span className="badge-seal badge-locked text-[9px]">{c.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}