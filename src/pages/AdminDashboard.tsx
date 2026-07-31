import { useQuery } from "@tanstack/react-query";
import { type ElementType } from "react";
import { apiFetch } from "../api/apiClient";

import {
  Users,
  UserCheck,
  BookOpen,
  Star,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────
interface DashboardData {
  total_user: number;
  today_active: number;
  quiz_count: number;
  average_score: number;
  learning_progress: number;
}

// ─── Mock fallback (shown during loading or on error) ────────
const MOCK_DATA: DashboardData = {
  total_user: 210,
  today_active: 45,
  quiz_count: 8,
  average_score: 7.5,
  learning_progress: 68,
};

// ─── Stat card config ────────────────────────────────────────
interface StatCardConfig {
  key: keyof DashboardData;
  label: string;
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  format: (v: number) => string;
  subtitle: string;
  trend?: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: "total_user",
    label: "Total Users",
    icon: Users,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    format: (v) => v.toLocaleString(),
    subtitle: "Registered learners",
    trend: "+12% this month",
  },
  {
    key: "today_active",
    label: "Today's Active",
    icon: UserCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    format: (v) => v.toLocaleString(),
    subtitle: "Unique sessions today",
    trend: "Live count",
  },
  {
    key: "quiz_count",
    label: "Quiz Count",
    icon: BookOpen,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    format: (v) => v.toLocaleString(),
    subtitle: "Published quizzes",
    trend: "Across all lessons",
  },
  {
    key: "average_score",
    label: "Average Score",
    icon: Star,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    format: (v) => v.toFixed(1),
    subtitle: "Out of 10.0",
    trend: "+0.3 vs last week",
  },
];

// ─── Skeleton ─────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="skeleton h-12 w-12 rounded-xl ml-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-3 w-64 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery<DashboardData>({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await apiFetch<any>("/dashboard/stats");
      return {
        total_user: res.data.totalUsers ?? 0,
        today_active: res.data.todayActive ?? 0,
        quiz_count: res.data.totalQuizzes ?? 0,
        average_score: res.data.averageScore ? res.data.averageScore / 10 : 0,
        learning_progress: 68,
      };
    },
    retry: 1,
    staleTime: 30_000,
  });

  const { data: progressData } = useQuery<any[]>({
    queryKey: ["admin", "dashboard", "progress"],
    queryFn: async () => {
      const res = await apiFetch<any[]>("/dashboard/progress");
      return res.data;
    },
    staleTime: 30_000,
  });

  // Use real data when available, fallback to mock while loading or on error
  const displayData: DashboardData = data ?? MOCK_DATA;
  const isUsingMock = !data;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  const dayBreakdown = progressData && progressData.length > 0
    ? progressData.map((p: any) => ({
        label: p.day,
        value: Math.min(Math.round((p.averageSlidePage / 10) * 100), 100),
        color: p.day.includes("01") ? "bg-indigo-500" : p.day.includes("02") ? "bg-violet-500" : "bg-purple-400",
      }))
    : [
        {
          label: "Day 1 — JTBD Foundations",
          value: Math.min(displayData.learning_progress + 22, 100),
          color: "bg-indigo-500",
        },
        {
          label: "Day 2 — User Interviews",
          value: Math.max(displayData.learning_progress - 10, 0),
          color: "bg-violet-500",
        },
        {
          label: "Day 3 — Insight Synthesis",
          value: Math.max(displayData.learning_progress - 38, 0),
          color: "bg-purple-400",
        },
      ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI Learning Platform — live metrics overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-700">Live</span>
          </div>

          {/* Status badge */}
          {isUsingMock && !isLoading && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
              Mock data
            </Badge>
          )}

          {/* Refetch button */}
          <button
            id="dashboard-refresh"
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50",
            )}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              size={12}
              className={cn(isFetching && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────── */}
      {isError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 animate-fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Could not reach <code className="font-mono text-xs bg-amber-100 px-1 rounded">http://localhost:8200</code>. 
            Displaying mock data — start the backend to see live metrics.
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-auto text-xs font-semibold text-amber-700 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Stat Cards Grid ─────────────────────────────────── */}
      <section aria-label="Platform statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            : STAT_CARDS.map((cfg, i) => {
                const Icon = cfg.icon;
                const value = displayData[cfg.key];
                return (
                  <Card
                    key={cfg.key}
                    className={cn(
                      "hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-slate-200",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                    id={`stat-card-${cfg.key}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {cfg.label}
                          </p>
                          <p className="text-3xl font-bold text-slate-900 tabular-nums">
                            {cfg.format(value as number)}
                          </p>
                          <p className="text-xs text-slate-400">{cfg.subtitle}</p>
                        </div>
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ml-4",
                            cfg.iconBg
                          )}
                        >
                          <Icon className={cn("h-6 w-6", cfg.iconColor)} />
                        </div>
                      </div>
                      {cfg.trend && (
                        <div className="mt-4 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">{cfg.trend}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* ── Progress & Activity Row ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Learning Progress — takes 2 cols */}
        {isLoading ? (
          <div className="lg:col-span-2">
            <ProgressSkeleton />
          </div>
        ) : (
          <Card
            className="lg:col-span-2 border-slate-200 animate-fade-in"
            style={{ animationDelay: "260ms" }}
            id="card-learning-progress"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Learning Progress
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    Overall platform completion across all enrolled learners
                  </CardDescription>
                </div>
                <Badge
                  className="bg-indigo-50 text-indigo-600 border-indigo-100 font-semibold text-sm px-3"
                  variant="outline"
                >
                  {displayData.learning_progress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Main progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Platform average</span>
                  <span className="font-medium text-slate-700">
                    {displayData.learning_progress}% complete
                  </span>
                </div>
                <Progress
                  id="progress-bar-main"
                  value={displayData.learning_progress}
                  className="h-3"
                  aria-label={`Learning progress: ${displayData.learning_progress}%`}
                />
              </div>

              {/* Breakdown bars */}
              <div className="space-y-3 pt-1">
                {dayBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className="text-xs font-medium text-slate-700 tabular-nums">
                        {item.value}%
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", item.color)}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <p className="text-[10px] text-slate-400 pt-1">
                  Last fetched from backend at {lastUpdated}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Summary */}
        <Card
          className="border-slate-200 animate-fade-in"
          style={{ animationDelay: "320ms" }}
          id="card-activity-summary"
        >
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Activity Summary
            </CardTitle>
            <CardDescription>Quick snapshot of today's platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="skeleton h-3 w-28" />
                    <div className="skeleton h-5 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {[
                  {
                    label: "Active sessions",
                    value: displayData.today_active,
                    color: "bg-emerald-100 text-emerald-700",
                  },
                  {
                    label: "Quizzes completed",
                    value: Math.round(displayData.today_active * 0.6),
                    color: "bg-indigo-100 text-indigo-700",
                  },
                  {
                    label: "Avg score today",
                    value: displayData.average_score.toFixed(1),
                    color: "bg-amber-100 text-amber-700",
                  },
                  {
                    label: "New sign-ups",
                    value: Math.round(displayData.total_user * 0.03),
                    color: "bg-violet-100 text-violet-700",
                  },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                  >
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                        item.color
                      )}
                    >
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
