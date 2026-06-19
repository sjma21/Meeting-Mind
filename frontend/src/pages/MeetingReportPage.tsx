import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2, ChevronLeft, Copy, Check, CheckCircle,
  AlertTriangle, Clock, FileText, MessageSquare, List,
  User, Star, HelpCircle, Clipboard,
} from "lucide-react";
import * as api from "../lib/api";
import type { MeetingReport, Task } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityBadge(p: Task["priority"]) {
  const map = {
    high: { label: "High", className: "bg-red-50 text-red-700" },
    medium: { label: "Medium", className: "bg-yellow-50 text-yellow-700" },
    low: { label: "Low", className: "bg-blue-50 text-blue-700" },
  };
  const { label, className } = map[p] ?? map.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "summary", label: "Summary", icon: FileText },
  { key: "my-tasks", label: "My Tasks", icon: Star },
  { key: "all-tasks", label: "All Tasks", icon: List },
  { key: "questions", label: "Questions", icon: HelpCircle },
  { key: "transcript", label: "Transcript", icon: MessageSquare },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ data }: { data: MeetingReport }) {
  const { report } = data;
  if (!report) return <p className="text-gray-400 text-sm">No report generated yet.</p>;

  const maxDuration = Math.max(...report.topics.map((t) => t.duration), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Summary</h3>
        <p className="text-gray-700 leading-relaxed">{report.summary}</p>
      </div>

      {report.topics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Topics Discussed</h3>
          <div className="space-y-3">
            {report.topics.map((t, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{t.title}</span>
                  <span className="text-gray-400 text-xs">{t.duration}m</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${(t.duration / maxDuration) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.decisions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Decisions</h3>
          <ul className="space-y-2">
            {report.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.participant_roles?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Participants Detected</h3>
          <div className="space-y-3">
            {report.participant_roles.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.detectedRole} · {p.confidence}% confidence</p>
                </div>
                {p.confidence < 80 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Verify manually
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onUpdate }: { task: Task; onUpdate: (t: Task) => void }) {
  const [done, setDone] = useState(task.status === "done");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(task.notes ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  async function markDone() {
    const newStatus = done ? "pending" : "done";
    const updated = await api.updateTask(task.id, { status: newStatus });
    setDone(newStatus === "done");
    onUpdate(updated);
  }

  async function saveNote() {
    setSavingNote(true);
    const updated = await api.updateTask(task.id, { notes: note });
    setSavingNote(false);
    setShowNote(false);
    onUpdate(updated);
  }

  const isDeadlineSoon = task.deadline
    ? new Date(task.deadline) <= new Date(Date.now() + 24 * 3600 * 1000)
    : false;

  return (
    <div className={`bg-white rounded-xl border transition-all ${done ? "border-green-200 opacity-75" : "border-gray-200"} overflow-hidden`}>
      {done && <div className="h-1 bg-green-400" />}
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className={`font-semibold text-gray-900 ${done ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </h3>
          {priorityBadge(task.priority)}
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isDeadlineSoon ? "text-red-600" : "text-gray-500"}`}>
            <Clock className="w-3.5 h-3.5" />
            Due: {task.deadline}
          </div>
        )}

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
        )}

        {/* Exact quote */}
        {task.exact_quote && (
          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-indigo-300">
            <p className="text-xs font-medium text-gray-500 mb-1">What was said:</p>
            <p className="text-sm text-gray-700 italic">"{task.exact_quote}"</p>
          </div>
        )}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Files to modify:</p>
            <div className="space-y-2">
              {task.files.map((f, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                    📄 {f.path}
                  </span>
                  <span className="text-xs text-gray-500 pl-1">{f.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claude prompt */}
        {task.claude_prompt && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">Claude Code Prompt:</p>
              <CopyButton text={task.claude_prompt} label="Copy Prompt" />
            </div>
            <pre
              ref={promptRef}
              className="text-xs text-gray-300 bg-gray-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48"
            >
              {task.claude_prompt}
            </pre>
          </div>
        )}

        {/* Notes */}
        {task.notes && !showNote && (
          <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-800">
            <span className="font-medium">Note:</span> {task.notes}
          </div>
        )}

        {showNote && (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingNote ? "Saving…" : "Save Note"}
              </button>
              <button
                onClick={() => setShowNote(false)}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={markDone}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              done
                ? "text-gray-500 border border-gray-200 hover:bg-gray-50"
                : "text-green-700 border border-green-200 hover:bg-green-50"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {done ? "Undo Done" : "Mark as Done"}
          </button>
          {!showNote && (
            <button
              onClick={() => setShowNote(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {task.notes ? "Edit Note" : "Add Note"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── My Tasks Tab ─────────────────────────────────────────────────────────────

function MyTasksTab({
  tasks,
  employeeName,
  onUpdate,
}: {
  tasks: Task[];
  employeeName: string;
  onUpdate: (t: Task) => void;
}) {
  const mine = tasks
    .filter((t) => t.assignee_name?.toLowerCase() === employeeName.toLowerCase())
    .sort((a, b) => {
      const ord = { high: 0, medium: 1, low: 2 };
      return (ord[a.priority] ?? 1) - (ord[b.priority] ?? 1);
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        <span className="font-semibold text-gray-800">{mine.length}</span> task{mine.length !== 1 ? "s" : ""} assigned to you
      </p>
      {mine.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No tasks assigned to you in this meeting.</div>
      ) : (
        mine.map((t) => <TaskCard key={t.id} task={t} onUpdate={onUpdate} />)
      )}
    </div>
  );
}

// ─── All Tasks Tab ────────────────────────────────────────────────────────────

function AllTasksTab({
  tasks,
  unassignedTasks,
}: {
  tasks: Task[];
  unassignedTasks: string[];
}) {
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    const name = t.assignee_name ?? "Unassigned";
    (grouped[name] ??= []).push(t);
  }

  const totalPeople = Object.keys(grouped).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        <span className="font-semibold text-gray-800">{tasks.length}</span> total task{tasks.length !== 1 ? "s" : ""} across <span className="font-semibold text-gray-800">{totalPeople}</span> people
      </p>

      {Object.entries(grouped).map(([name, personTasks]) => (
        <div key={name}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            {name}
            <span className="text-xs text-gray-400 font-normal">({personTasks.length})</span>
          </h3>
          <div className="space-y-2">
            {personTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {t.title}
                  </p>
                  {t.deadline && (
                    <p className="text-xs text-gray-400 mt-0.5">Due: {t.deadline}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {priorityBadge(t.priority)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {unassignedTasks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-800">Unassigned Tasks</h3>
          </div>
          <ul className="space-y-1.5">
            {unassignedTasks.map((t, i) => (
              <li key={i} className="text-sm text-yellow-700">• {t}</li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600 mt-3">
            ⚠️ These tasks have no owner — clarify with manager
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Questions Tab ────────────────────────────────────────────────────────────

function QuestionsTab({ questions }: { questions: string[] }) {
  const allText = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{questions.length}</span> thing{questions.length !== 1 ? "s" : ""} to clarify
        </p>
        {questions.length > 0 && (
          <CopyButton text={allText} label="Copy All" />
        )}
      </div>

      {questions.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">No open questions from this meeting.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
              <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 flex-1">{q}</p>
              <CopyButton text={q} />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Bring these to your next check-in with your manager before starting work.
      </p>
    </div>
  );
}

// ─── Transcript Tab ───────────────────────────────────────────────────────────

function TranscriptTab({
  transcript,
  tasks,
  managerName,
  employeeName,
}: {
  transcript: string;
  tasks: Task[];
  managerName: string;
  employeeName: string;
}) {
  const quotes = new Set(tasks.map((t) => t.exact_quote?.trim()).filter(Boolean));
  const words = transcript.split(/\s+/).length;
  const readMin = Math.ceil(words / 200);

  const lines = transcript.split("\n").filter(Boolean);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        {words} words · ~{readMin} min read
      </p>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 max-h-[600px] overflow-y-auto">
        {lines.map((line, i) => {
          const isManager = line.startsWith(managerName + ":");
          const isEmployee = line.startsWith(employeeName + ":");
          const isHighlighted = Array.from(quotes).some((q) => q && line.includes(q));

          const [speaker, ...rest] = line.split(":");
          const text = rest.join(":").trim();

          return (
            <div
              key={i}
              className={`text-sm leading-relaxed rounded px-2 py-1 -mx-2 ${
                isHighlighted ? "bg-yellow-50 border-l-2 border-yellow-400 pl-3" : ""
              }`}
            >
              <span
                className={`font-semibold mr-2 ${
                  isManager ? "text-indigo-600" : isEmployee ? "text-gray-500" : "text-gray-700"
                }`}
              >
                {speaker}:
              </span>
              <span className="text-gray-700">{text || line}</span>
              {isHighlighted && (
                <span className="ml-2 text-xs text-yellow-600">📋</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  useEffect(() => {
    if (!id) return;
    api.getMeetingReport(id)
      .then((r) => { setData(r); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  function handleTaskUpdate(updated: Task) {
    setData((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)) } : prev
    );
  }

  function copyMarkdown() {
    if (!data?.report) return;
    const r = data.report;
    const md = [
      `# ${data.meeting.name}`,
      `Date: ${new Date(data.meeting.created_at).toLocaleDateString()}`,
      ``,
      `## Summary`,
      r.summary,
      ``,
      `## Decisions`,
      ...r.decisions.map((d) => `- ${d}`),
      ``,
      `## Tasks`,
      ...data.tasks.map((t) => `- [${t.status === "done" ? "x" : " "}] **${t.title}** (${t.priority}) — ${t.assignee_name ?? "?"}`),
      ``,
      `## Follow-up Questions`,
      ...r.follow_up_questions.map((q) => `- ${q}`),
    ].join("\n");
    navigator.clipboard.writeText(md);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-red-500 mb-2">{error ?? "Failed to load report"}</p>
        <Link to="/dashboard" className="text-indigo-600 hover:underline text-sm">← Back to Dashboard</Link>
      </div>
    );
  }

  const { meeting, report, tasks } = data;
  const employeeName = report?.employee_name ?? meeting.participant_names?.employee ?? "";
  const managerName = report?.manager_name ?? meeting.participant_names?.manager ?? "";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{meeting.name}</h1>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(meeting.created_at).toLocaleDateString()}
            </span>
            {meeting.duration && <span>{Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s</span>}
            {managerName && <span>{managerName} & {employeeName}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Copy MD
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "my-tasks" && tasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                {tasks.filter((t) => t.assignee_name?.toLowerCase() === employeeName.toLowerCase()).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "summary" && <SummaryTab data={data} />}
        {activeTab === "my-tasks" && (
          <MyTasksTab tasks={tasks} employeeName={employeeName} onUpdate={handleTaskUpdate} />
        )}
        {activeTab === "all-tasks" && (
          <AllTasksTab
            tasks={tasks}
            unassignedTasks={report?.unassigned_tasks ?? []}
          />
        )}
        {activeTab === "questions" && (
          <QuestionsTab questions={report?.follow_up_questions ?? []} />
        )}
        {activeTab === "transcript" && (
          <TranscriptTab
            transcript={meeting.transcript ?? "No transcript available."}
            tasks={tasks}
            managerName={managerName}
            employeeName={employeeName}
          />
        )}
      </div>
    </div>
  );
}
