# Backlog: Simplify jargon, declutter, fix Tasks + Projects hierarchy UI

## A. Replace jargon with plain terms
- [x] Tasks page: All Quests→All Tasks, + New Quest→+ New Task, Inscribe a New Quest→Add Task, Delete this quest?→Delete this task?, Acorn XP→Points, empty state→"No tasks yet. Add one above."
- [x] Projects page: Projects & Expeditions→Projects, Hierarchical Expeditions Ledger→Project tree, Active Canopy Trees→Projects, Plant project→Add project, empty state→"No projects yet. Add one above."
- [x] Timer page: Brass Pomodoro→Timer, Wind Up→Start, Stop & Bank→Stop, Ledger by Hand→Manual entry
- [x] Timesheet page: Field Ledger→Timesheet
- [x] Reports page: Almanac→Reports
- [x] Activity page: Inscribe Quick Activity Log→Log activity (also header→Activity Log, Field Chronicle/Quest removed)
- [x] AppShell nav: update labels to plain terms (Home, Timer, Timesheet, Activity Log, Reports)

## B. Remove scattered decorative clutter on functional pages
- [x] Tasks: remove "Ledger Vault: 1,420 / Decor" pill
- [x] Projects: remove "Almanac Decor" HUD strip
- [x] Projects: remove "Season of Amber Leaves" chip
- [x] Activity: remove "Archive Tome #12 / Decor" chip
- [x] Activity: remove "Solstice Cycle 4" chip
- [x] Check Timer/Timesheet/Reports/Schedule for stray decorative clutter and remove (Schedule clean; Timer/Timesheet/Reports de-jargoned)

## C. Fix Projects hierarchy UI
- [x] Add `expandedIds: Set<string>` state (default all expanded)
- [x] Rewrite renderTree: left toggle button (▸/▾) only if project has children
- [x] Show name, description, task-count badge, archived badge
- [x] Right side: Edit, Delete, "Add child" (opens create modal with parent pre-selected)
- [x] Visible nesting: vertical guide line + horizontal elbow connectors + indent
- [x] Keep inline edit as a `.card` inside the row

## D. Clean up Tasks UI
- [x] Header: title + task-count badge + "+ New Task" button; remove decorative vault pill
- [x] Filter row inside one `.card`: search input (🔍 icon) + segmented status pill + segmented range pill + project select (grouped)
- [x] "Daily progress" bar with plain labels; remove "Bounty"/"Warm Tea bonus"
- [x] Task rows: checkbox, title, status chip; second line = project, due, estimate, points, tags; right = Edit/Delete; subtask count via Show/Hide subtasks (N)
- [x] Modal: heading "Add Task", plain fields, "Add Task"/"Cancel"

## Verification
- [x] npm run typecheck (clean)
- [x] npm run lint (only pre-existing schema.ts `any` errors; no new issues in changed files)
- [ ] npm test — BLOCKED: vitest/rolldown needs Node ≥20.12 (`node:util` styleText); machine runs Node 18.18.2. Startup error, unrelated to these JSX/text edits.
- [ ] Browser check on LAN IP — not run in this session.
- [x] Grep for leftover jargon — only Home-page components (Hearth*, TaskLedger) + identifiers/comment remain, which the spec keeps as decorative flavor on Home.

## Done when
All checkboxes ticked, all gates pass, and the UI reads in plain terms with no decorative
clutter on functional pages and a proper collapsible project tree.
