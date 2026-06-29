import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mic, GitBranch, Code2, Search, BarChart3,
  MessageSquare, Bot, ArrowRight, Check, Zap,
  FileText, Video, ExternalLink,
} from "lucide-react";
import { useSession } from "../hooks/useAuth";

const S: Record<string, React.CSSProperties> = {
  font: { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" },
  mono: { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace" },
};

function BrandIcon({ size = 34 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, background: "#6366f1", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Mic style={{ width: size * 0.47, height: size * 0.47, color: "#fff" }} />
    </div>
  );
}

export default function LandingPage() {
  const { session, loading } = useSession();
  const isLoggedIn = !loading && !!session;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ ...S.font, background: "#fff", color: "#0c0c14", minHeight: "100vh" }}>

      {/* ── Navbar ─────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: scrolled ? "1px solid #e5e7eb" : "1px solid transparent",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
        transition: "border-color .2s, box-shadow .2s",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px", height: 64, display: "flex", alignItems: "center", gap: 8 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginRight: 32 }}>
            <BrandIcon />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0c0c14", letterSpacing: "-0.015em" }}>MeetingMind</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            {[["#how", "How it works"], ["#features", "Features"], ["#detail", "Use cases"]].map(([href, label]) => (
              <a key={href} href={href} style={{ padding: "7px 12px", fontSize: 14, fontWeight: 500, color: "#4b5563", borderRadius: 8, textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.color = "#0c0c14"; }}
                onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#4b5563"; }}>
                {label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {isLoggedIn ? (
              <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 9, textDecoration: "none" }}>
                Go to Dashboard <ArrowRight style={{ width: 13, height: 13 }} />
              </Link>
            ) : (
              <>
                <Link to="/auth" style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, color: "#4b5563", borderRadius: 8, textDecoration: "none", border: "1.5px solid #e5e7eb" }}>
                  Sign in
                </Link>
                <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 9, textDecoration: "none", boxShadow: "0 1px 3px rgba(99,102,241,.3), 0 4px 12px rgba(99,102,241,.18)" }}>
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section style={{ paddingTop: 128, paddingBottom: 80, background: "radial-gradient(ellipse 70% 50% at 50% -8%, rgba(99,102,241,.10) 0%, transparent 65%), #fff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>

          {/* Centered copy */}
          <div style={{ textAlign: "center", maxWidth: 740, margin: "0 auto 56px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", marginBottom: 32, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#6366f1" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px #d1fae5", flexShrink: 0 }} />
              Joins your call in real time · Powered by Claude AI
            </div>

            <h1 style={{ fontSize: "clamp(2.8rem, 6.5vw, 4.25rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#0c0c14", marginBottom: 22 }}>
              Your meetings are<br />now your{" "}
              <em style={{ fontStyle: "normal", color: "#6366f1" }}>backlog</em>.
            </h1>

            <p style={{ fontSize: 18, color: "#4b5563", lineHeight: 1.65, maxWidth: 500, margin: "0 auto 36px" }}>
              MeetingMind joins your call, extracts every task, maps them to exact file paths in your repo, and generates Claude Code prompts — before you close your laptop.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "14px 28px", background: "#6366f1", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, textDecoration: "none", boxShadow: "0 1px 3px rgba(99,102,241,.3), 0 4px 14px rgba(99,102,241,.2)" }}>
                Start for free <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
              <a href="#how" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", border: "1.5px solid #e5e7eb", color: "#374151", fontSize: 15, fontWeight: 600, borderRadius: 12, textDecoration: "none" }}>
                See how it works
              </a>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              {["Google Meet & Zoom", "GitHub codebase mapping", "Claude Code prompts included"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
                  <Check style={{ width: 14, height: 14, color: "#10b981" }} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Split transform panels */}
          <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 56px 1fr", alignItems: "start" }}>

            {/* Before: transcript */}
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#f8f9fa", borderBottom: "1px solid #f3f4f6" }}>
                {["#fc5f57","#fdbc40","#33c748"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "#9ca3af", marginLeft: 6 }}>Design Review · Today 2:31 PM</span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#10b981" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />Recording
                </span>
              </div>
              <div style={{ padding: 16, background: "#fff" }}>
                {[
                  { speaker: "Sarah Chen", time: "2:31", text: '"We need to fix the navbar hover color before Friday launch — it\'s still showing blue instead of indigo."' },
                  { speaker: "Marcus Rivera", time: "2:33", text: '"And the login form alignment is broken on mobile. Sajal can you take that one?"' },
                  { speaker: "Sajal Mishra", time: "2:35", text: '"Sure. Also someone needs to update the API timeout in the client — it\'s causing flakes."' },
                ].map((e, i) => (
                  <div key={i}>
                    {i > 0 && <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6366f1" }}>{e.speaker}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{e.time}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.55, margin: 0 }}>{e.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 72 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 2, height: 24, background: "linear-gradient(to bottom, transparent, #6366f1)" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 0 3px #eef2ff" }} />
                <div style={{ width: 2, height: 24, background: "linear-gradient(to bottom, #6366f1, transparent)" }} />
              </div>
            </div>

            {/* After: tasks */}
            <div style={{ border: "1.5px solid #c7d2fe", borderRadius: 12, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.09), 0 4px 14px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#f8f9fa", borderBottom: "1px solid #f3f4f6" }}>
                {["#fc5f57","#fdbc40","#33c748"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "#9ca3af", marginLeft: 6 }}>MeetingMind Report</span>
              </div>
              <div style={{ padding: 16, background: "#fff" }}>
                {[
                  { prio: "#ef4444", name: "Fix navbar hover color", path: "src/components/Navbar.tsx:47", assign: "→ Sarah · Due Friday" },
                  { prio: "#ef4444", name: "Fix mobile login form layout", path: "src/components/Auth/LoginForm.tsx:89", assign: "→ Sajal · Due Friday" },
                  { prio: "#f59e0b", name: "Increase API client timeout", path: "src/lib/api.ts:134", assign: "→ Sajal · Due next sprint" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.prio, flexShrink: 0, marginTop: 6 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0c0c14", marginBottom: 5 }}>{t.name}</div>
                      <code style={{ ...S.mono, display: "inline-block", fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 7px", borderRadius: 5, marginBottom: 4 }}>{t.path}</code>
                      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{t.assign}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#6366f1" }}>
                  <Code2 style={{ width: 13, height: 13 }} />
                  3 Claude Code prompts ready
                </span>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>from 4 min meeting</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo bar ───────────────────────────────────── */}
      <div style={{ background: "#f8f9fa", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: "22px 0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "#9ca3af", flexShrink: 0 }}>Integrates with</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Zoom", Icon: Video },
              { label: "Google Meet", Icon: Video },
              { label: "GitHub", Icon: GitBranch },
              { label: "Claude AI", Icon: Zap },
              { label: "Recall.ai", Icon: Mic },
            ].map(({ label, Icon }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
                <Icon style={{ width: 14, height: 14 }} />{label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#e5e7eb", gap: 1 }}>
            {[
              { n: "<30s", l: "Bot joins your meeting" },
              { n: "100%", l: "Tasks linked to file paths" },
              { n: "0", l: "Manual notes to write" },
              { n: "1 click", l: "Open in Claude Code" },
            ].map(({ n, l }) => (
              <div key={l} style={{ background: "#fff", padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1, marginBottom: 8, color: "#6366f1" }}>{n}</div>
                <div style={{ fontSize: 13.5, color: "#4b5563", fontWeight: 500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section id="how" style={{ padding: "100px 0", background: "#f8f9fa" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#6366f1", marginBottom: 12 }}>Simple by design</p>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 2.625rem)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.12, color: "#0c0c14", marginBottom: 14 }}>Three steps from call to commit</h2>
          <p style={{ fontSize: 16.5, color: "#4b5563", lineHeight: 1.65, maxWidth: 480, marginBottom: 56 }}>No configuration, no post-meeting cleanup. The bot handles everything between "start recording" and "here are your tasks."</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {[
              {
                num: "01",
                title: "Paste your meeting link",
                desc: "Copy the Zoom or Google Meet URL, paste it into MeetingMind. The bot joins as a silent participant and starts transcribing.",
                visual: (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ ...S.mono, fontSize: 11, color: "#9ca3af", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>meet.google.com/abc-defg-hij</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#6366f1", color: "#fff", padding: "3px 10px", borderRadius: 5, whiteSpace: "nowrap" as const }}>Join</span>
                  </div>
                ),
              },
              {
                num: "02",
                title: "Have your meeting normally",
                desc: "Talk about tasks, bugs, and decisions. MeetingMind tracks every assignment, who said it, and any deadline mentioned — in real time.",
                visual: (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, height: 36 }}>
                    {[12,22,9,30,16,26,11,34,18,28,8,24,14,32,20].map((h, i) => (
                      <div key={i} style={{ width: 4, borderRadius: 3, background: "#6366f1", height: h, opacity: h > 25 ? 1 : h > 15 ? 0.6 : 0.35 }} />
                    ))}
                  </div>
                ),
              },
              {
                num: "03",
                title: "Get a structured report",
                desc: "Tasks land with exact file paths from your GitHub repo, assignees, priorities, and Claude Code prompts pre-written.",
                visual: (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {[
                      { label: "Fix navbar hover color", badge: "High", bg: "#fee2e2", color: "#dc2626", dot: "#ef4444" },
                      { label: "Update API timeout", badge: "Med", bg: "#fef3c7", color: "#d97706", dot: "#f59e0b" },
                      { label: "Add loading skeleton", badge: "Low", bg: "#d1fae5", color: "#059669", dot: "#10b981" },
                    ].map(({ label, badge, bg, color, dot }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "#f8f9fa", borderRadius: 7, border: "1px solid #e5e7eb" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: "#4b5563", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{label}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, background: bg, color, padding: "2px 6px", borderRadius: 4 }}>{badge}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(({ num, title, desc, visual }) => (
              <div key={num} style={{ background: "#fff", padding: "40px 32px" }}>
                <div style={{ fontSize: "5rem", fontWeight: 900, lineHeight: 1, letterSpacing: "-.06em", color: "#e5e7eb", marginBottom: 24 }}>{num}</div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Mic style={{ width: 20, height: 20, color: "#6366f1" }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#0c0c14", letterSpacing: "-.015em", marginBottom: 10 }}>{title}</div>
                <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.65, marginBottom: 20 }}>{desc}</p>
                {visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#6366f1", marginBottom: 12 }}>What's included</p>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 2.625rem)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.12, color: "#0c0c14", marginBottom: 52 }}>
            Everything the meeting touched,<br />nothing it didn't.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { Icon: Bot, title: "AI meeting bot", desc: "Joins Zoom and Google Meet as a participant. No host permission needed, no app install for attendees.", bg: "#eef2ff", ic: "#6366f1" },
              { Icon: MessageSquare, title: "Speaker-aware transcript", desc: "Every word attributed to the right person. Manager vs. engineer detection means tasks land on the right assignee.", bg: "#ede9fe", ic: "#7c3aed" },
              { Icon: GitBranch, title: "GitHub file mapping", desc: "Every task resolves to an exact file path and line number — not a folder guess — via semantic codebase search.", bg: "#d1fae5", ic: "#059669" },
              { Icon: Code2, title: "Claude Code prompts", desc: "Each task ships with a ready-to-paste Claude Code prompt scoped to the exact file and what was discussed.", bg: "#fef3c7", ic: "#d97706" },
              { Icon: Search, title: "RAG codebase search", desc: "Semantic search across every connected repo. Finds the right file even when the meeting used informal language.", bg: "#dbeafe", ic: "#2563eb" },
              { Icon: BarChart3, title: "Structured report", desc: "Summary, key decisions, action items, and follow-up questions — one report that opens the moment your call ends.", bg: "#fee2e2", ic: "#dc2626" },
            ].map(({ Icon, title, desc, bg, ic }) => (
              <div key={title} style={{ padding: "28px 24px", border: "1.5px solid #e5e7eb", borderRadius: 12, background: "#fff", transition: "all .2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#c7d2fe"; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#e5e7eb"; el.style.transform = ""; el.style.boxShadow = ""; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon style={{ width: 20, height: 20, color: ic }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0c0c14", letterSpacing: "-.01em", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product detail ─────────────────────────────── */}
      <section id="detail" style={{ padding: "100px 0", background: "#f8f9fa" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>

          {/* Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#6366f1", marginBottom: 12 }}>GitHub integration</p>
              <h3 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.15, color: "#0c0c14", marginBottom: 16 }}>Tasks point to exactly where the code lives.</h3>
              <p style={{ fontSize: 15.5, color: "#4b5563", lineHeight: 1.7, marginBottom: 24 }}>When you index a repo, MeetingMind builds a semantic map of every file, function, and class. When the meeting produces a task, it finds the right path — not a guess, a match.</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {["File path + line number on every task", "Re-indexes automatically on each push", "Works across multiple repos in one report"].map(t => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#4b5563" }}>
                    <Check style={{ width: 16, height: 16, color: "#10b981", flexShrink: 0, marginTop: 2 }} />{t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.09), 0 4px 14px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #f3f4f6", background: "#f8f9fa" }}>
                  <div style={{ width: 36, height: 36, background: "#eef2ff", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText style={{ width: 18, height: 18, color: "#6366f1" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0c0c14" }}>Sprint Planning · Thu 10 AM</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>4 tasks · 3 speakers · 38 min</div>
                  </div>
                </div>
                <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid #e5e7eb" }}>
                  {["Summary", "Tasks (4)", "Transcript"].map((tab, i) => (
                    <span key={tab} style={{ padding: "10px 14px", fontSize: 13, fontWeight: i === 1 ? 600 : 500, color: i === 1 ? "#6366f1" : "#9ca3af", borderBottom: i === 1 ? "2px solid #6366f1" : "2px solid transparent" }}>{tab}</span>
                  ))}
                </div>
                <div style={{ padding: 16 }}>
                  {[
                    { prio: "#ef4444", name: "Replace deprecated useEffect pattern", path: "src/hooks/usePolling.ts:23", assign: "→ Sajal · Due tomorrow" },
                    { prio: "#f59e0b", name: "Add skeleton loader to dashboard", path: "src/pages/DashboardPage.tsx:67", assign: "→ Sarah · Due end of week" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i === 0 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.prio, flexShrink: 0, marginTop: 6 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0c0c14", marginBottom: 5 }}>{t.name}</div>
                        <code style={{ ...S.mono, display: "inline-block", fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 7px", borderRadius: 5, marginBottom: 4 }}>{t.path}</code>
                        <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{t.assign}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 9, padding: "12px 14px", fontSize: 12, color: "#6366f1", ...S.mono, lineHeight: 1.6 }}>
                    // At line 23 in usePolling.ts,<br />
                    // refactor useEffect + setInterval<br />
                    // with proper cleanup...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div style={{ background: "#1e1e2e", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.09)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 16px", background: "#181825" }}>
                {["#fc5f57","#fdbc40","#33c748"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                <span style={{ ...S.mono, fontSize: 12, color: "#6c7086", marginLeft: 6 }}>claude-prompt.txt</span>
              </div>
              <div style={{ padding: "20px 24px", ...S.mono, fontSize: 13, lineHeight: 1.75, overflowX: "auto" as const }}>
                <span style={{ color: "#6c7086" }}>// Generated by MeetingMind</span><br />
                <span style={{ color: "#6c7086" }}>// Meeting: Sprint Planning</span><br />
                <span style={{ color: "#6c7086" }}>// Task: Replace useEffect pattern</span><br /><br />
                <span style={{ color: "#cba6f7" }}>const</span>{" "}
                <span style={{ color: "#cdd6f4" }}>task</span> = {"{"}<br />
                &nbsp;&nbsp;<span style={{ color: "#fab387" }}>file</span>:{" "}
                <span style={{ color: "#a6e3a1" }}>"src/hooks/usePolling.ts"</span>,<br />
                &nbsp;&nbsp;<span style={{ color: "#fab387" }}>line</span>:{" "}
                <span style={{ color: "#cdd6f4" }}>23</span>,<br />
                &nbsp;&nbsp;<span style={{ color: "#fab387" }}>prompt</span>:{" "}
                <span style={{ color: "#a6e3a1" }}>"At line 23, refactor the<br />
                &nbsp;&nbsp;&nbsp;&nbsp;useEffect + setInterval into<br />
                &nbsp;&nbsp;&nbsp;&nbsp;useCallback with cleanup..."</span><br />
                {"}"}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#6366f1", marginBottom: 12 }}>Claude Code prompts</p>
              <h3 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.15, color: "#0c0c14", marginBottom: 16 }}>Open the task. Paste the prompt. Ship it.</h3>
              <p style={{ fontSize: 15.5, color: "#4b5563", lineHeight: 1.7, marginBottom: 24 }}>Every task comes with a Claude Code prompt written around the actual discussion from the meeting. It knows the file, the function, and what your team said needed changing.</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {["Prompt scoped to the exact file and context", "Includes what was said in the meeting", "Copy to clipboard in one click"].map(t => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#4b5563" }}>
                    <Check style={{ width: 16, height: 16, color: "#10b981", flexShrink: 0, marginTop: 2 }} />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #4338ca 0%, #6366f1 55%, #818cf8 100%)", padding: "100px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, top: -200, right: -100, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 300, height: 300, bottom: -100, left: -80, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(2.25rem, 5.5vw, 3.25rem)", fontWeight: 900, color: "#fff", letterSpacing: "-.035em", lineHeight: 1.08, marginBottom: 16 }}>
            Your next meeting ships<br />tasks automatically.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.72)", marginBottom: 40 }}>Free to start. No credit card. Works on the first meeting.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "#fff", color: "#6366f1", fontSize: 15, fontWeight: 700, borderRadius: 12, textDecoration: "none" }}>
              Get started free <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <a href="#how" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 600, borderRadius: 12, border: "1.5px solid rgba(255,255,255,.4)", textDecoration: "none" }}>
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer style={{ background: "#09090f", padding: "72px 0 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr", gap: 56, marginBottom: 56 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <BrandIcon size={32} />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>MeetingMind</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#6b7280", lineHeight: 1.65, maxWidth: 230, marginBottom: 24 }}>AI joins your call. Tasks arrive with file paths. Claude Code prompts included.</p>
              <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 9, textDecoration: "none" }}>
                Start for free →
              </Link>
            </div>
            {[
              { title: "Product", links: [{ l: "Dashboard", h: "/dashboard" }, { l: "New meeting", h: "/meeting/new" }, { l: "Repositories", h: "/repos" }, { l: "History", h: "/history" }, { l: "Settings", h: "/settings" }] },
              { title: "Integrations", links: [{ l: "Zoom", h: "#" }, { l: "Google Meet", h: "#" }, { l: "GitHub", h: "#" }, { l: "Claude AI", h: "#" }, { l: "Recall.ai", h: "#" }] },
              { title: "Company", links: [{ l: "About", h: "#" }, { l: "Privacy", h: "#" }, { l: "Terms", h: "#" }, { l: "Status", h: "#" }, { l: "Sign in", h: "/auth" }] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#374151", marginBottom: 16 }}>{title}</p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {links.map(({ l, h }) => (
                    <Link key={l} to={h} style={{ fontSize: 14, color: "#9ca3af", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#e5e7eb")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1f2937", paddingTop: 28, flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#4b5563" }}>© 2025 MeetingMind. All rights reserved.</span>
            <span style={{ fontSize: 13, color: "#4b5563", display: "flex", alignItems: "center", gap: 5 }}>
              Made with <strong style={{ color: "#6366f1" }}>Claude AI</strong> by Syvora
            </span>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Cookies"].map(l => (
                <a key={l} href="#" style={{ fontSize: 13, color: "#4b5563", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#4b5563")}>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
