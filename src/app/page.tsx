import Link from "next/link";
import { DeskCalendar } from "@/components/DeskCalendar";

/**
 * The desk chamber — the cozy home scene.
 * Each object is a direct entry point to a functional view; nothing here is a
 * mandatory intermediate page, and every destination is also in the top nav.
 */

type DeskObject = {
  href: string;
  icon: string;
  title: string;
  desc: string;
};

const deskObjects: DeskObject[] = [
  {
    href: "/timer",
    icon: "⏳",
    title: "Brass Pomodoro",
    desc: "Start, pause, resume, stop. Manual entries and corrections too.",
  },
  {
    href: "/timesheet",
    icon: "📖",
    title: "Field Ledger",
    desc: "Daily and weekly totals, drawn from actual tracked time.",
  },
  {
    href: "/reports",
    icon: "📜",
    title: "Almanac",
    desc: "Time by project, without judgment.",
  },
  {
    href: "/signin",
    icon: "🔑",
    title: "Hearth Key",
    desc: "Sign in to keep your workspace private to you.",
  },
];

const comingSoon = [
  { icon: "🗓️", title: "Desk Calendar", desc: "Timetable and upcoming tasks." },
  { icon: "📓", title: "Notebook", desc: "Nested projects, tasks and tags." },
  { icon: "📚", title: "Bookshelf", desc: "Learning topics and hobby journeys." },
  { icon: "🏅", title: "Honors Display", desc: "Quests and milestone progress." },
  { icon: "🏆", title: "Trophy Shelf", desc: "Approved recognition, kept private." },
  { icon: "✉️", title: "Companion Post", desc: "Invitations, feedback and the review inbox." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="card card-raised">
        <p className="label text-honey-deep">Welcome back to the hearth</p>
        <h1 className="h1 mt-1">Your desk chamber</h1>
        <p className="muted mt-2 max-w-2xl text-base">
          A cozy, game-like life-management app. Track time, organize tasks, plan
          schedules, and grow — at your own pace. The practical tools stay useful
          even if you ignore the game entirely.
        </p>
      </section>

      {/* The tabletop: warm wood framing the parchment objects. */}
      <section aria-labelledby="desk-heading" className="tabletop p-4 sm:p-6">
        <h2 id="desk-heading" className="label mb-4 text-lamplight">
          On the desk
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DeskCalendar />

          {deskObjects.map((obj) => (
            <Link
              key={obj.href}
              href={obj.href}
              className="card card-raised flex flex-col gap-2 no-underline transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
            >
              <span aria-hidden="true" className="text-3xl">
                {obj.icon}
              </span>
              <h3 className="h3">{obj.title}</h3>
              <p className="muted">{obj.desc}</p>
              <span className="label mt-auto pt-2 text-honey-deep">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="soon-heading">
        <h2 id="soon-heading" className="h2">
          Still being whittled
        </h2>
        <p className="muted mt-1">
          These desk objects are planned. They are listed so the room is honest
          about what it can do today.
        </p>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((obj) => (
            <li key={obj.title} className="well flex items-start gap-3 p-4">
              <span aria-hidden="true" className="text-2xl opacity-70">
                {obj.icon}
              </span>
              <div>
                <p className="font-display font-bold text-mahogany">{obj.title}</p>
                <p className="muted">{obj.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
