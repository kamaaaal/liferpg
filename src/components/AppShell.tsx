"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

/**
 * Hearth & Timber app shell — the HUD rail above the tabletop.
 * Every functional view stays reachable here without entering the desk scene.
 */

const navItems = [
  { href: "/", label: "Desk Chamber", icon: "🪵" },
  { href: "/timer", label: "Brass Pomodoro", icon: "⏳" },
  { href: "/timesheet", label: "Field Ledger", icon: "📖" },
  { href: "/reports", label: "Almanac", icon: "📜" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b-[3px] border-mahogany bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:gap-3">
          <Link
            href="/"
            className="plaque font-display text-base font-extrabold text-mahogany no-underline"
          >
            <span aria-hidden="true">🌱</span>
            Life RPG
          </Link>

          <nav aria-label="Primary" className="flex-1">
            <ul className="flex flex-wrap items-center gap-1.5">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "label inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 no-underline transition-colors",
                        active
                          ? "border-2 border-mahogany bg-honey text-parchment shadow-[0_3px_0_var(--honey-deep)]"
                          : "border-2 border-transparent text-muted hover:bg-surface-2 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <button type="button" onClick={() => signOut()} className="btn">
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/signin" className="btn btn-primary no-underline">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>

      <footer className="border-t-[3px] border-mahogany bg-surface-2 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs">
          <span className="label text-muted">Life RPG — cozy life management</span>
          <span className="label text-muted">
            Tracked time is not a measure of your worth
          </span>
        </div>
      </footer>
    </div>
  );
}
