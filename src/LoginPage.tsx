import { FormEvent, useState } from "react";
import { GraduationCap, ArrowRight, Eye, EyeSlash, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "./contexts/AuthContext";

export default function LoginPage() {
  const { login, register, enterAsGuest } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!fullname.trim()) {
          setError("Vui lòng nhập họ tên.");
          setLoading(false);
          return;
        }
        await register(email, password, fullname);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <GraduationCap weight="fill" />
          </span>
          <div>
            <strong>vlearn</strong>
            <small>adaptive classroom</small>
          </div>
        </div>

        <div className="login-header">
          <h1>{mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}</h1>
          <p>
            {mode === "login"
              ? "Đăng nhập để tiếp tục hành trình học tập."
              : "Đăng ký để bắt đầu khám phá."}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-field">
              <label htmlFor="fullname">Họ và tên</label>
              <input
                id="fullname"
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeSlash /> : <Eye />}
              </button>
            </div>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Đăng ký"}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <div className="login-divider">
          <span>hoặc</span>
        </div>

        <button className="guest-button" type="button" onClick={enterAsGuest}>
          <Sparkle weight="fill" />
          Tiếp tục với tư cách khách
        </button>

        <p className="login-switch">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button type="button" onClick={() => { setMode("register"); setError(""); }}>
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }}>
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
