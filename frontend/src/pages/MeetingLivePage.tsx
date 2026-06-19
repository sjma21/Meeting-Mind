import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  StopCircle,
  RefreshCw,
} from "lucide-react";
import { useMeetingStatus } from "../hooks/useMeetingStatus";
import * as api from "../lib/api";
import type { Meeting } from "../types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const PROCESSING_MESSAGES = [
  "Reading your conversation...",
  "Identifying who said what...",
  "Extracting tasks assigned to you...",
  "Searching your codebase for relevant files...",
  "Writing Claude Code prompts for each task...",
  "Generating your meeting report...",
  "Almost done...",
];

function ProcessingPanel({ taskCount }: { taskCount?: number }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  if (taskCount !== undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Report ready!</p>
          <p className="text-sm text-gray-500 mt-1">
            Found <span className="font-semibold text-indigo-600">{taskCount} task{taskCount !== 1 ? "s" : ""}</span> for you
          </p>
          <p className="text-xs text-gray-400 mt-1">Redirecting to report…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Analyzing transcript</p>
        <p className="text-sm text-gray-500 mt-1 transition-all duration-500">
          {PROCESSING_MESSAGES[msgIdx]}
        </p>
      </div>
    </div>
  );
}

function StatusPanel({
  status,
  botStatus,
  duration,
  isPolling,
  taskCount,
}: {
  status: Meeting["status"] | null;
  botStatus: string;
  duration: number | null;
  isPolling: boolean;
  taskCount?: number;
}) {
  if (!status) return null;

  if (status === "bot_joining") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Bot is joining the meeting</p>
          <p className="text-sm text-gray-500 mt-1">This can take up to 30 seconds…</p>
          {botStatus && (
            <p className="text-xs text-gray-400 mt-1">Status: {botStatus}</p>
          )}
        </div>
      </div>
    );
  }

  if (status === "recording") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="relative">
          <Radio className="w-12 h-12 text-red-500" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Recording in progress</p>
          <p className="text-sm text-gray-500 mt-1">Your meeting is being transcribed live.</p>
          {isPolling && (
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Monitoring…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return <ProcessingPanel taskCount={taskCount} />;
  }

  if (status === "ready") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Report ready!</p>
          {duration && (
            <p className="text-xs text-gray-400 mt-1">
              Meeting duration: {formatDuration(duration)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="w-12 h-12 text-red-400" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
          <p className="text-sm text-gray-500 mt-1">
            {botStatus || "The bot was unable to join or analysis failed."}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function MeetingLivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);
  const [readyTaskCount, setReadyTaskCount] = useState<number | undefined>();

  const { status, botStatus, duration, isPolling } = useMeetingStatus(
    id,
    meeting?.status
  );

  useEffect(() => {
    if (!id) return;
    api.getMeeting(id).then((m) => {
      setMeeting(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // When status becomes "ready", fetch task count then auto-navigate
  useEffect(() => {
    if (status !== "ready" || !id) return;
    api.getMeetingReport(id)
      .then((r) => {
        setReadyTaskCount(r.tasks.length);
        setTimeout(() => navigate(`/meeting/${id}/report`), 2000);
      })
      .catch(() => {
        setTimeout(() => navigate(`/meeting/${id}/report`), 2000);
      });
  }, [status, id, navigate]);

  async function handleStopBot() {
    if (!id || removing) return;
    if (!confirm("Remove the bot from the meeting?")) return;
    setRemoving(true);
    try {
      await api.removeMeetingBot(id);
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(false);
    }
  }

  async function handleRecover() {
    if (!id || recovering) return;
    setRecovering(true);
    try {
      await api.recoverMeeting(id);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setRecovering(false);
    }
  }

  async function handleRetryAnalysis() {
    if (!id || retryingAnalysis) return;
    setRetryingAnalysis(true);
    try {
      await api.analyzeMeeting(id);
    } catch (e) {
      console.error(e);
    } finally {
      setRetryingAnalysis(false);
    }
  }

  const currentStatus = status ?? meeting?.status ?? null;
  const isLive = currentStatus === "bot_joining" || currentStatus === "recording";
  const showProcessingReady = currentStatus === "processing" && readyTaskCount !== undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-16 text-gray-500">
        Meeting not found.{" "}
        <Link to="/dashboard" className="text-indigo-600 hover:underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{meeting.name}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(meeting.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <StatusPanel
          status={currentStatus}
          botStatus={botStatus}
          duration={duration ?? meeting.duration ?? null}
          isPolling={isPolling}
          taskCount={showProcessingReady ? readyTaskCount : undefined}
        />

        {/* Live actions */}
        {isLive && (
          <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
            <button
              onClick={handleStopBot}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              Remove Bot
            </button>
          </div>
        )}

        {/* Failed actions */}
        {currentStatus === "failed" && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">{meeting.error_message ?? ""}</p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleRetryAnalysis}
                disabled={retryingAnalysis}
                className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-60"
              >
                {retryingAnalysis ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Retry Analysis
              </button>
              <button
                onClick={handleRecover}
                disabled={recovering}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Recover
              </button>
            </div>
          </div>
        )}

        {/* Ready: link to report */}
        {currentStatus === "ready" && (
          <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
            <Link
              to={`/meeting/${id}/report`}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Report →
            </Link>
          </div>
        )}
      </div>

      {/* Meeting info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Meeting Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400">Manager</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{meeting.participant_names?.manager ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Employee</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{meeting.participant_names?.employee ?? "—"}</dd>
          </div>
          {meeting.meeting_url && (
            <div className="col-span-2">
              <dt className="text-gray-400">Meeting Link</dt>
              <dd className="font-medium text-gray-800 mt-0.5 truncate">{meeting.meeting_url}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
