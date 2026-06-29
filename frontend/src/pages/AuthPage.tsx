import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Eye, EyeOff, Loader2, ArrowLeft, Check, Code2, GitBranch, MessageSquare } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useAuth";

const FONT: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};
const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace",
};

const FEATURES = [
  { Icon: GitBranch, text: "Tasks linked to exact GitHub file paths" },
  { Icon: Code2, text: "Claude Code prompts generated for every task" },
  { Icon: MessageSquare, text: "Speaker detection across your whole team" },
];

export default function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate("/dashboard", { replace: true });
  }, [session, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Check your email for a confirmation link, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${focusedField === name ? "#6366f1" : "#e5e7eb"}`,
    borderRadius: 10,
    fontSize: 14,
    color: "#0c0c14",
    background: "#fff",
    outline: "none",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    transition: "border-color .15s, box-shadow .15s",
    ...FONT,
  });

  return (
    <div style={{ ...FONT, minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>

      {/* ── Navbar ───────────────────────────────────────── */}
      <nav style={{
        height: 64, display: "flex", alignItems: "center",
        padding: "0 40px", borderBottom: "1px solid #e5e7eb",
        background: "#fff", flexShrink: 0,
        justifyContent: "space-between",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#6366f1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mic style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0c0c14", letterSpacing: "-0.015em" }}>MeetingMind</span>
        </Link>

        <Link
          to="/"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#6b7280", textDecoration: "none", padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to home
        </Link>
      </nav>

      {/* ── Body: split layout ────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>

        {/* Left panel — product context */}
        <div style={{
          background: "linear-gradient(145deg, #3730a3 0%, #4f46e5 45%, #6366f1 80%, #818cf8 100%)",
          padding: "56px 52px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Background orbs */}
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.04)", top: -120, right: -120, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.03)", bottom: -80, left: -60, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Tag */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "rgba(255,255,255,0.12)", borderRadius: 100, marginBottom: 32, border: "1px solid rgba(255,255,255,0.2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em" }}>Powered by Claude AI</span>
            </div>

            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 16 }}>
              Turn every meeting<br />into a sprint.
            </h2>

            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, marginBottom: 36, maxWidth: 360 }}>
              MeetingMind joins your call, extracts every task, and delivers Claude Code prompts with exact file paths — automatically.
            </p>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 44 }}>
              {FEATURES.map(({ Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 15, height: 15, color: "#fff" }} />
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Mini task card */}
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16, backdropFilter: "blur(8px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.5)" }}>Generated from meeting</span>
                <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.25)", color: "#fca5a5", padding: "2px 8px", borderRadius: 100 }}>High</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Fix navbar hover color mismatch</p>
              <code style={{ ...MONO, display: "block", fontSize: 11, color: "#a5b4fc", background: "rgba(99,102,241,0.25)", padding: "4px 9px", borderRadius: 6, marginBottom: 10 }}>
                src/components/Navbar.tsx:47
              </code>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                <Check style={{ width: 12, height: 12, color: "#6ee7b7" }} />
                Claude Code prompt ready
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 40px", background: "#fafafa" }}>
          <div style={{ width: "100%", maxWidth: 400 }}>

            {/* Mode switcher tabs */}
            <div style={{ display: "flex", background: "#f0f0f5", borderRadius: 10, padding: 4, marginBottom: 32 }}>
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 7,
                    border: "none",
                    cursor: "pointer",
                    transition: "all .15s",
                    background: mode === m ? "#fff" : "transparent",
                    color: mode === m ? "#0c0c14" : "#9ca3af",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                    ...FONT,
                  }}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0c0c14", letterSpacing: "-0.025em", marginBottom: 6 }}>
              {mode === "signin" ? "Welcome back" : "Get started free"}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>
              {mode === "signin"
                ? "Sign in to access your meeting reports and tasks."
                : "Create your account. No credit card required."}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@company.com"
                  style={inputStyle("email")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Minimum 6 characters"
                    style={{ ...inputStyle("password"), paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}
                  >
                    {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "11px 14px", fontSize: 13, color: "#dc2626", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              {info && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9, padding: "11px 14px", fontSize: 13, color: "#15803d", lineHeight: 1.5 }}>
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px",
                  background: submitting ? "#818cf8" : "#6366f1",
                  color: "#fff",
                  fontSize: 14, fontWeight: 700,
                  borderRadius: 10, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: submitting ? "none" : "0 1px 3px rgba(99,102,241,.3), 0 4px 12px rgba(99,102,241,.18)",
                  transition: "all .15s",
                  marginTop: 4,
                  ...FONT,
                }}
              >
                {submitting && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                {mode === "signin" ? "Sign in to MeetingMind" : "Create free account"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 24 }}>
              {mode === "signin" ? (
                <>
                  No account yet?{" "}
                  <button onClick={() => switchMode("signup")} style={{ color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, ...FONT }}>
                    Create one free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => switchMode("signin")} style={{ color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, ...FONT }}>
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p style={{ textAlign: "center", fontSize: 12, color: "#d1d5db", marginTop: 32 }}>
              By continuing, you agree to our{" "}
              <a href="#" style={{ color: "#9ca3af", textDecoration: "underline" }}>Terms</a>
              {" "}and{" "}
              <a href="#" style={{ color: "#9ca3af", textDecoration: "underline" }}>Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
