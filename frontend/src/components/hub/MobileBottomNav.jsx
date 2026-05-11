/**
 * MobileBottomNav — fixed bottom bar shown only on mobile (< md breakpoint)
 * when the user is inside /dashboard or /editor routes. Gives one-tap access
 * to the four most-used cockpit destinations + a Cmd+K hint.
 *
 * Hidden on desktop so it doesn't compete with the sidebar.
 */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Briefcase, Users, IndianRupee, Search } from "lucide-react";

const ITEMS = [
  { to: "/dashboard/ops",                icon: Activity,     label: "Cockpit" },
  { to: "/dashboard/projects",           icon: Briefcase,    label: "Projects" },
  { to: "/dashboard/ops?tab=team",       icon: Users,        label: "Team" },
  { to: "/dashboard/ops?tab=finance",    icon: IndianRupee,  label: "Finance" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  // Only show on dashboard or editor routes
  if (!location.pathname.startsWith("/dashboard") && !location.pathname.startsWith("/editor")) return null;

  const openSearch = () => {
    // Synthesize Ctrl+K — the existing CommandPalette listens for it globally
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface-elev)] border-t border-neutral-200 dark:border-neutral-800 backdrop-blur-md">
      <div className="flex items-center justify-around h-14 px-2 safe-bottom">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const targetPath = it.to.split("?")[0];
          const isActive = location.pathname === targetPath || (targetPath === "/dashboard/ops" && location.pathname === "/dashboard");
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-[var(--orange)]" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{it.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={openSearch}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-neutral-500 hover:text-neutral-700"
          title="Search · Ctrl+K"
        >
          <Search size={18} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Search</span>
        </button>
      </div>
    </nav>
  );
}
