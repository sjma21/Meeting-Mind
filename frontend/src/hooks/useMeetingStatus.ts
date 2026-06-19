import { useCallback, useEffect, useRef, useState } from "react";
import type { Meeting } from "../types";
import { getMeetingStatus } from "../lib/api";

const TERMINAL_STATUSES: Meeting["status"][] = ["ready", "failed"];

export interface MeetingStatusResult {
  status: Meeting["status"] | null;
  botStatus: string;
  duration: number | null;
  isPolling: boolean;
}

export function useMeetingStatus(
  meetingId: string | undefined,
  initialStatus?: Meeting["status"]
): MeetingStatusResult {
  const [status, setStatus] = useState<Meeting["status"] | null>(null);
  const [botStatus, setBotStatus] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<Meeting["status"] | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }

  const poll = useCallback(async () => {
    if (!meetingId) return;
    try {
      const result = await getMeetingStatus(meetingId);
      setStatus(result.status);
      setBotStatus(result.botStatus);
      setDuration(result.duration);
      statusRef.current = result.status;

      if (TERMINAL_STATUSES.includes(result.status)) {
        stopPolling();
      }
    } catch {
      // keep polling on transient errors
    }
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;

    // If we already know this is terminal (e.g. navigating to a finished meeting),
    // do one fetch to populate the display values then stop.
    const alreadyTerminal =
      initialStatus !== undefined && TERMINAL_STATUSES.includes(initialStatus);

    setIsPolling(!alreadyTerminal);

    // Always fire an immediate poll to get real status from backend.
    poll();

    if (alreadyTerminal) return;

    intervalRef.current = setInterval(poll, 5000);
    return stopPolling;
  }, [meetingId, poll]);

  // Expose initialStatus for first-render display (before first poll returns).
  const displayStatus = status ?? initialStatus ?? null;

  return { status: displayStatus, botStatus, duration, isPolling };
}
