import { useState, useEffect, lazy, Suspense } from "react";
import { Header } from "./components/Header";
import { EditorPane } from "./components/EditorPane";
import { VisualizerPane } from "./components/visualizer/VisualizerPane";
import { OutputAreaPane } from "./components/OutputAreaPane";
import { AdjustableAxis } from "./components/AdjustableAxis";
import { useTraceStore } from "./store/useTraceStore";
import { trackEvent } from "./utils/analytics";
import { OpeningSplash } from "./components/common/OpeningSplash";
import { Code2, Activity, Terminal } from "lucide-react";

// Code-split modals and admin analytics to keep initial load lightweight and instantaneous
const ModalSettings = lazy(() =>
  import("./components/ModalSettings").then((m) => ({
    default: m.ModalSettings,
  })),
);
const FeedbackModal = lazy(() =>
  import("./components/feedback/FeedbackModal").then((m) => ({
    default: m.FeedbackModal,
  })),
);
const AboutModal = lazy(() =>
  import("./components/AboutModal").then((m) => ({ default: m.AboutModal })),
);
const AdminAnalytics = lazy(() =>
  import("./components/admin/AdminAnalytics").then((m) => ({
    default: m.AdminAnalytics,
  })),
);

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(
    () => window.location.pathname,
  );
  const {
    activeTab,
    setActiveTab,
    mobileTab,
    setMobileTab,
    traceResult,
    runOutput,
  } = useTraceStore();

  // Listen for browser popstate and hashchange events
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(
        window.location.pathname + window.location.hash + window.location.search,
      );
    };
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  // Track initial page view (privacy-safe, non-blocking)
  useEffect(() => {
    trackEvent("PAGE_VIEW", "App Load", { path: window.location.pathname });
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const normalizedPath = currentPath.toLowerCase();
  const isAdminRoute =
    normalizedPath.startsWith("/admin") ||
    normalizedPath.startsWith("/analytics") ||
    normalizedPath.includes("admin") ||
    normalizedPath.includes("analytics");

  // Render private Admin Analytics Dashboard if under /admin or /analytics
  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
            Loading Analytics...
          </div>
        }
      >
        <AdminAnalytics onBackToApp={() => navigateTo("/")} />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-full h-[100dvh] w-full max-w-full overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans select-none">
      {/* Website Opening with Opacity Transition Effect */}
      <OpeningSplash />

      {/* Top Header: MENU & LANGUAGE MODE (Left), TraceLap (Center), RUN & TRACE & FEEDBACK (Right) */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAdmin={() => navigateTo("/admin/analytics")}
      />

      {/* Mobile Screen Navigation Bar (Code / Trace / Output) - Hidden completely on Laptops & Desktops (md:hidden) */}
      <div className="flex md:hidden items-center justify-around bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 py-1.5 shrink-0 z-30">
        <button
          onClick={() => setMobileTab("code")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
            mobileTab === "code"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Code</span>
        </button>

        <button
          onClick={() => {
            setMobileTab("trace");
            setActiveTab("trace");
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
            mobileTab === "trace"
              ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-sm shadow-indigo-950/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Trace</span>
          {traceResult && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            setMobileTab("output");
            setActiveTab("run");
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
            mobileTab === "output"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-950/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-rose-400" />
          <span>Output</span>
          {runOutput && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                runOutput.isSuccess ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
          )}
        </button>
      </div>

      {/* Main Split Layout: CODING WORKSPACE | ADJUSTABLE AXIS | OUTPUT AREA or CODE VISUALIZE */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        <EditorPane />
        <AdjustableAxis />
        <div
          className={`h-full ${
            activeTab === "run" ? "md:flex-1 md:min-w-0 md:flex" : "md:hidden"
          } ${
            mobileTab === "output" ? "flex flex-1 w-full min-w-0" : "hidden"
          }`}
        >
          <OutputAreaPane />
        </div>
        <div
          className={`h-full ${
            activeTab === "trace" ? "md:flex-1 md:min-w-0 md:flex" : "md:hidden"
          } ${
            mobileTab === "trace" ? "flex flex-1 w-full min-w-0" : "hidden"
          }`}
        >
          <VisualizerPane />
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <ModalSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />
        </Suspense>
      )}

      {/* About & License Modal */}
      {isAboutOpen && (
        <Suspense fallback={null}>
          <AboutModal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
