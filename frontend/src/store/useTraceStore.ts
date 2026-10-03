import { create } from "zustand";
import type { TraceResult, TraceStep } from "../types/trace";
import { trackEvent } from "../utils/analytics";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";

const DEFAULT_CODE = `# Write or paste any Python code here!
# TRACELAP automatically visualizes memory, stack frames, and output.

# 1. Object References & Aliasing
fruits = ["apple", "banana"]
basket = fruits
basket.append("cherry")

# 2. Function Call Stack
def calculate_total(prices, tax_rate=0.05):
    subtotal = sum(prices)
    tax = subtotal * tax_rate
    return subtotal + tax

receipt = calculate_total([10, 25, 40])
print(f"Total Receipt: \${receipt:.2f}")
`;

export type LayoutMode = "split" | "editor-full" | "visualizer-full";
export type ActiveTabMode = "run" | "trace";
export type MobileTabMode = "code" | "trace" | "output";

export interface DetectedVisualModes {
  hasAliasing: boolean;
  hasRecursion: boolean;
  hasLoops: boolean;
  hasDb: boolean;
  hasApi: boolean;
}

export interface RunOutput {
  stdout: string;
  stderr: string;
  timeMs: number;
  isSuccess: boolean;
  stepsCount: number;
}

export interface TraceState {
  code: string;
  layoutMode: LayoutMode;
  activeTab: ActiveTabMode;
  mobileTab: MobileTabMode;
  splitPercent: number;
  language: string;
  aiProvider: "rule_based" | "groq" | "ollama";
  apiKey: string;
  isRunning: boolean;
  isPlaying: boolean;
  playbackSpeed: number;
  traceResult: TraceResult | null;
  runOutput: RunOutput | null;
  currentStepIndex: number;
  detectedModes: DetectedVisualModes;
  error: string | null;

