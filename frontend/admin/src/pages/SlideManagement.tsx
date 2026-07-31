import { useState, useMemo, useRef, ElementType } from "react";
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  MoreHorizontal,
  Search,
  X,
  Image,
  Play,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  FilePlus,
  ArrowRight,
  BookOpen,
  Star,
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
type SlideStatus = "published" | "draft" | "archived";

interface SlideSlide {
  kicker: string;
  title: string;
  accent: string;
  note: string;
}

interface SlideDeck {
  id: string;
  title: string;
  lesson: string;
  status: SlideStatus;
  slides: SlideSlide[];
  uploadedAt: string;
  updatedAt: string;
  views: number;
  coverColor: string; // tailwind gradient classes
}

// ─── Mock data ───────────────────────────────────────────────
const INITIAL_DECKS: SlideDeck[] = [
  {
    id: "d1",
    title: "JTBD Foundations",
    lesson: "Ngày 01",
    status: "published",
    uploadedAt: "2026-07-20",
    updatedAt: "2026-07-28",
    views: 142,
    coverColor: "from-indigo-500 to-violet-600",
    slides: [
      { kicker: "Jobs to be Done", title: "Người dùng không mua sản phẩm.", accent: "Họ thuê một giải pháp để tạo ra tiến bộ.", note: "Bắt đầu từ hoàn cảnh và động lực thay đổi, không bắt đầu từ tính năng." },
      { kicker: "Một lăng kính đơn giản", title: "Khi tôi gặp một hoàn cảnh...", accent: "Tôi muốn có một động lực, để đạt được kết quả mong muốn.", note: "Cấu trúc này giúp nhóm nhìn thấy đúng nhu cầu phía sau hành vi." },
      { kicker: "Lực thúc đẩy thay đổi", title: "Tiến bộ xuất hiện khi lực đẩy đủ lớn.", accent: "Push và pull cần thắng được thói quen cùng nỗi lo.", note: "Hãy tìm sự kiện khiến người dùng quyết định rằng cách cũ không còn đủ tốt." },
    ],
  },
  {
    id: "d2",
    title: "User Interview Techniques",
    lesson: "Ngày 02",
    status: "published",
    uploadedAt: "2026-07-22",
    updatedAt: "2026-07-29",
    views: 98,
    coverColor: "from-emerald-500 to-teal-600",
    slides: [
      { kicker: "Phỏng vấn người dùng", title: "Câu hỏi tốt nhất không hỏi về giải pháp.", accent: "Hỏi về câu chuyện, hoàn cảnh và quyết định trong quá khứ.", note: "Câu hỏi về hành vi quá khứ đáng tin cậy hơn câu hỏi về ý định tương lai." },
      { kicker: "Kỹ thuật 5 Whys", title: "Hỏi 'Tại sao?' năm lần liên tiếp.", accent: "Mỗi câu trả lời sẽ dẫn bạn gần hơn đến động lực thật sự.", note: "Đừng dừng lại ở câu trả lời đầu tiên. Tiếp tục đào sâu." },
    ],
  },
  {
    id: "d3",
    title: "Insight Synthesis Framework",
    lesson: "Ngày 03",
    status: "draft",
    uploadedAt: "2026-07-30",
    updatedAt: "2026-07-30",
    views: 0,
    coverColor: "from-amber-500 to-orange-600",
    slides: [
      { kicker: "Tổng hợp Insight", title: "Insight là diễn giải, không phải data thô.", accent: "Biến dữ liệu rời rạc thành hiểu biết có thể hành động.", note: "Một insight tốt phải chỉ ra WHY, không chỉ WHAT." },
    ],
  },
  {
    id: "d4",
    title: "Rapid Prototyping Intro",
    lesson: "Ngày 04",
    status: "archived",
    uploadedAt: "2026-07-15",
    updatedAt: "2026-07-18",
    views: 57,
    coverColor: "from-rose-500 to-pink-600",
    slides: [
      { kicker: "Prototype nhanh", title: "Đừng giải thích ý tưởng. Hãy cho mọi người trải nghiệm.", accent: "Prototype thô tốt hơn giải thích hoàn hảo.", note: "Mục tiêu là học nhanh, không phải xây dựng nhanh." },
    ],
  },
];

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<SlideStatus, { label: string; className: string; icon: ElementType }> = {
  published: { label: "Published", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Globe },
  draft:     { label: "Draft",     className: "bg-amber-100  text-amber-700  border-amber-200",  icon: Lock },
  archived:  { label: "Archived",  className: "bg-slate-100  text-slate-500  border-slate-200",  icon: FileText },
};

