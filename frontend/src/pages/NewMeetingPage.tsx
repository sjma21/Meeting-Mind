import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Loader2, Mic } from "lucide-react";
import * as api from "../lib/api";
import type { Repo } from "../types";

export default function NewMeetingPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [managerName, setManagerName] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);

  const [hasRecallKey, setHasRecallKey] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getKeys().then((keys) => {
      setHasRecallKey(!!keys.recallKey);
    }).catch(() => setHasRecallKey(false));

    api.getRepos().then((all) => {
      setRepos(all.filter((r) => r.indexed));
    }).catch(() => {});
  }, []);

  function toggleRepo(id: string) {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !meetingUrl || !managerName || !employeeName) return;
    setError(null);
    setSubmitting(true);
    try {
      const meeting = await api.createMeeting({
        name,
        meetingUrl,
        managerName,
        employeeName,
      });
      navigate(`/meeting/${meeting.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Recall key warning */}
      {hasRecallKey === false && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Recall.ai API key missing</p>
            <p className="text-yellow-700 mt-0.5">
              Add your key in{" "}
              <Link to="/settings" className="underline font-medium">Settings</Link>{" "}
              before starting a meeting.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Meeting name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meeting Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint Planning Q3"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Meeting link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meeting Link <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              required
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Paste your Zoom or Google Meet link. MeetingMind will join as a participant.
            </p>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Manager Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Who is running this meeting?"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Employee Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Repos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repositories for Task Mapping
            </label>
            {repos.length === 0 ? (
              <p className="text-sm text-gray-400">
                No indexed repos yet.{" "}
                <Link to="/repos" className="text-indigo-600 hover:underline">
                  Add repos in Repositories
                </Link>{" "}
                for better task mapping.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Select repos to use for task mapping. Only indexed repos are shown.
                </p>
                {repos.map((repo) => (
                  <label
                    key={repo.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepos.includes(repo.id)}
                      onChange={() => toggleRepo(repo.id)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">
                      {repo.owner}/{repo.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {repo.fileCount} files
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name || !meetingUrl || !managerName || !employeeName}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {submitting ? "Starting…" : "Start Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