  // Actions
  setCode: (code: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setActiveTab: (tab: ActiveTabMode) => void;
  setMobileTab: (tab: MobileTabMode) => void;
  setSplitPercent: (percent: number) => void;
  setLanguage: (lang: string) => void;
  setAiProvider: (provider: "rule_based" | "groq" | "ollama") => void;
  setApiKey: (key: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  runOnly: () => Promise<void>;
  runTrace: () => Promise<void>;
  runCode: () => Promise<void>;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (index: number) => void;
  togglePlay: () => void;
  pause: () => void;
  reset: () => void;
  getCurrentStep: () => TraceStep | null;
}

function analyzeTraceFeatures(result: TraceResult, code: string): DetectedVisualModes {
  let maxDepth = 0;
  let hasAliasing = false;
  let hasDb = false;
  let hasApi = false;

  for (const step of result.steps) {
    if (step.frames.length > maxDepth) maxDepth = step.frames.length;

    for (const frame of step.frames) {
      const objIds: Record<string, string[]> = {};
      for (const [varName, snap] of Object.entries(frame.local_vars)) {
        if (snap.is_pointer && snap.object_id) {
          if (!objIds[snap.object_id]) objIds[snap.object_id] = [];
          objIds[snap.object_id].push(varName);
          if (objIds[snap.object_id].length >= 2) {
            hasAliasing = true;
          }
        }
      }
    }

    if (step.external_call) {
      if (step.external_call.kind === "db") hasDb = true;
      if (step.external_call.kind === "api") hasApi = true;
    }
  }

  const hasRecursion = maxDepth >= 3;
  const hasLoops = code.includes("for ") || code.includes("while ");

  return { hasAliasing, hasRecursion, hasLoops, hasDb, hasApi };
}

export const useTraceStore = create<TraceState>((set, get) => ({
  code: DEFAULT_CODE,
  layoutMode: "split",
  activeTab: "trace",
  mobileTab: "code",
  splitPercent: 50,
  language: "Python 3.12",
  aiProvider: "rule_based",
  apiKey: "",
  isRunning: false,
  isPlaying: false,
  playbackSpeed: 1,
  traceResult: null,
  runOutput: null,
  currentStepIndex: 0,
  detectedModes: {
    hasAliasing: false,
    hasRecursion: false,
    hasLoops: false,
    hasDb: false,
    hasApi: false,
  },
  error: null,

  setCode: (code: string) => set({ code }),
  setLayoutMode: (layoutMode: LayoutMode) => set({ layoutMode }),
  setActiveTab: (activeTab: ActiveTabMode) => {
    set({ activeTab });
    if (activeTab === "trace") {
      trackEvent("VISUALIZER_OPENED", "Visualizer Tab");
    }
  },
  setMobileTab: (mobileTab: MobileTabMode) => set({ mobileTab }),
  setSplitPercent: (splitPercent: number) => set({ splitPercent }),
  setLanguage: (language: string) => {
    set({ language });
    trackEvent("LANGUAGE_SELECTED", language, { language });
  },
  setAiProvider: (aiProvider: "rule_based" | "groq" | "ollama") => set({ aiProvider }),
  setApiKey: (apiKey: string) => set({ apiKey }),
  setPlaybackSpeed: (playbackSpeed: number) => set({ playbackSpeed }),

  runOnly: async () => {
    const { code, aiProvider, apiKey, language } = get();
    trackEvent("CODE_RUN", "Terminal Output", { language });
    set({ isRunning: true, isPlaying: false, activeTab: "run", mobileTab: "output", error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          level: "beginner",
          provider: aiProvider,
          api_key: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Execution failed" }));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }

      const data: TraceResult = await response.json();
      const lastStep = data.steps.length > 0 ? data.steps[data.steps.length - 1] : null;

      if (data.success) {
        trackEvent("CODE_EXECUTION_SUCCESS", "Terminal Output", {
          language,
          stepsCount: data.total_steps,
          timeMs: data.execution_time_ms,
        });
      } else {
        trackEvent("CODE_EXECUTION_ERROR", "Terminal Output", {
          language,
          error: data.error,
        });
      }

      set({
        traceResult: data,
        runOutput: {
          stdout: lastStep?.stdout || "",
          stderr: data.error || lastStep?.stderr || "",
          timeMs: data.execution_time_ms,
          isSuccess: data.success,
          stepsCount: data.total_steps,
        },
        currentStepIndex: Math.max(0, data.steps.length - 1),
        isRunning: false,
        error: data.error || null,
      });
    } catch (err: any) {
      trackEvent("CODE_EXECUTION_ERROR", "Terminal Output", {
        language,
        error: err.message || "Network error",
      });
      set({
        isRunning: false,
        error: err.message || "Failed to reach backend server. Make sure FastAPI is running on port 8000.",
        runOutput: {
          stdout: "",
          stderr: err.message || "Network error",
          timeMs: 0,
          isSuccess: false,
          stepsCount: 0,
        },
      });
    }
  },

  runTrace: async () => {
    const { code, aiProvider, apiKey, language } = get();
    trackEvent("TRACE_STARTED", "Execution Trace", { language });
    set({ isRunning: true, isPlaying: false, activeTab: "trace", mobileTab: "trace", error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          level: "beginner",
          provider: aiProvider,
          api_key: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Execution failed" }));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }

      const data: TraceResult = await response.json();
      const detectedModes = analyzeTraceFeatures(data, code);
      const lastStep = data.steps.length > 0 ? data.steps[data.steps.length - 1] : null;

      let primaryFeature = "General Execution";
      if (detectedModes.hasRecursion) primaryFeature = "Recursion Visualizer";
      else if (detectedModes.hasAliasing) primaryFeature = "Array & Memory Visualizer";
      else if (detectedModes.hasLoops) primaryFeature = "Loop Execution";
      else if (detectedModes.hasDb) primaryFeature = "Mock Database";
      else if (detectedModes.hasApi) primaryFeature = "External API";

      trackEvent("TRACE_COMPLETED", primaryFeature, {
        language,
        stepsCount: data.total_steps,
        timeMs: data.execution_time_ms,
      });

      if (data.success) {
        trackEvent("CODE_EXECUTION_SUCCESS", primaryFeature, {
          language,
          stepsCount: data.total_steps,
          timeMs: data.execution_time_ms,
        });
      } else {
        trackEvent("CODE_EXECUTION_ERROR", primaryFeature, {
          language,
          error: data.error,
        });
      }

      set({
        traceResult: data,
        runOutput: {
          stdout: lastStep?.stdout || "",
          stderr: data.error || lastStep?.stderr || "",
          timeMs: data.execution_time_ms,
          isSuccess: data.success,
          stepsCount: data.total_steps,
        },
        detectedModes,
        currentStepIndex: 0,
        isRunning: false,
        error: data.steps.length === 0 ? (data.error || null) : null,
      });
    } catch (err: any) {
      trackEvent("CODE_EXECUTION_ERROR", "Execution Trace", {
        language,
        error: err.message || "Network error",
      });
      set({
        isRunning: false,
        error: err.message || "Failed to reach backend server. Make sure FastAPI is running on port 8000.",
      });
    }
  },

  runCode: async () => {
    const { activeTab, runOnly, runTrace } = get();
    if (activeTab === "run") {
      await runOnly();
    } else {
      await runTrace();
    }
  },

  stepForward: () => {
    const { traceResult, currentStepIndex } = get();
    if (!traceResult || !traceResult.steps.length) return;
    if (currentStepIndex < traceResult.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    const { traceResult } = get();
    if (!traceResult) return;
    const clamped = Math.max(0, Math.min(index, traceResult.steps.length - 1));
    set({ currentStepIndex: clamped });
  },

  togglePlay: () => {
    const { isPlaying, currentStepIndex, traceResult } = get();
    if (!traceResult || !traceResult.steps.length) return;

    if (!isPlaying && currentStepIndex >= traceResult.steps.length - 1) {
      set({ currentStepIndex: 0, isPlaying: true });
    } else {
      set({ isPlaying: !isPlaying });
    }
  },

  pause: () => set({ isPlaying: false }),

  reset: () => {
    set({
      currentStepIndex: 0,
      isPlaying: false,
      traceResult: null,
      runOutput: null,
      error: null,
    });
  },

  getCurrentStep: () => {
    const { traceResult, currentStepIndex } = get();
    if (!traceResult || !traceResult.steps.length) return null;
    return traceResult.steps[currentStepIndex] || null;
  },
}));
