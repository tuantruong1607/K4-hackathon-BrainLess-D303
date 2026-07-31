import { useState, useMemo, ElementType } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "../api/apiClient";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  Shield,
  ShieldCheck,
  Trash2,
  Pencil,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────
type UserRole = "admin" | "learner" | "instructor";
type UserStatus = "active" | "inactive" | "suspended";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  progress: number;
  quizzesDone: number;
  avgScore: number;
}

type SortField = keyof Pick<User, "name" | "email" | "joinedAt" | "progress" | "avgScore">;
type SortDir = "asc" | "desc";

// ─── Mock data removed (using database) ─────────────────────────

// ─── Helpers ─────────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, { label: string; className: string; icon: ElementType; }> = {
  admin:      { label: "Admin",      className: "bg-violet-100 text-violet-700 border-violet-200", icon: ShieldCheck },
  instructor: { label: "Instructor", className: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Shield },
  learner:    { label: "Learner",    className: "bg-slate-100  text-slate-600  border-slate-200",  icon: Users },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; dot: string; text: string }> = {
  active:    { label: "Active",    dot: "bg-emerald-400", text: "text-emerald-700" },
  inactive:  { label: "Inactive",  dot: "bg-slate-300",   text: "text-slate-500" },
  suspended: { label: "Suspended", dot: "bg-rose-400",    text: "text-rose-600" },
};

function avatarInitials(name: string) {
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-purple-500",
];

