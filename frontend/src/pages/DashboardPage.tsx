import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Mic, CheckCircle, Clock, Radio, XCircle, Check,
} from "lucide-react";
import * as api from "../lib/api";
import type { Meeting, Task } from "../types";

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const map: Record<Meeting["status"], { label: string; className: string; icon: React.ReactNode }> = {
    bot_joining: { label: "Joining", className: "bg-blue-50 text-blue-700", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    recording: { label: "Recording", className: "bg-red-50 text-red-700", icon: <Radio className="w-3 h-3" /> },
    processing: { label: "Processing", className: "bg-yellow-50 text-yellow-700", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    ready: { label: "Ready", className: "bg-green-50 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: "Failed", className: "bg-red-50 text-red-700", icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, className, icon } = map[status] ?? map.failed;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {icon} {label}
    </span>
  );
}

function priorityBadge(p: Task["priority"]) {
  const map = {
    high: "bg-red-50 text-red-700",
    medium: "bg-yellow-50 text-yellow-700",
    low: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[p] ?? map.medium}`}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const isLive = meeting.status === "bot_joining" || meeting.status === "recording";
  const href = meeting.status === "ready" ? `/meeting/${meeting.id}/report` : `/meeting/${meeting.id}`;

  return (
    <Link
      to={href}
      className="block p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{meeting.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {new Date(meeting.created_at).toLocaleString()}
            {meeting.duration && (
              <>
                <span className="text-gray-300">·</span>
                {Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          <StatusBadge status={meeting.status} />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMeetings(), api.getTasks()])
      .then(([m, t]) => {
        setMeetings(m.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setTasks(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = meetings.length;
  const readyCount = meetings.filter((m) => m.status === "ready").length;
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksPending = tasks.filter((t) => t.status === "pending").length;
  const live = meetings.filter((m) => m.status === "bot_joining" || m.status === "recording");
  const recent = meetings.slice(0, 5);
  const pendingTasks = tasks
    .filter((t) => t.status === "pending")
    .slice(0, 5);

  async function markDone(task: Task) {
    const updated = await api.updateTask(task.id, { status: "done" });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Meetings", value: loading ? "—" : total, color: "text-gray-900" },
          { label: "Reports Ready", value: loading ? "—" : readyCount, color: "text-green-600" },
          { label: "Tasks Done", value: loading ? "—" : tasksDone, color: "text-indigo-600" },
          { label: "Tasks Pending", value: loading ? "—" : tasksPending, color: "text-yellow-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Live */}
      {live.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live
          </h2>
          <div className="space-y-2">
            {live.map((m) => <MeetingCard key={m.id} meeting={m} />)}
          </div>
        </div>
      )}

      {/* Recent meetings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Recent Meetings</h2>
          <Link to="/history" className="text-xs text-indigo-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">No meetings yet.</p>
            <Link
              to="/meeting/new"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Mic className="w-4 h-4" /> Start your first meeting
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((m) => <MeetingCard key={m.id} meeting={m} />)}
          </div>
        )}
      </div>

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Your Pending Tasks</h2>
            <span className="text-xs text-gray-400">{tasksPending} total</span>
          </div>
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const meeting = meetings.find((m) => m.id === task.meeting_id);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/meeting/${task.meeting_id}/report`}
                      className="text-sm font-medium text-gray-800 hover:text-indigo-600 truncate block"
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {meeting && (
                        <span className="text-xs text-gray-400 truncate">{meeting.name}</span>
                      )}
                      {task.deadline && (
                        <span className="text-xs text-gray-400">· Due {task.deadline}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {priorityBadge(task.priority)}
                    <button
                      onClick={() => markDone(task)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Mark done"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
