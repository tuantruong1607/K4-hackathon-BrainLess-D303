import { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Play,
  Square,
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
  Zap,
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
import { Badge } from "@/components/ui/badge";
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

// ─── Mock data ───────────────────────────────────────────────
const INITIAL_QUIZZES: Quiz[] = [
  {
    id: "q1",
    title: "JTBD Foundations Check",
    lesson: "Ngày 01 — Nền tảng JTBD",
    status: "live",
    participants: 38,
    avgScore: 7.8,
    createdAt: "2026-07-28",
    duration: 10,
    questions: [
      {
        text: "Trong JTBD, người dùng thực sự 'thuê' sản phẩm để làm gì?",
        options: ["Sở hữu thêm nhiều tính năng", "Tạo ra một tiến bộ trong hoàn cảnh cụ thể", "So sánh thương hiệu", "Giảm chi phí"],
        correct: 1,
      },
      {
        text: "Thành phần nào nên xuất hiện trong một job statement?",
        options: ["Persona, tính năng và giá bán", "Kênh truyền thông", "Hoàn cảnh, động lực và kết quả", "Đối thủ và thị phần"],
        correct: 2,
      },
      {
        text: "Điều gì thường cản người dùng chuyển sang giải pháp mới?",
        options: ["Thói quen cũ và nỗi lo", "Chỉ riêng mức giá", "Thiếu quảng cáo", "Không đủ tính năng"],
        correct: 0,
      },
    ],
  },
  {
    id: "q2",
    title: "User Interview Basics",
    lesson: "Ngày 02 — Phỏng vấn người dùng",
    status: "closed",
    participants: 31,
    avgScore: 8.3,
    createdAt: "2026-07-29",
    duration: 8,
    questions: [
      {
        text: "Kỹ thuật nào tốt nhất để khám phá động lực thật sự của người dùng?",
        options: ["Hỏi về tính năng họ muốn", "Hỏi tại sao nhiều lần (5 Whys)", "Hỏi về giá họ sẵn trả", "Hỏi về đối thủ cạnh tranh"],
        correct: 1,
      },
      {
        text: "Nên tránh điều gì trong phỏng vấn người dùng?",
        options: ["Hỏi câu mở", "Đặt câu hỏi dẫn dắt", "Lắng nghe chủ động", "Ghi chú chi tiết"],
        correct: 1,
      },
    ],
  },
  {
    id: "q3",
    title: "Insight Synthesis Quiz",
    lesson: "Ngày 03 — Tổng hợp Insight",
    status: "draft",
    participants: 0,
    avgScore: 0,
    createdAt: "2026-07-30",
    duration: 12,
    questions: [
      {
        text: "Insight khác với data như thế nào?",
        options: ["Insight là số liệu thô", "Insight là diễn giải có ý nghĩa từ data", "Insight chỉ đến từ phỏng vấn", "Insight không cần bằng chứng"],
        correct: 1,
      },
    ],
  },
];

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<QuizStatus, { label: string; className: string; dot: string }> = {
  live:   { label: "Live",   className: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400 animate-ping" },
  closed: { label: "Closed", className: "bg-slate-100  text-slate-600  border-slate-200",  dot: "bg-slate-400" },
  draft:  { label: "Draft",  className: "bg-amber-100  text-amber-700  border-amber-200",  dot: "bg-amber-400" },
};

// ─── New Quiz Modal ───────────────────────────────────────────
function NewQuizModal({ onClose, onAdd }: { onClose: () => void; onAdd: (q: Quiz) => void }) {
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState("Ngày 01 — Nền tảng JTBD");
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
    const newQuiz: Quiz = {
      id: `q${Date.now()}`,
      title: title.trim(),
      lesson,
      status: "draft",
      participants: 0,
      avgScore: 0,
      createdAt: new Date().toISOString().split("T")[0],
      duration,
      questions,
    };
    onAdd(newQuiz);
    onClose();
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
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs text-rose-700">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
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
                <option>Ngày 01 — Nền tảng JTBD</option>
                <option>Ngày 02 — Phỏng vấn người dùng</option>
                <option>Ngày 03 — Tổng hợp Insight</option>
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
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
          >
            <BookOpen size={14} />
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Card ───────────────────────────────────────────────
function QuizCard({
  quiz,
  onToggleLive,
  onDelete,
  onDuplicate,
}: {
  quiz: Quiz;
  onToggleLive: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[quiz.status];

  return (
    <Card
      id={`quiz-card-${quiz.id}`}
      className={cn(
        "border-slate-200 transition-all duration-200 hover:shadow-md",
        quiz.status === "live" && "ring-1 ring-emerald-300 shadow-emerald-100"
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
            <CardTitle className="text-sm font-bold text-slate-900 truncate">{quiz.title}</CardTitle>
            <CardDescription className="mt-0.5 truncate">{quiz.lesson}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BookOpen,   label: "Questions",    value: quiz.questions.length },
            { icon: Users,      label: "Participants", value: quiz.participants },
            { icon: Clock,      label: "Duration",     value: `${quiz.duration}m` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
              <Icon size={14} className="mx-auto text-slate-400 mb-1" />
              <p className="text-base font-bold text-slate-800 tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Avg score */}
        {quiz.status !== "draft" && quiz.participants > 0 && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
              <BarChart3 size={13} />
              Average Score
            </span>
            <span className="text-sm font-bold text-indigo-700 tabular-nums">
              {quiz.avgScore.toFixed(1)} <span className="text-indigo-400 font-normal text-xs">/10</span>
            </span>
          </div>
        )}

        {/* Questions preview */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
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
            {quiz.questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Q{i + 1}. {q.text}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {q.options.map((opt, oi) => (
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
          {quiz.status !== "closed" && (
            <button
              type="button"
              id={`btn-toggle-${quiz.id}`}
              onClick={() => onToggleLive(quiz.id)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                quiz.status === "live"
                  ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
              )}
            >
              {quiz.status === "live" ? (
                <><Square size={12} /> Stop Live</>
              ) : (
                <><Zap size={12} /> Go Live</>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDuplicate(quiz.id)}
            title="Duplicate quiz"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(quiz.id)}
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
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuizStatus | "all">("all");

  const toggleLive = (id: string) => {
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (q.status === "live") return { ...q, status: "closed" };
        // When going live, close any other live quiz
        return { ...q, status: "live" };
      })
        .map((q) => {
          // Only one live at a time
          if (q.id !== id && q.status === "live") return { ...q, status: "closed" };
          return q;
        })
    );
  };

  const deleteQuiz = (id: string) => setQuizzes((prev) => prev.filter((q) => q.id !== id));

  const duplicateQuiz = (id: string) => {
    const original = quizzes.find((q) => q.id === id);
    if (!original) return;
    setQuizzes((prev) => [
      ...prev,
      {
        ...original,
        id: `q${Date.now()}`,
        title: `${original.title} (Copy)`,
        status: "draft",
        participants: 0,
        avgScore: 0,
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const filtered = useMemo(
    () => statusFilter === "all" ? quizzes : quizzes.filter((q) => q.status === statusFilter),
    [quizzes, statusFilter]
  );

  const liveQuiz = quizzes.find((q) => q.status === "live");

  const stats = useMemo(() => ({
    total: quizzes.length,
    live: quizzes.filter((q) => q.status === "live").length,
    closed: quizzes.filter((q) => q.status === "closed").length,
    totalParticipants: quizzes.reduce((s, q) => s + q.participants, 0),
  }), [quizzes]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {showModal && (
        <NewQuizModal
          onClose={() => setShowModal(false)}
          onAdd={(q) => setQuizzes((prev) => [...prev, q])}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quiz Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage live quiz sessions for learners</p>
        </div>
        <button
          id="btn-create-quiz"
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
        >
          <Plus size={16} />
          New Quiz
        </button>
      </div>

      {/* ── Live banner ───────────────────────────────────────── */}
      {liveQuiz && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 animate-fade-in">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">
              Live now: <span className="font-bold">{liveQuiz.title}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{liveQuiz.participants} participants joined · {liveQuiz.lesson}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleLive(liveQuiz.id)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
          >
            <Square size={11} /> Stop
          </button>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Quizzes",      value: stats.total,            color: "text-slate-800" },
          { label: "Currently Live",     value: stats.live,             color: "text-emerald-600" },
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
        {(["all", "live", "draft", "closed"] as const).map((s) => (
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
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== "all" && (
              <span className="ml-1.5 tabular-nums opacity-70">
                ({quizzes.filter((q) => q.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Quiz Grid ────────────────────────────────────────── */}
      {filtered.length === 0 ? (
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
              onToggleLive={toggleLive}
              onDelete={deleteQuiz}
              onDuplicate={duplicateQuiz}
            />
          ))}
        </div>
      )}
    </div>
  );
}
