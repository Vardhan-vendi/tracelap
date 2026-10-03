/**
 * Lightweight, privacy-respecting client analytics utility for TRACELAP.
 * Completely asynchronous, non-blocking, and never interferes with user execution.
 * Uses keepalive to prevent event loss during page navigation or reloads.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";
const SESSION_KEY = "tracelap_anon_session_id";

/**
 * Retrieves existing anonymous session ID or generates a persistent anonymous UUID.
 * Session ID is purely anonymous with zero personal data.
 */
export function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "s_" + (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      try {
        localStorage.setItem(SESSION_KEY, id);
      } catch {
        // Fallback if localStorage is disabled
      }
      try {
        sessionStorage.setItem(SESSION_KEY, id);
      } catch {
        // Fallback if sessionStorage is disabled
      }
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
 * Uses keepalive: true to guarantee delivery even if the user refreshes or closes the page.
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
      keepalive: true,
    }).catch(() => {
      // Non-blocking: silently ignore network errors
    });
  } catch {
    // Non-blocking: fail silently
  }
}
