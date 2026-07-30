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
  SlidersHorizontal,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Day = {
  label: string;
  title: string;
  status: "active" | "upcoming" | "locked";
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type Question = {
  question: string;
  helper: string;
  options: string[];
  answer: number;
};

const days: Day[] = [
  { label: "Ngày 01", title: "Nền tảng JTBD", status: "active" },
  { label: "Ngày 02", title: "Phỏng vấn người dùng", status: "upcoming" },
  { label: "Ngày 03", title: "Tổng hợp insight", status: "locked" },
];

const slides = [
  {
    kicker: "Jobs to be Done",
    title: "Người dùng không mua sản phẩm.",
    accent: "Họ thuê một giải pháp để tạo ra tiến bộ.",
    note: "Bắt đầu từ hoàn cảnh và động lực thay đổi, không bắt đầu từ tính năng.",
    mark: "01",
  },
  {
    kicker: "Một lăng kính đơn giản",
    title: "Khi tôi gặp một hoàn cảnh...",
    accent: "Tôi muốn có một động lực, để đạt được kết quả mong muốn.",
    note: "Cấu trúc này giúp nhóm nhìn thấy đúng nhu cầu phía sau hành vi.",
    mark: "02",
  },
  {
    kicker: "Lực thúc đẩy thay đổi",
    title: "Tiến bộ xuất hiện khi lực đẩy đủ lớn.",
    accent: "Push và pull cần thắng được thói quen cùng nỗi lo.",
    note: "Hãy tìm sự kiện khiến người dùng quyết định rằng cách cũ không còn đủ tốt.",
    mark: "03",
  },
];

const questions: Question[] = [
  {
    question: "Trong JTBD, người dùng thực sự 'thuê' sản phẩm để làm gì?",
    helper: "Chọn đáp án sát nhất với nội dung vừa học.",
    options: [
      "Sở hữu thêm nhiều tính năng",
      "Tạo ra một tiến bộ trong hoàn cảnh cụ thể",
      "So sánh thương hiệu với đối thủ",
      "Giảm mọi chi phí ngay lập tức",
    ],
    answer: 1,
  },
  {
    question: "Thành phần nào nên xuất hiện trong một job statement?",
    helper: "Tập trung vào cấu trúc hoàn cảnh, động lực và kết quả.",
    options: [
      "Persona, tính năng và giá bán",
      "Kênh truyền thông, ngân sách và KPI",
      "Hoàn cảnh, động lực và kết quả mong muốn",
      "Đối thủ, thị phần và chiến dịch",
    ],
    answer: 2,
  },
  {
    question: "Điều gì thường cản người dùng chuyển sang giải pháp mới?",
    helper: "Nhớ lại mô hình các lực thúc đẩy và cản trở thay đổi.",
    options: [
      "Thói quen cũ và nỗi lo về giải pháp mới",
      "Chỉ riêng mức giá",
      "Thiếu quảng cáo lặp lại",
      "Không có đủ tính năng nâng cao",
    ],
    answer: 0,
  },
];

const quickPrompts = [
  "Cho mình một ví dụ JTBD",
  "Giải thích push và pull",
  "Tóm tắt slide này",
];

function App() {
  const [activeDay, setActiveDay] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [playing]);

  const changeSlide = (direction: -1 | 1) => {
    setPlaying(false);
    setSlideIndex((current) => (current + direction + slides.length) % slides.length);
  };

  const openFullscreen = async () => {
    if (slideRef.current?.requestFullscreen) {
      await slideRef.current.requestFullscreen();
    }
  };

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
            <span>09:42</span>
          </div>
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
              <div className="admin-popover">
                <div className="popover-title">
                  <span className="popover-icon">
                    <SlidersHorizontal />
                  </span>
                  <div>
                    <strong>Điều khiển lớp</strong>
                    <small>Chế độ mô phỏng admin</small>
                  </div>
                  <button
                    className="popover-close"
                    type="button"
                    onClick={() => setAdminPanelOpen(false)}
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
                    onClick={() => setQuizEnabled((enabled) => !enabled)}
                  >
                    <span />
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="profile-button" type="button">
            <span className="profile-avatar">BA</span>
            <span className="profile-copy">
              <strong>Bảo Anh</strong>
              <small>Học viên</small>
            </span>
            <CaretDown />
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
            {days.map((day, index) => (
              <button
                key={day.label}
                className={`day-tab ${activeDay === index ? "is-active" : ""}`}
                type="button"
                disabled={day.status === "locked"}
                onClick={() => {
                  setActiveDay(index);
                  setSlideIndex(0);
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
              <strong>{activeDay === 0 ? "34%" : "0%"}</strong>
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
                    <strong id="slide-heading">JTBD Foundations</strong>
                  </div>
                </div>
                <div className="slide-actions">
                  <span className="slide-count">
                    {String(slideIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setPlaying((value) => !value)}
                    aria-label={playing ? "Tạm dừng tự chuyển slide" : "Tự động chuyển slide"}
                  >
                    {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
                  </button>
                  <button className="icon-button" type="button" onClick={openFullscreen} aria-label="Xem toàn màn hình">
                    <ArrowsOut />
                  </button>
                </div>
              </div>

              <div className="slide-stage" ref={slideRef}>
                <article className="lesson-slide" key={slideIndex}>
                  <div className="slide-copy">
                    <span className="slide-kicker">{slides[slideIndex].kicker}</span>
                    <h1>{slides[slideIndex].title}</h1>
                    <p className="slide-accent">{slides[slideIndex].accent}</p>
                    <p className="slide-note">{slides[slideIndex].note}</p>
                  </div>
                  <div className="slide-visual" aria-hidden="true">
                    <div className="orbit orbit-large" />
                    <div className="orbit orbit-small" />
                    <div className="progress-shape">
                      <span>JOB</span>
                      <strong>{slides[slideIndex].mark}</strong>
                    </div>
                    <div className="progress-word">PROGRESS</div>
                  </div>
                  <div className="slide-footer">
                    <span>AI Product Workshop</span>
                    <span>VLearn</span>
                  </div>
                </article>
                <button className="slide-nav slide-prev" type="button" onClick={() => changeSlide(-1)} aria-label="Slide trước">
                  <ArrowLeft />
                </button>
                <button className="slide-nav slide-next" type="button" onClick={() => changeSlide(1)} aria-label="Slide tiếp theo">
                  <ArrowRight />
                </button>
              </div>

              <div className="slide-pagination" aria-label="Chọn slide">
                {slides.map((slide, index) => (
                  <button
                    key={slide.mark}
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

            <QuizPanel enabled={quizEnabled} onRequestAdmin={() => setAdminPanelOpen(true)} />
          </div>

          <TutorPanel slideIndex={slideIndex} />
        </div>
      </main>
    </div>
  );
}

function QuizPanel({ enabled, onRequestAdmin }: { enabled: boolean; onRequestAdmin: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setQuestionIndex(0);
      setAnswers(questions.map(() => null));
      setComplete(false);
    }
  }, [enabled]);

  const score = useMemo(
    () => answers.reduce<number>((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0),
    [answers],
  );

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
        <button className="text-button" type="button" onClick={onRequestAdmin}>
          Mở điều khiển demo
          <ArrowRight />
        </button>
      </section>
    );
  }

  if (complete) {
    return (
      <section className="quiz-panel quiz-result" aria-live="polite">
        <div className="result-mark">
          <Check weight="bold" />
        </div>
        <div>
          <small>Đã nộp bài</small>
          <h2>{score === questions.length ? "Bạn đã nắm rất chắc bài học." : "Checkpoint đã hoàn thành."}</h2>
          <p>
            Bạn trả lời đúng <strong>{score}/{questions.length}</strong> câu. Tutor đã ghi nhận kết quả để gợi ý phần cần ôn lại.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setAnswers(questions.map(() => null));
            setQuestionIndex(0);
            setComplete(false);
          }}
        >
          Làm lại
        </button>
      </section>
    );
  }

  const question = questions[questionIndex];
  const selected = answers[questionIndex];

  const choose = (optionIndex: number) => {
    setAnswers((current) => current.map((answer, index) => (index === questionIndex ? optionIndex : answer)));
  };

  const proceed = () => {
    if (selected === null) return;
    if (questionIndex === questions.length - 1) {
      setComplete(true);
    } else {
      setQuestionIndex((index) => index + 1);
    }
  };

  return (
    <section className="quiz-panel quiz-active" aria-labelledby="active-quiz-title">
      <div className="quiz-heading">
        <div>
          <span className="quiz-status">Live quiz</span>
          <h2 id="active-quiz-title">{question.question}</h2>
          <p>{question.helper}</p>
        </div>
        <span className="question-count">
          {String(questionIndex + 1).padStart(2, "0")}/{String(questions.length).padStart(2, "0")}
        </span>
      </div>

      <div className="answer-grid">
        {question.options.map((option, index) => (
          <button
            className={`answer-option ${selected === index ? "is-selected" : ""}`}
            type="button"
            key={option}
            onClick={() => choose(index)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            <strong>{option}</strong>
            <Check weight="bold" />
          </button>
        ))}
      </div>

      <div className="quiz-footer">
        <span>{selected === null ? "Chọn một đáp án để tiếp tục" : "Đáp án đã được ghi nhận"}</span>
        <button className="primary-button" type="button" disabled={selected === null} onClick={proceed}>
          {questionIndex === questions.length - 1 ? "Nộp bài" : "Câu tiếp theo"}
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

function TutorPanel({ slideIndex }: { slideIndex: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Chào Bảo Anh, mình là Lumi. Mình đang theo dõi bài giảng cùng bạn và sẵn sàng giải thích bất kỳ ý nào.",
    },
    {
      id: 2,
      role: "assistant",
      text: "Ở slide này, hãy để ý từ “tiến bộ”. Đây là điểm khác biệt quan trọng nhất của JTBD.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const replyFor = (value: string) => {
    const normalized = value.toLocaleLowerCase("vi");
    if (normalized.includes("push") || normalized.includes("pull")) {
      return "Push là áp lực khiến cách cũ không còn ổn. Pull là sức hút của giải pháp mới. Người dùng đổi khi hai lực này mạnh hơn thói quen và nỗi lo.";
    }
    if (normalized.includes("ví dụ")) {
      return "Ví dụ: một người không thuê ứng dụng ghi chú chỉ để lưu chữ. Họ thuê nó để lấy lại cảm giác kiểm soát khi công việc trở nên quá tải.";
    }
    if (normalized.includes("tóm tắt")) {
      return `Tóm tắt slide ${slideIndex + 1}: hãy nghiên cứu tiến bộ người dùng muốn đạt được trong một hoàn cảnh cụ thể, thay vì chỉ hỏi họ muốn thêm tính năng gì.`;
    }
    return "Mình hiểu câu hỏi của bạn. Hãy thử nối nó với ba ý: hoàn cảnh hiện tại, động lực thay đổi và kết quả người dùng mong muốn.";
  };

  const sendMessage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || thinking) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: replyFor(trimmed) },
      ]);
      setThinking(false);
      timerRef.current = null;
    }, 720);
  };

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
            <p>Đang theo dõi slide {slideIndex + 1}</p>
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
          <strong>{slides[slideIndex].kicker}</strong>
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
