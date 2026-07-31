import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "../api/apiClient";
import {
  BookOpen,
  Plus,
  Trash2,
  Clock,
  Users,
  CheckCircle2,
  Circle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Eye,
  Copy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────
type QuizStatus = "draft" | "live" | "closed";

interface QuizQuestion {
  text: string;
  options: string[];
  correct: number;
}

interface Quiz {
  id: string;
  title: string;
  lesson: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  participants: number;
  avgScore: number;
  createdAt: string;
  duration: number; // minutes
}

interface BackendQuiz {
  id: string;
  title: string;
  day: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  _count?: { questions: number; results: number };
}

// ─── Mock data removed (using database) ─────────────────────────

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<QuizStatus, { label: string; className: string; dot: string }> = {
  live:   { label: "Available", className: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  closed: { label: "Closed", className: "bg-slate-100  text-slate-600  border-slate-200",  dot: "bg-slate-400" },
  draft:  { label: "Draft",  className: "bg-amber-100  text-amber-700  border-amber-200",  dot: "bg-amber-400" },
};

// ─── New Quiz Modal ───────────────────────────────────────────
function NewQuizModal({
  onClose,
  onAdd,
  isSaving,
  serverError,
}: {
  onClose: () => void;
  onAdd: (q: { title: string; lesson: string; duration: number; questions: QuizQuestion[] }) => void;
  isSaving: boolean;
  serverError: string;
}) {
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState("day01");
  const [duration, setDuration] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { text: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [error, setError] = useState("");

  const addQuestion = () => {
    setQuestions((q) => [...q, { text: "", options: ["", "", "", ""], correct: 0 }]);
  };

  const removeQuestion = (i: number) => {
    if (questions.length === 1) return;
    setQuestions((q) => q.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i: number, field: keyof QuizQuestion, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, oidx) => (oidx === oi ? value : o)) }
          : q
      )
    );
  };

  const submit = () => {
    if (!title.trim()) { setError("Quiz title is required."); return; }
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      setError("All question texts and options must be filled in."); return;
    }
    const day = lesson.split(" — ")[0];
    onAdd({
      title: title.trim(),
      lesson: day,
      duration,
      questions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create New Quiz</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add questions and configure your live quiz session</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {(error || serverError) && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs text-rose-700">
              <AlertTriangle size={14} className="shrink-0" />
              {error || serverError}
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quiz Title</label>
              <input
                id="modal-quiz-title"
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(""); }}
                placeholder="e.g. JTBD Checkpoint"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lesson</label>
              <select
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
              >
                <option value="day01">Ngày 01 — AI & LLM Foundation</option>
                <option value="day02">Ngày 02 — Xác định bài toán cho AI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time Limit (minutes)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions ({questions.length})</p>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white mt-0.5">
                    {qi + 1}
                  </span>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => { updateQuestion(qi, "text", e.target.value); setError(""); }}
                    placeholder="Enter question…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
                  />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} className="shrink-0 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, "correct", oi)}
                        className={cn(
                          "shrink-0 transition",
                          q.correct === oi ? "text-emerald-500" : "text-slate-300 hover:text-slate-400"
                        )}
                        title="Mark as correct"
                      >
                        {q.correct === oi ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => { updateOption(qi, oi, e.target.value); setError(""); }}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-3 text-xs font-semibold text-indigo-500 hover:bg-indigo-50 transition"
            >
              <Plus size={14} />
              Add question
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            id="modal-submit-quiz"
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition disabled:cursor-wait disabled:opacity-60"
          >
            <BookOpen size={14} />
            {isSaving ? "Saving to database…" : "Upload Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Card ───────────────────────────────────────────────
// ─── Quiz Card ───────────────────────────────────────────────
function QuizCard({
  quiz: initialQuiz,
  onDelete,
  onDuplicate,
}: {
  quiz: Quiz & { questionsCount?: number };
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadedQuestions, setLoadedQuestions] = useState<any[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const cfg = STATUS_CONFIG[initialQuiz.status];

  const loadQuestions = async () => {
    if (loadedQuestions) return;
    setLoadingQuestions(true);
    try {
      const res = await apiFetch<any>(`/quiz/${initialQuiz.id}`);
      const mappedQuestions = (res.data.questions || []).map((q: any) => ({
        text: q.question,
        options: [q.optionA, q.optionB, q.optionC, q.optionD],
        correct: q.correctAnswer === "A" ? 0 : q.correctAnswer === "B" ? 1 : q.correctAnswer === "C" ? 2 : q.correctAnswer === "D" ? 3 : 0,
      }));
      setLoadedQuestions(mappedQuestions);
    } catch {
      setLoadedQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const toggleExpand = () => {
    if (!expanded) {
      loadQuestions();
    }
    setExpanded(!expanded);
  };

  return (
    <Card
      id={`quiz-card-${initialQuiz.id}`}
      className={cn(
        "border-slate-200 transition-all duration-200 hover:shadow-md",
        initialQuiz.status === "live" && "ring-1 ring-emerald-300 shadow-emerald-100"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Status badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 mt-0.5",
              cfg.className
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-bold text-slate-900 truncate">{initialQuiz.title}</CardTitle>
            <CardDescription className="mt-0.5 truncate">{initialQuiz.lesson}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BookOpen,   label: "Questions",    value: initialQuiz.questions?.length || initialQuiz.questionsCount || 0 },
            { icon: Users,      label: "Participants", value: initialQuiz.participants },
            { icon: Clock,      label: "Duration",     value: `${initialQuiz.duration}m` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
              <Icon size={14} className="mx-auto text-slate-400 mb-1" />
              <p className="text-base font-bold text-slate-800 tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Avg score */}
        {initialQuiz.participants > 0 && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
              <BarChart3 size={13} />
              Average Score
            </span>
            <span className="text-sm font-bold text-indigo-700 tabular-nums">
              {initialQuiz.avgScore.toFixed(1)} <span className="text-indigo-400 font-normal text-xs">/10</span>
            </span>
          </div>
        )}

        {/* Questions preview */}
        <button
          type="button"
          onClick={toggleExpand}
          className="flex w-full items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-700 transition"
        >
          <span className="flex items-center gap-1.5">
            <Eye size={12} />
            Preview questions
          </span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expanded && (
          <div className="space-y-2.5 animate-fade-in">
            {loadingQuestions && <div className="text-center text-xs text-slate-400 py-2">Loading questions...</div>}
            {!loadingQuestions && (loadedQuestions || []).map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Q{i + 1}. {q.text}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {q.options.map((opt: string, oi: number) => (
                    <div
                      key={oi}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1 text-xs",
                        oi === q.correct
                          ? "bg-emerald-100 text-emerald-700 font-semibold"
                          : "text-slate-500"
                      )}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <span className="flex-1 text-xs font-medium text-emerald-600">Available to learners</span>
          <button
            type="button"
            onClick={() => onDuplicate(initialQuiz.id)}
            title="Duplicate quiz"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(initialQuiz.id)}
            title="Delete quiz"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function QuizManagement() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuizStatus | "all">("all");
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");

  const {
    data: quizzesResponse = [],
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "quizzes"],
    queryFn: async () => {
      const res = await apiFetch<BackendQuiz[]>("/quiz?limit=100");
      return res.data;
    },
    staleTime: 5000,
  });

  const quizzesList: (Quiz & { questionsCount?: number })[] = useMemo(() => {
    if (!Array.isArray(quizzesResponse)) return [];
    return quizzesResponse.map((q) => ({
      id: q.id,
      title: q.title,
      lesson: q.day,
      status: q.endTime && new Date(q.endTime) < new Date()
        ? ("closed" as QuizStatus)
        : ("live" as QuizStatus),
      questions: [],
      questionsCount: q._count?.questions || 0,
      participants: q._count?.results || 0,
      avgScore: 0,
      createdAt: q.createdAt ? new Date(q.createdAt).toISOString().split("T")[0] : "",
      duration: 10,
    }));
  }, [quizzesResponse]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/quiz/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setOperationError("");
      setNotice("Quiz deleted from the database.");
      refetch();
    },
    onError: (error: Error) => setOperationError(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const details = await apiFetch<any>(`/quiz/${id}`);
      const original = details.data;
      const createRes = await apiFetch<any>("/quiz", {
        method: "POST",
        body: JSON.stringify({
          title: `${original.title} (Copy)`,
          day: original.day,
          difficulty: original.difficulty || "MEDIUM",
          questions: (original.questions || []).map((q: any) => ({
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty || "MEDIUM",
            knowledgeNode: q.knowledgeNode || null,
          })),
        }),
      });
      return createRes.data;
    },
    onSuccess: () => {
      setOperationError("");
      setNotice("Quiz and questions duplicated successfully.");
      refetch();
    },
    onError: (error: Error) => setOperationError(error.message),
  });

  const addMutation = useMutation({
    mutationFn: async (newQuiz: { title: string; lesson: string; duration: number; questions: QuizQuestion[] }) => {
      const createRes = await apiFetch<any>("/quiz", {
        method: "POST",
        body: JSON.stringify({
          title: newQuiz.title,
          day: newQuiz.lesson,
          difficulty: "MEDIUM",
          questions: newQuiz.questions.map((q) => ({
            question: q.text,
            optionA: q.options[0],
            optionB: q.options[1],
            optionC: q.options[2],
            optionD: q.options[3],
            correctAnswer: ["A", "B", "C", "D"][q.correct],
            difficulty: "MEDIUM",
          })),
        }),
      });
      return createRes.data;
    },
    onSuccess: () => {
      setOperationError("");
      setNotice("Quiz and all questions were saved to the database.");
      refetch();
      setShowModal(false);
    },
    onError: (error: Error) => setOperationError(error.message),
  });

  const deleteQuiz = (id: string) => {
    deleteMutation.mutate(id);
  };

  const duplicateQuiz = (id: string) => {
    duplicateMutation.mutate(id);
  };

  const filtered = useMemo(
    () => statusFilter === "all" ? quizzesList : quizzesList.filter((q) => q.status === statusFilter),
    [quizzesList, statusFilter]
  );

  const stats = useMemo(() => ({
    total: quizzesList.length,
    live: quizzesList.filter((q) => q.status === "live").length,
    closed: quizzesList.filter((q) => q.status === "closed").length,
    totalParticipants: quizzesList.reduce((s, q) => s + q.participants, 0),
  }), [quizzesList]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {showModal && (
        <NewQuizModal
          onClose={() => {
            setShowModal(false);
            setOperationError("");
          }}
          onAdd={(q) => addMutation.mutate(q)}
          isSaving={addMutation.isPending}
          serverError={operationError}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quiz Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload quiz content for learners to open when ready</p>
        </div>
        <button
          id="btn-create-quiz"
          type="button"
          onClick={() => {
            setOperationError("");
            setNotice("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
        >
          <Plus size={16} />
          New Quiz
        </button>
      </div>

      {(queryError || operationError) && !showModal && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <strong className="block">Database connection failed</strong>
              <span className="text-xs">{operationError || (queryError as Error).message}</span>
            </span>
          </span>
          <button type="button" onClick={() => refetch()} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-100">
            Retry
          </button>
        </div>
      )}

      {notice && !operationError && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Quizzes",      value: stats.total,            color: "text-slate-800" },
          { label: "Available to Learners", value: stats.live,          color: "text-emerald-600" },
          { label: "Completed",          value: stats.closed,           color: "text-indigo-600" },
          { label: "Total Participants", value: stats.totalParticipants, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Row ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(["all", "live", "closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            id={`filter-quiz-${s}`}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              statusFilter === s
                ? "bg-indigo-500 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {s === "all" ? "All" : s === "live" ? "Available" : "Closed"}
            {s !== "all" && (
              <span className="ml-1.5 tabular-nums opacity-70">
                ({quizzesList.filter((q) => q.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Quiz Grid ────────────────────────────────────────── */}
      {isLoading || isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Loading quizzes">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="mt-8 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((metric) => <div key={metric} className="h-16 rounded-lg bg-slate-100" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 mb-4">
            <BookOpen className="h-10 w-10 text-amber-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">No quizzes found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            {statusFilter === "all"
              ? "Create your first quiz to get started."
              : `No ${statusFilter} quizzes at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onDelete={deleteQuiz}
              onDuplicate={duplicateQuiz}
            />
          ))}
        </div>
      )}
    </div>
  );
}
