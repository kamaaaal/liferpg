"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { DecorBadge } from "@/components/DecorBadge";

const navItems = [
  { href: "/", label: "Home", icon: "🪵" },
  { href: "/tasks", label: "Tasks", icon: "📋" },
  { href: "/projects", label: "Projects", icon: "🌿" },
  { href: "/schedule", label: "Schedule", icon: "🗓️" },
  { href: "/timer", label: "Timer", icon: "⏳" },
  { href: "/timesheet", label: "Timesheet", icon: "📖" },
  { href: "/activity", label: "Activity Log", icon: "📓" },
  { href: "/reports", label: "Reports", icon: "📜" },
];

function cycleWord(date: Date): string {
  const h = date.getHours();
  return h >= 17 && h < 21 ? "Dusk" : h >= 5 && h < 17 ? "Day" : "Night";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [cycle, setCycle] = useState<{ word: string; time: string }>({
    word: "Dusk",
    time: "",
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCycle({
        word: cycleWord(now),
        time: now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      });
    };
    update();
    const id = window.setInterval(update, 30000);
    return () => window.clearInterval(id);
  }, []);

  const name = session?.user?.name ?? session?.user?.email ?? "Sprout";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b-[3.5px] border-mahogany bg-[#ecd9c0] shadow-[0_4px_12px_rgba(43,24,13,0.15)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4">
          {/* Player badge — peach pill (name real; LV7 + XP bar decorative) */}
          <div className="relative flex items-center gap-2 rounded-2xl border-[2.5px] border-mahogany bg-[#fff5ee] px-2.5 py-1 shadow-[0_3px_0_var(--mahogany)]">
            <DecorBadge label="Decor" />
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-mahogany bg-gradient-to-tr from-honey to-[#b65c01] text-base text-white shadow-inner">
              🌱
              <span className="absolute -right-1.5 -top-1.5 rounded-full border border-mahogany bg-[#ff4d6d] px-1 text-[9px] font-black text-white">
                LV7
              </span>
            </span>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-display text-sm font-extrabold text-mahogany">
                  {name}
                </span>
                <span className="rounded-md border border-honey/30 bg-[#ffd7ba] px-1.5 py-0.5 text-[10px] font-bold uppercase text-honey-deep">
                  Wanderer
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full border border-mahogany/40 bg-[#ecd3c5]">
                <div className="h-full rounded-full bg-honey" style={{ width: "65%" }} />
              </div>
            </div>
          </div>

          {/* Acorn Bank — gold pill (purely decorative) */}
          <div
            className="relative hidden items-center gap-2 rounded-2xl border-[2.5px] border-mahogany bg-[#fdf0d5] px-2.5 py-1 shadow-[0_3px_0_var(--mahogany)] sm:flex"
            aria-hidden="true"
          >
            <DecorBadge />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-mahogany bg-[#f4a261] text-[#431407] shadow-inner">
              🌰
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#784e2a]">
                Acorn Bank
              </span>
              <span className="font-display text-base font-extrabold text-mahogany">420</span>
            </div>
          </div>

          {/* Vitality — pink pill (purely decorative) */}
          <div
            className="relative hidden items-center gap-2 rounded-2xl border-[2.5px] border-mahogany bg-[#ffe5ec] px-2.5 py-1 shadow-[0_3px_0_var(--mahogany)] md:flex"
            aria-hidden="true"
          >
            <DecorBadge />
            <span className="flex items-center gap-0.5 text-[16px] leading-none">
              ❤️❤️❤️❤️❤️
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-black uppercase text-[#9b2226]">Vitality</span>
              <span className="text-xs font-black text-[#9b2226]">Full Hearts</span>
            </div>
          </div>

          {/* Nav tabs — beige container */}
          <nav aria-label="Primary" className="order-3 flex-1 sm:order-none sm:w-auto sm:flex-1">
            <ul className="flex items-center gap-1 overflow-x-auto rounded-2xl border-[2.5px] border-mahogany bg-[#f5e6d3] p-1 shadow-[0_3px_0_var(--mahogany)]">
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
                        "label inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 py-0.5 no-underline transition-colors",
                        active
                          ? "border-2 border-mahogany bg-[#b65c01] text-white shadow-[0_2px_0_var(--mahogany)]"
                          : "border-2 border-transparent text-[#554337] hover:bg-[#ebd3bd]",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right cluster — cycle + auth */}
          <div className="flex items-center gap-2">
            <div
              className="hidden items-center gap-2 rounded-2xl border-[2.5px] border-mahogany bg-[#e9d8a6] px-3 py-1 shadow-[0_3px_0_var(--mahogany)] lg:flex"
              aria-hidden="true"
            >
              <span className="text-[20px] leading-none">🌆</span>
              <div className="flex flex-col text-right leading-tight">
                <span className="text-[9px] font-black uppercase text-[#634816]">
                  Cycle: {cycle.word}
                </span>
                <span className="text-xs font-black text-mahogany">{cycle.time}</span>
              </div>
            </div>
            {session?.user ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border-[2.5px] border-mahogany bg-[#fff5ee] text-[18px] text-mahogany shadow-[0_3px_0_var(--mahogany)] transition-transform active:translate-y-1"
                  title="Profile"
                >
                  👤
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border-[2.5px] border-mahogany bg-[#ffb703] text-[20px] text-[#432808] shadow-[0_3px_0_var(--mahogany)] transition-transform active:translate-y-1"
                  title="Sign out"
                >
                  🎒
                </button>
              </div>
            ) : (
              <Link
                href="/signin"
                title="Sign in"
                className="flex h-9 w-9 items-center justify-center rounded-2xl border-[2.5px] border-mahogany bg-[#ffb703] text-[20px] text-[#432808] shadow-[0_3px_0_var(--mahogany)] transition-transform active:translate-y-1"
              >
                🔑
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>

      <footer className="border-t-[3px] border-mahogany bg-surface-2 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs">
          <span className="label text-muted">Life RPG • Cozy Life Sim Framework</span>
          <span className="label text-muted">
            Atmosphere: Hearthside Embers & Late Twilight
          </span>
          <span className="badge-seal badge-honey text-[9px]">BUILD 0.1.0 COZY ENGINE</span>
        </div>
      </footer>
    </div>
  );
}