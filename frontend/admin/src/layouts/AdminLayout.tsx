import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/admin",
    end: true,
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    to: "/admin/users",
    end: false,
    icon: Users,
    label: "Users",
  },
  {
    to: "/admin/quizzes",
    end: false,
    icon: BookOpen,
    label: "Quizzes",
  },
  {
    to: "/admin/slides",
    end: false,
    icon: FileText,
    label: "Slides",
  },
];

const bottomItems = [
  { icon: Settings, label: "Settings" },
  { icon: LogOut, label: "Sign out" },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-300 shadow-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">VLearn</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Main Menu
          </p>
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              id={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors",
                      isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                    size={18}
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-slate-800 px-3 py-3 space-y-0.5">
          {bottomItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
            >
              <Icon size={16} className="shrink-0 text-slate-500" />
              {label}
            </button>
          ))}
        </div>

        {/* Admin profile chip */}
        <div className="border-t border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Admin User</p>
              <p className="text-[10px] text-slate-500 truncate">admin@vlearn.io</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <GraduationCap className="h-4 w-4 text-indigo-500" />
            <span>VLearn</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-800">Admin</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="header-notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
                3
              </span>
            </button>

            {/* Admin avatar */}
            <button
              type="button"
              id="header-profile"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-white shadow-sm">
                AD
              </div>
              <span className="hidden sm:inline">Admin User</span>
              <ChevronRight className="h-3.5 w-3.5 rotate-90 text-slate-400" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
