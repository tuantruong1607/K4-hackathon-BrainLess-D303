import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  BookOpenText,
  Brain,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  GraduationCap,
  LockKey,
  PaperPlaneTilt,
  Pause,
  Play,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useAuth } from "./contexts/AuthContext";
import { apiFetch } from "./api/apiClient";
import * as quizApi from "./api/quiz";
import * as agentApi from "./api/agent";
import * as progressApi from "./api/progress";

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Day = {
  key: string;     // "day01", "day02", …
  label: string;
  title: string;
  status: "active" | "upcoming" | "locked";
  pdfUrl: string;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const quickPrompts = [
  "Cho mình một ví dụ JTBD",
  "Giải thích push và pull",
  "Tóm tắt slide này",
];

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const { user, isGuest, logout } = useAuth();

  const [slideDocs, setSlideDocs] = useState<Day[]>([]);

  const [activeDay, setActiveDay] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  // Fetch dynamic slides from backend API
  useEffect(() => {
    const abortController = new AbortController();
    const fetchSlides = async () => {
      try {
        const res = await apiFetch<any[]>("/slides", { signal: abortController.signal });
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((item: any, index: number) => ({
            key: item.day,
            label: `Ngày 0${index + 1}`,
            title: item.title,
            status: (index === 0 ? "active" : index === 1 ? "upcoming" : "locked") as Day["status"],
            pdfUrl: item.pdfPath.startsWith("http")
              ? item.pdfPath
              : `https://gimnlxrzpzpfbpiuobez.supabase.co/storage/v1/object/public/slides/${item.pdfPath}`,
          }));
          setSlideDocs(mapped);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        // Fallback to offline defaults if server unavailable (guest mode local fallback)
        setSlideDocs([
          {
            key: "day01",
            label: "Ngày 01",
            title: "Nền tảng JTBD",
            status: "active",
            pdfUrl: "https://gimnlxrzpzpfbpiuobez.supabase.co/storage/v1/object/public/slides/d1-slide-hackathon.pdf",
          },
          {
            key: "day02",
            label: "Ngày 02",
            title: "Phỏng vấn người dùng",
            status: "upcoming",
            pdfUrl: "https://gimnlxrzpzpfbpiuobez.supabase.co/storage/v1/object/public/slides/d1-slide-hackathon.pdf",
          },
          {
            key: "day03",
            label: "Ngày 03",
            title: "Tổng hợp insight",
            status: "locked",
            pdfUrl: "https://gimnlxrzpzpfbpiuobez.supabase.co/storage/v1/object/public/slides/d1-slide-hackathon.pdf",
          },
        ]);
      }
    };
    fetchSlides();

    return () => {
      abortController.abort();
    };
  }, [user?.id, isGuest]);

  // Session timer
  const [sessionSeconds, setSessionSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const sessionTime = `${String(Math.floor(sessionSeconds / 60)).padStart(2, "0")}:${String(sessionSeconds % 60).padStart(2, "0")}`;

  // Auto-play
  useEffect(() => {
    if (!playing || numPages <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % numPages);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [playing, numPages]);

  const changeSlide = (direction: -1 | 1) => {
    setPlaying(false);
    if (numPages <= 0) return;
    setSlideIndex((current) => (current + direction + numPages) % numPages);
  };

  const openFullscreen = async () => {
    if (slideRef.current?.requestFullscreen) {
      await slideRef.current.requestFullscreen();
    }
  };

  // Track progress when slide changes
  useEffect(() => {
    if (!user || slideDocs.length === 0) return; // guest — don't track
    const day = slideDocs[activeDay];
    if (!day) return;
    progressApi.updateProgress(day.key, slideIndex).catch(() => {
      /* silently fail */
    });
  }, [slideIndex, activeDay, user, slideDocs]);

  // User display
  const displayName = user?.fullname ?? "Khách";
  const displayInitials = user
    ? user.fullname
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "KH";
  const displayRole = user?.role === "ADMIN" ? "Admin" : isGuest ? "Khách" : "Học viên";
  const isAdmin = user?.role === "ADMIN";

  // Progress percentage
  const [progressPct, setProgressPct] = useState("0%");
  useEffect(() => {
    if (!user || slideDocs.length === 0) {
      setProgressPct("0%");
      return;
    }
    progressApi
      .getProgress()
      .then((items) => {
        const completed = items.filter((p) => p.completed).length;
        const pct = slideDocs.length > 0 ? Math.round((completed / slideDocs.length) * 100) : 0;
        setProgressPct(`${pct}%`);
      })
      .catch(() => setProgressPct("0%"));
  }, [user, activeDay, slideDocs]);

  // If slides are loading, show a clean loading indicator
  if (slideDocs.length === 0) {
    return (
      <div className="app-loader">
        <div className="ambient ambient-one" aria-hidden="true" />
        <div className="ambient ambient-two" aria-hidden="true" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="loader-spinner" />
          <span style={{ color: "var(--muted)", fontWeight: 550 }}>Đang tải bài giảng...</span>
        </div>
      </div>
    );
  }

  return (

    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="VLearn trang học tập">
          <span className="brand-mark">
            <GraduationCap weight="fill" />
          </span>
          <span>
            <strong>vlearn</strong>
            <small>adaptive classroom</small>
          </span>
        </a>

        <div className="course-identity">
          <span>AI Product Hackathon</span>
          <strong>Workshop trực tiếp</strong>
        </div>

        <div className="topbar-actions">
          <div className="session-time" aria-label="Thời lượng buổi học">
            <Clock />
            <span>{sessionTime}</span>
          </div>

          {/* Admin controls — only for ADMIN role */}
          {isAdmin && (
            <div className="admin-control">
              <button
                className={`icon-button admin-trigger ${adminPanelOpen ? "is-active" : ""}`}
                type="button"
                onClick={() => setAdminPanelOpen((open) => !open)}
                aria-expanded={adminPanelOpen}
                aria-label="Mở bảng điều khiển admin"
              >
                <SlidersHorizontal />
              </button>
              {adminPanelOpen && (
                <AdminPopover
                  quizEnabled={quizEnabled}
                  onToggleQuiz={setQuizEnabled}
                  onClose={() => setAdminPanelOpen(false)}
                  activeDay={slideDocs[activeDay]?.key || "day01"}
                />
              )}
            </div>
          )}

          <button className="profile-button" type="button" onClick={user ? logout : undefined}>
            <span className="profile-avatar">{displayInitials}</span>
            <span className="profile-copy">
              <strong>{displayName}</strong>
              <small>{displayRole}</small>
            </span>
            {user ? <SignOut /> : <CaretDown />}
          </button>
        </div>
      </header>

      <main id="main-content" className="main-content">
        <section className="lesson-strip" aria-label="Lộ trình buổi học">
          <div className="lesson-title">
            <span className="lesson-icon">
              <BookOpenText weight="fill" />
            </span>
            <div>
              <small>Chương trình của bạn</small>
              <strong>Hiểu đúng vấn đề người dùng</strong>
            </div>
          </div>

          <nav className="day-tabs" aria-label="Chọn ngày học">
            {slideDocs.map((day, index) => (
              <button
                key={day.key}
                className={`day-tab ${activeDay === index ? "is-active" : ""}`}
                type="button"
                disabled={day.status === "locked"}
                onClick={() => {
                  setActiveDay(index);
                  setSlideIndex(0);
                  setNumPages(0);
                }}
              >
                <span>{day.label}</span>
                <strong>{day.title}</strong>
                {day.status === "locked" && <LockKey aria-label="Đã khóa" />}
              </button>
            ))}
          </nav>

          <div className="attendance">
            <CheckCircle weight="fill" />
            <span>
              <small>Tiến độ</small>
              <strong>{progressPct}</strong>
            </span>
          </div>
        </section>

        <div className="workspace-grid">
          <div className="learning-column">
            <section className="slide-panel" aria-labelledby="slide-heading">
              <div className="panel-toolbar">
                <div className="slide-meta">
                  <span className="live-indicator" aria-label="Đang phát trực tiếp" />
                  <div>
                    <small>Bài giảng trực tiếp</small>
                    <strong id="slide-heading">{slideDocs[activeDay]?.title || ""}</strong>
                  </div>
                </div>
                <div className="slide-actions">
                  <span className="slide-count">
                    {String(slideIndex + 1).padStart(2, "0")} /{" "}
                    {String(numPages || 1).padStart(2, "0")}
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setPlaying((value) => !value)}
                    aria-label={playing ? "Tạm dừng tự chuyển slide" : "Tự động chuyển slide"}
                  >
                    {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={openFullscreen}
                    aria-label="Xem toàn màn hình"
                  >
                    <ArrowsOut />
                  </button>
                </div>
              </div>

              <div className="slide-stage" ref={slideRef}>
                <div className="pdf-viewer">
                  <Document
                    file={slideDocs[activeDay]?.pdfUrl || ""}
                    onLoadSuccess={({ numPages: n }) => {
                      setNumPages(n);
                      setSlideIndex(0);
                    }}
                    loading={
                      <div className="pdf-loading">
                        <div className="loader-spinner" />
                        <span>Đang tải bài giảng...</span>
                      </div>
                    }
                    error={
                      <div className="pdf-error">
                        <span>Không thể tải PDF. Kiểm tra kết nối mạng.</span>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={slideIndex + 1}
                      width={
                        slideRef.current
                          ? slideRef.current.clientWidth - 24
                          : 700
                      }
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </Document>
                </div>

                <button
                  className="slide-nav slide-prev"
                  type="button"
                  onClick={() => changeSlide(-1)}
                  aria-label="Slide trước"
                  disabled={numPages <= 1}
                >
                  <ArrowLeft />
                </button>
                <button
                  className="slide-nav slide-next"
                  type="button"
                  onClick={() => changeSlide(1)}
                  aria-label="Slide tiếp theo"
                  disabled={numPages <= 1}
                >
                  <ArrowRight />
                </button>
              </div>

              <div className="slide-pagination" aria-label="Chọn slide">
                {Array.from({ length: Math.min(numPages, 20) }, (_, index) => (
                  <button
                    key={index}
                    className={index === slideIndex ? "is-active" : ""}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setSlideIndex(index);
                    }}
                    aria-label={`Mở slide ${index + 1}`}
                    aria-current={index === slideIndex ? "true" : undefined}
                  />
                ))}
              </div>
            </section>

            <QuizPanel
              enabled={quizEnabled}
              activeDay={slideDocs[activeDay]?.key || "day01"}
              isGuest={isGuest}
              onRequestAdmin={() => setAdminPanelOpen(true)}
            />
          </div>

          <TutorPanel slideIndex={slideIndex} dayTitle={slideDocs[activeDay]?.title || ""} />
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin Popover                                                      */
/* ------------------------------------------------------------------ */

function AdminPopover({
  quizEnabled,
  onToggleQuiz,
  onClose,
  activeDay,
}: {
  quizEnabled: boolean;
  onToggleQuiz: (v: boolean) => void;
  onClose: () => void;
  activeDay: string;
}) {
  const [quizzes, setQuizzes] = useState<quizApi.Quiz[]>([]);

  useEffect(() => {
    quizApi
      .getActiveQuizzes(activeDay)
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  }, [activeDay]);

  const toggleActive = async () => {
    // Toggle the first quiz's active state
    if (quizzes.length > 0) {
      const quiz = quizzes[0];
      try {
        if (quiz.isActive) {
          await quizApi.deactivateQuiz(quiz.id);
        } else {
          await quizApi.activateQuiz(quiz.id);
        }
      } catch {
        /* ignore errors */
      }
    }
    onToggleQuiz(!quizEnabled);
  };

  return (
    <div className="admin-popover">
      <div className="popover-title">
        <span className="popover-icon">
          <SlidersHorizontal />
        </span>
        <div>
          <strong>Điều khiển lớp</strong>
          <small>Bảng quản lý admin</small>
        </div>
        <button
          className="popover-close"
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng điều khiển"
        >
          <X />
        </button>
      </div>
      <div className="popover-row">
        <div>
          <strong>Live quiz</strong>
          <small>{quizEnabled ? "Học viên đang làm bài" : "Đang chờ kích hoạt"}</small>
        </div>
        <button
          className={`switch ${quizEnabled ? "is-on" : ""}`}
          type="button"
          role="switch"
          aria-checked={quizEnabled}
          onClick={toggleActive}
        >
          <span />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quiz Panel                                                         */
/* ------------------------------------------------------------------ */

function QuizPanel({
  enabled,
  activeDay,
  isGuest,
  onRequestAdmin,
}: {
  enabled: boolean;
  activeDay: string;
  isGuest: boolean;
  onRequestAdmin: () => void;
}) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<quizApi.Quiz | null>(null);
  const [questions, setQuestions] = useState<quizApi.QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState<quizApi.QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(() => Date.now());

  // Fetch active quiz when enabled
  useEffect(() => {
    if (!enabled) {
      setQuiz(null);
      setQuestions([]);
      setQuestionIndex(0);
      setAnswers(new Map());
      setComplete(false);
      setResult(null);
      return;
    }

    setLoading(true);
    quizApi
      .getActiveQuizzes(activeDay)
      .then(async (quizzes) => {
        if (quizzes.length > 0) {
          const fullQuiz = await quizApi.getQuizById(quizzes[0].id);
          setQuiz(fullQuiz);
          setQuestions(fullQuiz.questions || []);
        }
      })
      .catch(() => {
        /* fallback to empty */
      })
      .finally(() => setLoading(false));
  }, [enabled, activeDay]);

  const score = useMemo(() => {
    if (!result) return 0;
    return result.correctAnswers;
  }, [result]);

  if (!enabled) {
    return (
      <section className="quiz-panel quiz-locked" aria-labelledby="quiz-title">
        <div className="quiz-lock-icon">
          <LockKey weight="fill" />
        </div>
        <div className="quiz-lock-copy">
          <small>Live quiz</small>
          <h2 id="quiz-title">Một checkpoint ngắn đang chờ bạn</h2>
          <p>Quiz sẽ xuất hiện tại đây ngay khi giảng viên mở hoạt động.</p>
        </div>
        {!isGuest && user?.role === "ADMIN" && (
          <button className="text-button" type="button" onClick={onRequestAdmin}>
            Mở điều khiển admin
            <ArrowRight />
          </button>
        )}
      </section>
    );
  }

  if (loading) {
    return (
      <section className="quiz-panel quiz-locked">
        <div className="quiz-lock-icon">
          <div className="loader-spinner" />
        </div>
        <div className="quiz-lock-copy">
          <small>Đang tải quiz...</small>
        </div>
      </section>
    );
  }

  if (complete && result) {
    return (
      <section className="quiz-panel quiz-result" aria-live="polite">
        <div className="result-mark">
          <Check weight="bold" />
        </div>
        <div>
          <small>Đã nộp bài</small>
          <h2>
            {score === questions.length
              ? "Bạn đã nắm rất chắc bài học."
              : "Checkpoint đã hoàn thành."}
          </h2>
          <p>
            Bạn trả lời đúng{" "}
            <strong>
              {result.correctAnswers}/{questions.length}
            </strong>{" "}
            câu. Điểm: <strong>{result.score}%</strong>.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setAnswers(new Map());
            setQuestionIndex(0);
            setComplete(false);
            setResult(null);
          }}
        >
          Xem lại
        </button>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <section className="quiz-panel quiz-locked">
        <div className="quiz-lock-copy">
          <small>Không có câu hỏi</small>
          <p>Quiz đang được chuẩn bị.</p>
        </div>
      </section>
    );
  }

  const question = questions[questionIndex];
  const options = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];
  const selected = answers.get(question.id) || null;

  const choose = (optionKey: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(question.id, optionKey);
      return next;
    });
  };

  const proceed = async () => {
    if (!selected) return;

    if (questionIndex === questions.length - 1) {
      // Submit to backend
      if (!user) {
        // Guest — can't submit, just show local result
        setComplete(true);
        setResult({
          id: "guest",
          score: 0,
          correctAnswers: 0,
          wrongAnswers: questions.length,
          timeSpent: Math.round((Date.now() - startTime) / 1000),
          quiz: { id: quiz?.id || "", title: quiz?.title || "", day: activeDay },
        });
        return;
      }

      try {
        const submitAnswers = Array.from(answers.entries()).map(
          ([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }),
        );
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        const res = await quizApi.submitQuiz(quiz!.id, submitAnswers, timeSpent);
        setResult(res);
        setComplete(true);
      } catch (err: any) {
        // If already submitted, show message
        setComplete(true);
        setResult({
          id: "error",
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          timeSpent: 0,
          quiz: { id: quiz?.id || "", title: quiz?.title || "", day: activeDay },
        });
      }
    } else {
      setQuestionIndex((i) => i + 1);
    }
  };

  return (
    <section className="quiz-panel quiz-active" aria-labelledby="active-quiz-title">
      <div className="quiz-heading">
        <div>
          <span className="quiz-status">Live quiz</span>
          <h2 id="active-quiz-title">{question.question}</h2>
        </div>
        <span className="question-count">
          {String(questionIndex + 1).padStart(2, "0")}/
          {String(questions.length).padStart(2, "0")}
        </span>
      </div>

      <div className="answer-grid">
        {options.map((option) => (
          <button
            className={`answer-option ${selected === option.key ? "is-selected" : ""}`}
            type="button"
            key={option.key}
            onClick={() => choose(option.key)}
          >
            <span>{option.key}</span>
            <strong>{option.text}</strong>
            <Check weight="bold" />
          </button>
        ))}
      </div>

      <div className="quiz-footer">
        <span>
          {isGuest
            ? "Đăng nhập để nộp bài và lưu kết quả"
            : selected === null
              ? "Chọn một đáp án để tiếp tục"
              : "Đáp án đã được ghi nhận"}
        </span>
        <button
          className="primary-button"
          type="button"
          disabled={selected === null}
          onClick={proceed}
        >
          {questionIndex === questions.length - 1 ? "Nộp bài" : "Câu tiếp theo"}
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tutor Panel                                                        */
/* ------------------------------------------------------------------ */

function TutorPanel({ slideIndex, dayTitle }: { slideIndex: number; dayTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Chào bạn, mình là Lumi. Mình đang theo dõi bài giảng cùng bạn và sẵn sàng giải thích bất kỳ ý nào.",
    },
    {
      id: 2,
      role: "assistant",
      text: "Hãy đặt câu hỏi bất kỳ về nội dung bài học hoặc dùng gợi ý bên dưới nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  const sendMessage = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || thinking) return;

      setMessages((current) => [...current, { id: Date.now(), role: "user", text: trimmed }]);
      setInput("");
      setThinking(true);

      try {
        const reply = await agentApi.askTutor(trimmed);
        setMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: "assistant", text: reply },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: "Xin lỗi, mình đang gặp sự cố. Vui lòng thử lại sau.",
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [thinking],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <aside className="tutor-panel" aria-labelledby="tutor-title">
      <header className="tutor-header">
        <div className="tutor-identity">
          <span className="tutor-avatar">
            <Sparkle weight="fill" />
          </span>
          <div>
            <h2 id="tutor-title">Lumi tutor</h2>
            <p>
              Đang theo dõi slide {slideIndex + 1} — {dayTitle}
            </p>
          </div>
        </div>
        <span className="ai-badge">
          <Brain weight="fill" />
          AI
        </span>
      </header>

      <div className="chat-context">
        <BookOpenText weight="fill" />
        <span>
          <small>Ngữ cảnh hiện tại</small>
          <strong>{dayTitle}</strong>
        </span>
      </div>

      <div className="messages" aria-live="polite">
        {messages.map((message) => (
          <div className={`message-row ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span className="mini-avatar">
                <Sparkle weight="fill" />
              </span>
            )}
            <div className="message-bubble">{message.text}</div>
          </div>
        ))}
        {thinking && (
          <div className="message-row assistant">
            <span className="mini-avatar">
              <Sparkle weight="fill" />
            </span>
            <div className="message-bubble thinking-bubble" aria-label="Tutor đang trả lời">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="quick-prompts" aria-label="Câu hỏi gợi ý">
        {quickPrompts.map((prompt) => (
          <button type="button" key={prompt} onClick={() => sendMessage(prompt)} disabled={thinking}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="sr-only">
          Hỏi Lumi tutor
        </label>
        <div className="chat-input-wrap">
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Hỏi về nội dung bài học..."
          />
          <button type="submit" disabled={!input.trim() || thinking} aria-label="Gửi câu hỏi">
            <PaperPlaneTilt weight="fill" />
          </button>
        </div>
        <p>Lumi có thể mắc lỗi. Hãy đối chiếu với nội dung giảng viên.</p>
      </form>
    </aside>
  );
}

export default App;
