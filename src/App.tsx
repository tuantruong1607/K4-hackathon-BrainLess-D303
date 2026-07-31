import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  BookOpenText,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  GraduationCap,
  LockKey,
  Moon,
  PaperPlaneTilt,
  Pause,
  Play,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Sun,
  X,
} from "@phosphor-icons/react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  status?: "answer" | "error";
  provider?: string;
  level?: AgentResponseLevel;
  sources?: agentApi.AgentCitation[];
  retryQuestion?: string;
};

type AgentResponseLevel = "beginner" | "intermediate" | "advanced";

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const { user, isGuest, logout } = useAuth();

  // Theme state: light or dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const [slideDocs, setSlideDocs] = useState<Day[]>([]);

  const [activeDay, setActiveDay] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState(700);

  useLayoutEffect(() => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;

    let animationFrame = 0;
    const measurePage = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const nextWidth = Math.max(280, Math.floor(viewer.clientWidth - 24));
        setPdfPageWidth((currentWidth) =>
          currentWidth === nextWidth ? currentWidth : nextWidth,
        );
      });
    };

    const resizeObserver = new ResizeObserver(measurePage);
    resizeObserver.observe(viewer);
    window.addEventListener("resize", measurePage);
    document.addEventListener("fullscreenchange", measurePage);
    measurePage();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measurePage);
      document.removeEventListener("fullscreenchange", measurePage);
    };
  }, [slideDocs.length]);

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

          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
          >
            {theme === "light" ? <Moon weight="fill" /> : <Sun weight="fill" />}
          </button>

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
                <div className="pdf-viewer" ref={pdfViewerRef}>
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
                      width={pdfPageWidth}
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
              activeDay={slideDocs[activeDay]?.key || "day01"}
              isGuest={isGuest}
            />
          </div>

          <TutorPanel
            slideIndex={slideIndex}
            dayKey={slideDocs[activeDay]?.key || "day01"}
            dayTitle={slideDocs[activeDay]?.title || ""}
            onOpenSlide={(page) => {
              setPlaying(false);
              setSlideIndex(Math.max(0, Math.min(numPages - 1, page - 1)));
            }}
          />
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
  activeDay,
  isGuest,
}: {
  activeDay: string;
  isGuest: boolean;
}) {
  const { user } = useAuth();
  const [availableQuizzes, setAvailableQuizzes] = useState<quizApi.Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [quiz, setQuiz] = useState<quizApi.Quiz | null>(null);
  const [questions, setQuestions] = useState<quizApi.QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState<quizApi.QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Every quiz uploaded by an admin is available for self-paced practice.
  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    setLoadError("");
    quizApi
      .getQuizzes()
      .then((items) => {
        if (!mounted) return;
        const sorted = [...items].sort((a, b) =>
          a.day === activeDay && b.day !== activeDay
            ? -1
            : b.day === activeDay && a.day !== activeDay
              ? 1
              : 0,
        );
        setAvailableQuizzes(sorted);
        setSelectedQuizId((current) =>
          sorted.some((item) => item.id === current) ? current : sorted[0]?.id || "",
        );
      })
      .catch((error: Error) => {
        if (mounted) setLoadError(error.message || "Không thể tải danh sách quiz.");
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeDay]);

  useEffect(() => {
    if (!isOpen || !selectedQuizId) return;
    setLoading(true);
    setLoadError("");
    quizApi
      .getQuizById(selectedQuizId)
      .then((fullQuiz) => {
        setQuiz(fullQuiz);
        setQuestions(fullQuiz.questions || []);
        setQuestionIndex(0);
        setAnswers(new Map());
        setComplete(false);
        setResult(null);
        startTimeRef.current = Date.now();
      })
      .catch((error: Error) => setLoadError(error.message || "Không thể mở quiz."))
      .finally(() => setLoading(false));
  }, [isOpen, selectedQuizId]);

  useEffect(() => {
    document.body.classList.toggle("quiz-mode-open", isOpen);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("quiz-mode-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const score = useMemo(() => {
    if (!result) return 0;
    return result.correctAnswers;
  }, [result]);

  if (!isOpen) {
    return (
      <section className="quiz-panel quiz-launcher" aria-labelledby="quiz-title">
        <div className="quiz-lock-icon">
          <GraduationCap weight="fill" />
        </div>
        <div className="quiz-lock-copy">
          <small>Quiz tự luyện</small>
          <h2 id="quiz-title">Chọn một quiz và bắt đầu khi bạn sẵn sàng</h2>
          <p>Quiz do giảng viên upload luôn có sẵn, không cần chờ admin kích hoạt.</p>
        </div>
        <div className="quiz-launch-actions">
          <select
            value={selectedQuizId}
            onChange={(event) => setSelectedQuizId(event.target.value)}
            disabled={catalogLoading || availableQuizzes.length === 0}
            aria-label="Chọn quiz"
          >
            {catalogLoading && <option>Đang tải danh sách...</option>}
            {!catalogLoading && availableQuizzes.length === 0 && <option>Chưa có quiz</option>}
            {availableQuizzes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.day}
              </option>
            ))}
          </select>
          <button
            className="primary-button"
            type="button"
            disabled={!selectedQuizId || catalogLoading}
            onClick={() => setIsOpen(true)}
          >
            Bắt đầu làm
            <ArrowRight />
          </button>
          {loadError && <small className="quiz-load-error">{loadError}</small>}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="quiz-panel quiz-active is-fullscreen">
        <div className="quiz-session-bar">
          <div><small>Đang mở quiz</small></div>
          <button className="icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Đóng quiz">
            <X />
          </button>
        </div>
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
        <button className="text-button" type="button" onClick={() => setIsOpen(false)}>
          Đóng quiz
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
        <button className="text-button" type="button" onClick={() => setIsOpen(false)}>
          Đóng quiz
        </button>
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
          timeSpent: Math.round((Date.now() - startTimeRef.current) / 1000),
          quiz: { id: quiz?.id || "", title: quiz?.title || "", day: activeDay },
        });
        return;
      }

      try {
        const submitAnswers = Array.from(answers.entries()).map(
          ([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }),
        );
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
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
    <section className="quiz-panel quiz-active is-fullscreen" aria-labelledby="active-quiz-title">
      <div className="quiz-session-bar">
        <div>
          <small>Quiz tự luyện</small>
          <strong>{quiz?.title}</strong>
        </div>
        <div className="quiz-session-actions">
          <span>Nhấn Esc để thoát</span>
          <button className="icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Đóng quiz">
            <X />
          </button>
        </div>
      </div>
      <progress className="quiz-progress" value={questionIndex + 1} max={questions.length} />
      <div className="quiz-heading">
        <div>
          <span className="quiz-status">{quiz?.day} · {quiz?.difficulty}</span>
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

function TutorPanel({
  slideIndex,
  dayKey,
  dayTitle,
  onOpenSlide,
}: {
  slideIndex: number;
  dayKey: string;
  dayTitle: string;
  onOpenSlide: (page: number) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Mình trả lời dựa trên nội dung slide và luôn đính kèm nguồn để bạn kiểm tra lại.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [agentProvider, setAgentProvider] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(
    () => [
      `Tóm tắt slide ${slideIndex + 1}`,
      "Giải thích thuật ngữ chính",
      "Cho một ví dụ thực tế",
    ],
    [slideIndex],
  );

  useEffect(() => {
    let active = true;
    agentApi
      .getAgentHealth()
      .then((health) => {
        if (!active) return;
        setAgentStatus(health.status === "ok" ? "online" : "offline");
        setAgentProvider(health.provider);
      })
      .catch(() => {
        if (active) setAgentStatus("offline");
      });
    return () => {
      active = false;
    };
  }, []);

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
        const reply = await agentApi.askTutor(trimmed, {
          currentDay: dayKey,
          currentSlide: slideIndex + 1,
        });
        setAgentStatus("online");
        setAgentProvider(reply.provider);
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: reply.answer,
            status: "answer",
            provider: reply.provider,
            level: reply.level,
            sources: reply.sources,
          },
        ]);
      } catch {
        setAgentStatus("offline");
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: "Agent chưa thể truy cập kho slide lúc này. Bạn có thể thử lại sau khi dịch vụ được kết nối.",
            status: "error",
            retryQuestion: trimmed,
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [dayKey, slideIndex, thinking],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const providerLabel =
    agentProvider === "openai"
      ? "OpenAI agent"
      : agentProvider === "mock"
        ? "Demo agent"
        : "AI agent";
  const levelLabels: Record<AgentResponseLevel, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
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
            <p>Hỏi đáp có dẫn nguồn từ bài học</p>
          </div>
        </div>
        <div className="tutor-header-actions">
          {messages.length > 1 && (
            <button
              className="tutor-reset"
              type="button"
              onClick={() => setMessages((current) => current.slice(0, 1))}
            >
              Cuộc trò chuyện mới
            </button>
          )}
          <span className={`agent-status is-${agentStatus}`}>
            <span aria-hidden="true" />
            {agentStatus === "checking"
              ? "Đang kết nối"
              : agentStatus === "online"
                ? providerLabel
                : "Mất kết nối"}
          </span>
        </div>
      </header>

      <div className="chat-context">
        <BookOpenText weight="fill" />
        <span>
          <small>Đang dùng làm ngữ cảnh</small>
          <strong>Slide {slideIndex + 1} · {dayTitle}</strong>
        </span>
        <span className="context-live">Tự cập nhật</span>
      </div>

      <div className="messages" aria-live="polite" aria-busy={thinking}>
        {messages.map((message) => (
          <div className={`message-row ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span className="mini-avatar">
                <Sparkle weight="fill" />
              </span>
            )}
            <div className={`message-bubble ${message.status === "error" ? "is-error" : ""}`}>
              <div className="message-content">{message.text}</div>
              {message.provider && message.level && (
                <div className="message-meta">
                  <span>{message.provider === "openai" ? "OpenAI" : message.provider}</span>
                  <span>{levelLabels[message.level]}</span>
                </div>
              )}
              {message.sources && message.sources.length > 0 && (
                <details className="message-sources">
                  <summary>
                    <BookOpenText weight="fill" />
                    {message.sources.length} nguồn trong bài
                  </summary>
                  <div className="citation-list">
                    {message.sources.map((source) => (
                      <button
                        className="citation-card"
                        type="button"
                        key={`${source.document_id}-${source.version}-${source.slide_number}`}
                        onClick={() => onOpenSlide(source.slide_number)}
                      >
                        <span>Slide {source.slide_number}</span>
                        <strong>{source.title}</strong>
                        <small>{Math.round(Math.max(0, source.score) * 100)}% liên quan</small>
                      </button>
                    ))}
                  </div>
                </details>
              )}
              {message.status === "error" && message.retryQuestion && (
                <button
                  className="message-retry"
                  type="button"
                  onClick={() => sendMessage(message.retryQuestion || "")}
                  disabled={thinking}
                >
                  Thử kết nối lại
                </button>
              )}
            </div>
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
              <small>Đang tìm trong slide...</small>
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
        <p>
          {agentStatus === "online"
            ? "Câu trả lời được tạo từ nguồn hiển thị bên trên."
            : "Agent đang ngoại tuyến — hệ thống không tạo câu trả lời giả."}
        </p>
      </form>
    </aside>
  );
}

export default App;