// ─── Slide Preview Modal ──────────────────────────────────────
function SlidePreviewModal({ deck, onClose }: { deck: SlideDeck; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const slide = deck.slides[idx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{deck.title}</h2>
            <p className="text-xs text-slate-500">Slide {idx + 1} of {deck.slides.length}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Slide */}
        <div className={cn("relative flex items-center justify-center min-h-[280px] p-10 bg-gradient-to-br", deck.coverColor)}>
          <div className="text-center text-white space-y-3 max-w-lg">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {slide.kicker}
            </span>
            <h3 className="text-2xl font-bold leading-snug">{slide.title}</h3>
            <p className="text-sm text-white/80 font-medium">{slide.accent}</p>
            <p className="text-xs text-white/60 max-w-sm mx-auto">{slide.note}</p>
          </div>
          {/* Decorative */}
          <div className="absolute right-8 top-8 h-24 w-24 rounded-full border-2 border-white/10 opacity-50" />
          <div className="absolute right-12 top-12 h-12 w-12 rounded-full border-2 border-white/20 opacity-50" />
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronLeft size={13} /> Prev
          </button>

          <div className="flex items-center gap-1.5">
            {deck.slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === idx ? "w-6 bg-indigo-500" : "w-2 bg-slate-300 hover:bg-slate-400"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(deck.slides.length - 1, i + 1))}
            disabled={idx === deck.slides.length - 1}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────
function UploadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: SlideDeck) => void }) {
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState("Ngày 01");
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => setFileName(file.name);

  const submit = () => {
    if (!title.trim() || !fileName) return;
    const colors = [
      "from-indigo-500 to-violet-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
      "from-sky-500 to-blue-600",
    ];
    onAdd({
      id: `d${Date.now()}`,
      title: title.trim(),
      lesson,
      status: "draft",
      slides: [
        { kicker: "New Content", title: "Slide 1", accent: "Your content here", note: "Add notes for this slide" },
      ],
      uploadedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      views: 0,
      coverColor: colors[Math.floor(Math.random() * colors.length)],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Slide Deck</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a PDF or PPTX file for a lesson</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition",
              dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.pptx,.ppt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <FileText size={24} className="text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-indigo-700 text-center break-all">{fileName}</p>
                <p className="text-xs text-slate-400">Click to change file</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <Upload size={24} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">PDF or PPTX · Max 50 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Meta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deck Title</label>
            <input
              id="modal-slide-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JTBD Foundations"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lesson Day</label>
            <select
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
            >
              <option>Ngày 01</option>
              <option>Ngày 02</option>
              <option>Ngày 03</option>
              <option>Ngày 04</option>
              <option>Ngày 05</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            id="modal-submit-slide"
            type="button"
            onClick={submit}
            disabled={!title.trim() || !fileName}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Upload size={14} />
            Upload Deck
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deck Card ────────────────────────────────────────────────
function DeckCard({
  deck,
  onPreview,
  onDelete,
  onToggleStatus,
}: {
  deck: SlideDeck;
  onPreview: (d: SlideDeck) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[deck.status];
  const StatusIcon = cfg.icon;

  return (
    <Card className="border-slate-200 hover:shadow-md transition-all duration-200 group overflow-hidden">
      {/* Cover */}
      <div
        className={cn("relative h-36 flex items-end justify-between p-4 bg-gradient-to-br cursor-pointer", deck.coverColor)}
        onClick={() => onPreview(deck)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onPreview(deck)}
        aria-label={`Preview ${deck.title}`}
      >
        {/* Decorative orbits */}
        <div className="absolute right-6 top-6 h-20 w-20 rounded-full border-2 border-white/10" />
        <div className="absolute right-10 top-10 h-10 w-10 rounded-full border-2 border-white/15" />

        <div className="flex flex-col gap-1 z-10">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{deck.lesson}</span>
          <p className="text-sm font-bold text-white leading-snug">{deck.title}</p>
        </div>

        {/* Hover play overlay */}
        <div className="z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
            <Play size={14} className="text-white translate-x-0.5" />
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.className)}>
            <StatusIcon size={10} />
            {cfg.label}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { onPreview(deck); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  <Eye size={12} /> Preview slides
                </button>
                <button
                  type="button"
                  onClick={() => { onToggleStatus(deck.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  {deck.status === "published" ? <><Lock size={12} /> Unpublish</> : <><Globe size={12} /> Publish</>}
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  type="button"
                  onClick={() => { onDelete(deck.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 size={12} /> Delete deck
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Image size={11} className="text-slate-400" />
            {deck.slides.length} slides
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} className="text-slate-400" />
            {deck.views} views
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-100">
          <span>Updated {deck.updatedAt}</span>
          <button
            type="button"
            onClick={() => onPreview(deck)}
            className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-semibold transition"
          >
            Preview <ArrowRight size={10} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function SlideManagement() {
  const [decks, setDecks] = useState<SlideDeck[]>(INITIAL_DECKS);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<SlideDeck | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SlideStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    return decks.filter((d) => {
      const q = search.toLowerCase();
      return (
        (!q || d.title.toLowerCase().includes(q) || d.lesson.toLowerCase().includes(q)) &&
        (statusFilter === "all" || d.status === statusFilter)
      );
    });
  }, [decks, search, statusFilter]);

  const toggleStatus = (id: string) => {
    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next: SlideStatus = d.status === "published" ? "draft" : "published";
        return { ...d, status: next, updatedAt: new Date().toISOString().split("T")[0] };
      })
    );
  };

  const deleteDeck = (id: string) => setDecks((prev) => prev.filter((d) => d.id !== id));

  const stats = useMemo(() => ({
    total: decks.length,
    published: decks.filter((d) => d.status === "published").length,
    totalSlides: decks.reduce((s, d) => s + d.slides.length, 0),
    totalViews: decks.reduce((s, d) => s + d.views, 0),
  }), [decks]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {previewDeck && <SlidePreviewModal deck={previewDeck} onClose={() => setPreviewDeck(null)} />}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onAdd={(d) => setDecks((prev) => [d, ...prev])}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Slide Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload, preview, and publish lesson slide decks</p>
        </div>
        <button
          id="btn-upload-slide"
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition"
        >
          <Upload size={16} />
          Upload Slides
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Decks",   value: stats.total,       color: "text-slate-800",   icon: FileText },
          { label: "Published",     value: stats.published,   color: "text-emerald-600", icon: Globe },
          { label: "Total Slides",  value: stats.totalSlides, color: "text-indigo-600",  icon: BookOpen },
          { label: "Total Views",   value: stats.totalViews,  color: "text-amber-600",   icon: Star },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
              <Icon size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <Card className="border-slate-200" id="card-slide-list">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-violet-500" />
                All Slide Decks
                <Badge variant="outline" className="ml-1 text-xs text-slate-500 border-slate-200 bg-slate-50">
                  {filtered.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-0.5">Manage lesson content and presentation slides</CardDescription>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="slide-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search decks…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 pt-4 pb-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-1">
              {(["all", "published", "draft", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    statusFilter === s
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn("rounded px-2 py-1 text-xs font-medium transition", view === "grid" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600")}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn("rounded px-2 py-1 text-xs font-medium transition", view === "list" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600")}
              >
                List
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-50 mb-4">
                <FilePlus className="h-10 w-10 text-violet-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No slide decks found</p>
              <p className="text-sm text-slate-400 mt-1">
                {search || statusFilter !== "all" ? "Try adjusting your search or filters." : "Upload your first deck to get started."}
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onPreview={setPreviewDeck}
                  onDelete={deleteDeck}
                  onToggleStatus={toggleStatus}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {filtered.map((deck) => {
                const cfg = STATUS_CONFIG[deck.status];
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={deck.id}
                    className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-slate-50 transition group"
                  >
                    {/* Color strip */}
                    <div className={cn("h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center", deck.coverColor)}>
                      <FileText size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{deck.title}</p>
                      <p className="text-xs text-slate-500 truncate">{deck.lesson} · {deck.slides.length} slides · {deck.views} views</p>
                    </div>
                    <span className={cn("hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0", cfg.className)}>
                      <StatusIcon size={10} />
                      {cfg.label}
                    </span>
                    <span className="hidden lg:block text-xs text-slate-400 shrink-0">Updated {deck.updatedAt}</span>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" onClick={() => setPreviewDeck(deck)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition" title="Preview">
                        <Eye size={13} />
                      </button>
                      <button type="button" onClick={() => toggleStatus(deck.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition" title={deck.status === "published" ? "Unpublish" : "Publish"}>
                        {deck.status === "published" ? <Lock size={13} /> : <Globe size={13} />}
                      </button>
                      <button type="button" onClick={() => deleteDeck(deck.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
