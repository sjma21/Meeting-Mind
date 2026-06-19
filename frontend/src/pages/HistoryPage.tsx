import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, CheckCircle, Clock, Radio, XCircle } from "lucide-react";
import * as api from "../lib/api";
import type { Meeting } from "../types";

type Filter = "all" | "recording" | "ready" | "failed";

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const map: Record<
    Meeting["status"],
    { label: string; className: string; icon: React.ReactNode }
  > = {
    bot_joining: {
      label: "Joining",
      className: "bg-blue-50 text-blue-700",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    recording: {
      label: "Recording",
      className: "bg-red-50 text-red-700",
      icon: <Radio className="w-3 h-3" />,
    },
    processing: {
      label: "Processing",
      className: "bg-yellow-50 text-yellow-700",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    ready: {
      label: "Ready",
      className: "bg-green-50 text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-50 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const { label, className, icon } = map[status] ?? map.failed;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}
    >
      {icon} {label}
    </span>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "recording", label: "Recording" },
  { key: "ready", label: "Ready" },
  { key: "failed", label: "Failed" },
];

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.getMeetings().then((m) => {
      setMeetings(
        m.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = meetings;

    if (filter === "recording") {
      list = list.filter(
        (m) => m.status === "recording" || m.status === "bot_joining"
      );
    } else if (filter === "ready") {
      list = list.filter((m) => m.status === "ready");
    } else if (filter === "failed") {
      list = list.filter((m) => m.status === "failed");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.participant_names?.manager?.toLowerCase().includes(q) ||
          m.participant_names?.employee?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [meetings, filter, search]);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings…"
            className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {meetings.length === 0
            ? "No meetings yet. Start one from the dashboard."
            : "No meetings match your filter."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const href =
              m.status === "ready"
                ? `/meeting/${m.id}/report`
                : `/meeting/${m.id}`;

            return (
              <Link
                key={m.id}
                to={href}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {new Date(m.created_at).toLocaleString()}
                    {m.duration && (
                      <>
                        <span className="text-gray-300">·</span>
                        {Math.floor(m.duration / 60)}m {m.duration % 60}s
                      </>
                    )}
                  </div>
                  {(m.participant_names?.manager || m.participant_names?.employee) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[m.participant_names.manager, m.participant_names.employee]
                        .filter(Boolean)
                        .join(" & ")}
                    </p>
                  )}
                </div>
                <StatusBadge status={m.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
