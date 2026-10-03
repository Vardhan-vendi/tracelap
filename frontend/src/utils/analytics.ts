/**
 * Lightweight, privacy-respecting client analytics utility for CodeLearner.
 * Completely asynchronous, non-blocking, and never interferes with user execution.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";
const SESSION_KEY = "codelearner_anon_session_id";

/**
 * Retrieves existing anonymous session ID from sessionStorage or generates a new one.
 * Session ID is purely anonymous (random UUID) with zero personal data.
 */
export function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "s_" + (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "s_anon_" + Math.random().toString(36).substring(2, 10);
  }
}

export interface AnalyticsEventPayload {
  eventType: string;
  sessionId: string;
  page?: string;
  feature?: string;
  metadata?: Record<string, any>;
}

/**
 * Fires an analytics event in the background without awaiting or blocking.
 * Fails silently if offline or if backend is unreachable.
 */
export function trackEvent(
  eventType: string,
  feature?: string,
  metadata?: Record<string, any>
): void {
  try {
    const sessionId = getOrCreateSessionId();
    const payload: AnalyticsEventPayload = {
      eventType,
      sessionId,
      page: window?.location?.pathname || "/",
      feature,
      metadata,
    };

    fetch(`${API_BASE_URL}/analytics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Non-blocking: silently ignore network errors so user experience is never impacted
    });
  } catch {
    // Non-blocking: fail silently
  }
}