// ─── Sub-components ──────────────────────────────────────────
function SortButton({
  field,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {active ? (
        dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="text-slate-300" />
      )}
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-indigo-500" : value >= 20 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────
function AddUserModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: { name: string; email: string; role: UserRole }) => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "learner" as UserRole });
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    onAdd({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create a new learner or instructor account</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              id="modal-name"
              type="text"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setError(""); }}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="modal-email"
                type="email"
                value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setError(""); }}
                placeholder="user@vlearn.io"
                className="w-full rounded-lg border border-slate-200 pl-8 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
            <select
              id="modal-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white"
            >
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            id="modal-submit-user"
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
          >
            <Check size={14} />
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Map filters for database query
  const dbRole = roleFilter === "admin" ? "ADMIN" : roleFilter === "learner" ? "STUDENT" : undefined;

  // React Query fetching
  const { data: usersResponse = [], refetch } = useQuery({
    queryKey: ["admin", "users", { search, role: dbRole }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (search) params.append("search", search);
      if (dbRole) params.append("role", dbRole);
      
      const res = await apiFetch<any[]>(`/users?${params.toString()}`);
      return res.data;
    },
    staleTime: 5000,
  });

  const usersList: User[] = useMemo(() => {
    if (!Array.isArray(usersResponse)) return [];
    return usersResponse.map((u: any) => ({
      id: u.id,
      name: u.fullname || "Unknown",
      email: u.email,
      role: u.role === "ADMIN" ? ("admin" as UserRole) : ("learner" as UserRole),
      status: u.isBanned ? ("suspended" as UserStatus) : ("active" as UserStatus),
      joinedAt: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "",
      progress: 45,
      quizzesDone: 3,
      avgScore: 7.2,
    }));
  }, [usersResponse]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = usersList;
    if (statusFilter !== "all") {
      list = list.filter((u) => u.status === statusFilter);
    }

    list = [...list].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [usersList, statusFilter, sortField, sortDir]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.id)));
    }
  };

  // Mutations
  const banMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/users/${id}/ban`, { method: "POST" });
    },
    onSuccess: () => refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      refetch();
      setSelectedIds(new Set());
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: string }) => {
      const regRes = await apiFetch<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          fullname: name,
          password: "defaultPassword123",
        }),
      });
      const userId = regRes.data.user.id;
      const dbRole = role === "admin" ? "ADMIN" : "STUDENT";
      if (dbRole === "ADMIN") {
        await apiFetch(`/users/${userId}`, {
          method: "PUT",
          body: JSON.stringify({ role: "ADMIN" }),
        });
      }
    },
    onSuccess: () => {
      refetch();
      setShowModal(false);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to create user.");
    },
  });

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => apiFetch(`/users/${id}`, { method: "DELETE" })));
    refetch();
    setSelectedIds(new Set());
  };

  const toggleStatus = (id: string) => {
    banMutation.mutate(id);
    setActionMenuId(null);
  };

  const deleteUser = (id: string) => {
    deleteMutation.mutate(id);
    setActionMenuId(null);
  };

  const stats = useMemo(() => ({
    total: usersList.length,
    active: usersList.filter((u) => u.status === "active").length,
    instructors: usersList.filter((u) => u.role === "instructor").length,
    avgProgress: usersList.length > 0 ? Math.round(usersList.reduce((s, u) => s + u.progress, 0) / usersList.length) : 0,
  }), [usersList]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onAdd={(u) => addMutation.mutate({ name: u.name, email: u.email, role: u.role })}
        />
      )}

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage learner accounts and permissions</p>
        </div>
        <button
          id="btn-add-user"
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users",     value: stats.total,           color: "text-slate-800" },
          { label: "Active",          value: stats.active,          color: "text-emerald-600" },
          { label: "Instructors",     value: stats.instructors,     color: "text-indigo-600" },
          { label: "Avg Progress",    value: `${stats.avgProgress}%`, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main Table Card ───────────────────────────────────── */}
      <Card className="border-slate-200" id="card-user-table">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-indigo-500" />
                All Users
                <Badge
                  variant="outline"
                  className="ml-1 text-xs text-slate-500 border-slate-200 bg-slate-50"
                >
                  {filtered.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-0.5">
                Search, filter, and manage all registered accounts
              </CardDescription>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="user-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 pt-4 pb-1 flex-wrap">
            <Filter size={13} className="text-slate-400 shrink-0" />
            {/* Role filter */}
            <div className="flex items-center gap-1.5">
              {(["all", "learner", "instructor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    roleFilter === r
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-slate-200 text-sm">|</span>
            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              {(["all", "active", "inactive", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    statusFilter === s
                      ? "bg-slate-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {s === "all" ? "All status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Bulk delete */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={deleteSelected}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                <Trash2 size={12} />
                Delete {selectedIds.size} selected
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-0 pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1">
                      User
                      <SortButton field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                    <span className="flex items-center gap-1">
                      Progress
                      <SortButton field="progress" current={sortField} dir={sortDir} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden xl:table-cell">
                    <span className="flex items-center gap-1">
                      Avg Score
                      <SortButton field="avgScore" current={sortField} dir={sortDir} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                    <span className="flex items-center gap-1">
                      Joined
                      <SortButton field="joinedAt" current={sortField} dir={sortDir} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={32} className="opacity-30" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, i) => {
                    const role = ROLE_CONFIG[user.role];
                    const status = STATUS_CONFIG[user.status];
                    const RoleIcon = role.icon;
                    const isSelected = selectedIds.has(user.id);
                    const colorIdx = i % AVATAR_COLORS.length;

                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          "group hover:bg-slate-50/80 transition-colors",
                          isSelected && "bg-indigo-50/50"
                        )}
                      >
                        <td className="px-6 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(user.id)}
                            className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm",
                                AVATAR_COLORS[colorIdx]
                              )}
                            >
                              {avatarInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                              <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              role.className
                            )}
                          >
                            <RoleIcon size={11} />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("flex items-center gap-1.5 text-xs font-medium", status.text)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <ProgressBar value={user.progress} />
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <span className="tabular-nums font-semibold text-slate-700">
                            {user.avgScore > 0 ? user.avgScore.toFixed(1) : "—"}
                          </span>
                          <span className="text-xs text-slate-400"> /10</span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500">
                          {user.joinedAt}
                        </td>
                        <td className="px-4 py-3.5 relative">
                          <button
                            type="button"
                            onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition opacity-0 group-hover:opacity-100"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {actionMenuId === user.id && (
                            <div className="absolute right-4 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => toggleStatus(user.id)}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                              >
                                <Pencil size={13} />
                                {user.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteUser(user.id)}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 size={13} />
                                Delete user
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{usersList.length}</span> users
            </p>
            {selectedIds.size > 0 && (
              <p className="text-xs text-indigo-600 font-medium">
                {selectedIds.size} selected
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
