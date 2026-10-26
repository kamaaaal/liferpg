"use client";

import { useSyncExternalStore } from "react";

type Today = { day: string; month: string; weekday: string };

let cached: Today | null = null;

function getClientSnapshot(): Today {
  if (!cached) {
    const now = new Date();
    cached = {
      day: now.toLocaleDateString(undefined, { day: "numeric" }),
      month: now.toLocaleDateString(undefined, { month: "long" }),
      weekday: now.toLocaleDateString(undefined, { weekday: "long" }),
    };
  }
  return cached;
}

const subscribe = () => () => {};
const getServerSnapshot = (): Today | null => null;

/**
 * The desk calendar's top page. The date is resolved on the client so it shows
 * the reader's own local day rather than a prerendered build-time date.
 */
export function DeskCalendar() {
  const today = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return (
    <article className="card flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span className="chip chip-terracotta">{today?.weekday ?? "Today"}</span>
        <span className="chip chip-active">
          <span aria-hidden="true">🌤</span> Breezy
        </span>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl leading-none font-extrabold text-mahogany">
          {today?.day ?? "—"}
        </span>
        <span className="h3 text-honey-deep uppercase">{today?.month ?? ""}</span>
      </p>
      <p className="muted mt-4">
        Scheduling and reminders arrive with the desk calendar. Until then, plan
        in your own notes.
      </p>
    </article>
  );
}
