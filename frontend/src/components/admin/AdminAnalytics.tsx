import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Play,
  Activity,
  MessageSquare,
  Star,
  AlertTriangle,
  RotateCcw,
  LogOut,
  ArrowLeft,
  Key,
  Calendar,
  Filter,
  Bug,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Lock,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { trackEvent } from "../../utils/analytics";

interface AdminAnalyticsProps {
  onBackToApp: () => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";
const ADMIN_STORAGE_KEY = "tracelap_admin_key";

interface KpiData {
  totalVisitors: number;
  pageViews: number;
  codeRuns: number;
  traceSessions: number;
  executionsSuccess: number;
  executionsError: number;
  feedbackCount: number;
  averageRating: number;
  bugReports: number;
  featureRequests: number;
  generalFeedback: number;
}

interface FeatureUsageItem {
  feature: string;
  count: number;
  percentage: number;
}

interface LanguageUsageItem {
  language: string;
  count: number;
  percentage: number;
}

interface TimelineItem {
  date: string;
  visitors: number;
  runs: number;
  traces: number;
}

interface RecentEventItem {
  eventType: string;
  sessionId: string;
  feature: string;
  createdAt: string;
}

interface FeedbackItem {
  id: number | string;
  rating: number;
  message: string;
  type: "GENERAL" | "BUG" | "FEATURE";
  name: string | null;
  role: string | null;
  screenshotUrl: string | null;
  profileUrl: string | null;
  displayPermission: boolean;
  createdAt: string;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  onBackToApp,
}) => {
  // Auth state
  const [adminKey, setAdminKey] = useState<string>(() => {
    return (
      sessionStorage.getItem(ADMIN_STORAGE_KEY) ||
      sessionStorage.getItem("codelearner_admin_key") ||
      ""
    );
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showKeyText, setShowKeyText] = useState<boolean>(false);

  // Dashboard filter & data state
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">(
    "all",
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [ratingDist, setRatingDist] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [featuresUsage, setFeaturesUsage] = useState<FeatureUsageItem[]>([]);
  const [languagesUsage, setLanguagesUsage] = useState<LanguageUsageItem[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<TimelineItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEventItem[]>([]);

  // Feedback list & filters
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [totalFeedbacks, setTotalFeedbacks] = useState<number>(0);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>("ALL");
  const [feedbackRatingFilter, setFeedbackRatingFilter] =
    useState<string>("ALL");
  const [activeScreenshotModal, setActiveScreenshotModal] = useState<
    string | null
  >(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // 1. Verify key helper
  const verifyAndLogin = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
      setAuthError("Please enter the admin key.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToTest.trim() }),
      });

      if (!res.ok) {
        trackEvent("ADMIN_LOGIN_FAILED", "Admin Analytics");
        throw new Error("Invalid admin secret key.");
      }

      trackEvent("ADMIN_LOGIN_SUCCESS", "Admin Analytics");
      sessionStorage.setItem(ADMIN_STORAGE_KEY, keyToTest.trim());
      setAdminKey(keyToTest.trim());
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate.");
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Fetch dashboard analytics & feedbacks
  const fetchDashboardData = useCallback(async () => {
    if (!adminKey) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const headers = { "X-Admin-Key": adminKey };

      // Fetch analytics summary
      const analyticsRes = await fetch(
        `${API_BASE_URL}/admin/analytics?range=${dateRange}`,
        {
          headers,
        },
      );

      if (analyticsRes.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        throw new Error("Session expired or invalid key. Please log in again.");
      }

      if (!analyticsRes.ok) {
        throw new Error(`Failed to load analytics (${analyticsRes.status})`);
      }

      const analyticsData = await analyticsRes.json();
      setKpis(analyticsData.kpis);
      setRatingDist(
        analyticsData.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      );
      setFeaturesUsage(analyticsData.featuresUsage || []);
      setLanguagesUsage(analyticsData.languagesUsage || []);
      setActivityTimeline(analyticsData.activityTimeline || []);
      setRecentEvents(analyticsData.recentEvents || []);

      // Fetch feedback list with filters
      let fbUrl = `${API_BASE_URL}/admin/feedback?limit=100`;
      if (feedbackTypeFilter !== "ALL") fbUrl += `&type=${feedbackTypeFilter}`;
      if (feedbackRatingFilter !== "ALL")
        fbUrl += `&rating=${feedbackRatingFilter}`;

      const fbRes = await fetch(fbUrl, { headers });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        setFeedbacks(fbData.items || []);
        setTotalFeedbacks(fbData.total || 0);
      }
    } catch (err: any) {
      setFetchError(err.message || "Error fetching dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, dateRange, feedbackTypeFilter, feedbackRatingFilter]);

  // Initial check on mount
  useEffect(() => {
    const checkSavedKey = async () => {
      const saved = sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) {
        await verifyAndLogin(saved);
      }
    };
    void checkSavedKey();
  }, []);

  // Fetch when authenticated or filters change
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadData = async () => {
      await fetchDashboardData();
    };
    void loadData();
  }, [isAuthenticated, fetchDashboardData]);

  // Auto-refresh interval (2 mins)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 120000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchDashboardData]);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminKey("");
    setIsAuthenticated(false);
  };

  // RENDER: Login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToApp}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Tracelap</span>
            </button>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
              Admin Portal
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-950/50">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">
              Tracelap Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Enter your admin security key to access the private usage
              dashboard.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyAndLogin(adminKey);
            }}
            className="space-y-4"
          >
            {authError && (
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Secret Key
              </label>
              <div className="relative">
                <input
                  type={showKeyText ? "text" : "password"}
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter ADMIN_SECRET_KEY..."
                  className="w-full pl-9 pr-10 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showKeyText ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {authLoading ? (
                <span>Authenticating...</span>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER: Full Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToApp}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to tracelap</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-extrabold tracking-tight text-slate-100">
                tracelap Analytics
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Private Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-time usage metrics and authentic user feedback
            </p>
          </div>
        </div>

        {/* Date Filter & Controls */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* Date range picker */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <span className="text-slate-500 pl-2 pr-1">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            {(["today", "7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer uppercase text-[10px] font-mono font-bold ${
                  dateRange === r
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r === "today"
                  ? "Today"
                  : r === "7d"
                    ? "7 Days"
                    : r === "30d"
                      ? "30 Days"
                      : "All Time"}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={isLoading}
            title="Refresh metrics"
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw
              className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`}
            />
          </button>

          {/* Auto-refresh toggle */}
          <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer hidden md:flex">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-[11px]">Auto (2m)</span>
          </label>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Log out from admin"
            className="p-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {fetchError && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchDashboardData()}
              className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. TOP KPI CARDS */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Total Visitors */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Total Visitors
                </span>
                <div className="p-1.5 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-500/30">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {kpis ? kpis.totalVisitors.toLocaleString() : "..."}
              </div>
              <p className="text-[10px] text-slate-500">
                Unique anonymous sessions
              </p>
            </div>

            {/* Code Runs */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Code Runs
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <Play className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {kpis ? kpis.codeRuns.toLocaleString() : "..."}
              </div>
              <p className="text-[10px] text-slate-500">
                {kpis ? `${kpis.executionsSuccess} succeeded` : "Executions"}
              </p>
            </div>

            {/* Trace Sessions */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Trace Sessions
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {kpis ? kpis.traceSessions.toLocaleString() : "..."}
              </div>
              <p className="text-[10px] text-slate-500">
                Step-by-step visualizer traces
              </p>
            </div>

            {/* Feedback Responses */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Feedback
                </span>
                <div className="p-1.5 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-500/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {kpis ? kpis.feedbackCount.toLocaleString() : "..."}
              </div>
              <p className="text-[10px] text-slate-500">
                {kpis
                  ? `${kpis.bugReports} bugs, ${kpis.featureRequests} features`
                  : "User reviews"}
              </p>
            </div>

            {/* Average Rating */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Average Rating
                </span>
                <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-500/30">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-2xl font-black font-mono text-slate-100">
                  {kpis && kpis.averageRating > 0
                    ? kpis.averageRating.toFixed(1)
                    : "N/A"}
                </span>
                {kpis && kpis.averageRating > 0 && (
                  <span className="text-amber-400 text-lg">⭐</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Based on user submissions
              </p>
            </div>
          </div>
        </section>

        {/* 2. ACTIVITY OVER TIME (USAGE CHART) */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Activity Overview
              </h2>
              <p className="text-[11px] text-slate-400">
                Usage breakdown over time
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-300">Visitors</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Runs</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-slate-300">Traces</span>
              </span>
            </div>
          </div>

          {activityTimeline.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No usage activity recorded in this time range yet. Run code or
              trace executions to populate!
            </div>
          ) : (
            <div className="pt-4 pb-2">
              <div className="grid grid-flow-col auto-cols-fr gap-2 items-end h-40 border-b border-slate-800 pb-2">
                {activityTimeline.map((item, idx) => {
                  const maxVal = Math.max(
                    ...activityTimeline.map((t) =>
                      Math.max(t.visitors, t.runs, t.traces, 1),
                    ),
                  );
                  const hVisitors = Math.max(
                    4,
                    Math.round((item.visitors / maxVal) * 100),
                  );
                  const hRuns = Math.max(
                    4,
                    Math.round((item.runs / maxVal) * 100),
                  );
                  const hTraces = Math.max(
                    4,
                    Math.round((item.traces / maxVal) * 100),
                  );

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono text-slate-200 hidden group-hover:block z-20 whitespace-nowrap shadow-xl">
                        <div>{item.date}</div>
                        <div>
                          Visitors: {item.visitors} | Runs: {item.runs} |
                          Traces: {item.traces}
                        </div>
                      </div>

                      {/* Bar columns */}
                      <div className="flex items-end space-x-1 w-full justify-center">
                        <div
                          style={{ height: `${hVisitors}%` }}
                          className="w-2 sm:w-3 bg-sky-500/80 rounded-t transition-all group-hover:bg-sky-400"
                        />
                        <div
                          style={{ height: `${hRuns}%` }}
                          className="w-2 sm:w-3 bg-emerald-500/80 rounded-t transition-all group-hover:bg-emerald-400"
                        />
                        <div
                          style={{ height: `${hTraces}%` }}
                          className="w-2 sm:w-3 bg-indigo-500/80 rounded-t transition-all group-hover:bg-indigo-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-flow-col auto-cols-fr gap-2 pt-2 text-center text-[10px] font-mono text-slate-500">
                {activityTimeline.map((item, idx) => (
                  <div key={idx} className="truncate">
                    {item.date.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. FEATURE USAGE & PROGRAMMING LANGUAGE USAGE (2 COLUMNS) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Used Features */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Most Used Features
              </h2>
              <p className="text-[11px] text-slate-400">
                Calculated from genuine execution trace events
              </p>
            </div>

            {featuresUsage.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No feature events recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {featuresUsage.map((f, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        {f.feature}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {f.count} ({f.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(3, f.percentage))}%`,
                        }}
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Programming Language Usage */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Language Usage
              </h2>
              <p className="text-[11px] text-slate-400">
                Usage breakdown across supported language engines
              </p>
            </div>

            {languagesUsage.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No language metrics recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {languagesUsage.map((l, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        {l.language}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {l.count} ({l.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(3, l.percentage))}%`,
                        }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. FEEDBACK ANALYTICS (RATINGS & TYPES) */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Feedback Ratings & Distribution
              </h2>
              <p className="text-[11px] text-slate-400">
                Comprehensive ratings collected from actual users
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                Avg: {kpis?.averageRating.toFixed(1) || "0.0"} / 5.0 ⭐
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Rating Stars breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingDist[stars] || 0;
                const total = kpis?.feedbackCount || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div
                    key={stars}
                    className="flex items-center space-x-2 text-xs"
                  >
                    <span className="w-10 font-mono text-slate-300 flex items-center space-x-1">
                      <span>{stars}</span>
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 inline" />
                    </span>
                    <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Types breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <div className="text-indigo-400 font-bold text-xs flex items-center justify-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>General</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100">
                  {kpis?.generalFeedback || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <div className="text-rose-400 font-bold text-xs flex items-center justify-center space-x-1">
                  <Bug className="w-3.5 h-3.5" />
                  <span>Bug Reports</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100">
                  {kpis?.bugReports || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <div className="text-emerald-400 font-bold text-xs flex items-center justify-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Features</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100">
                  {kpis?.featureRequests || 0}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. RECENT FEEDBACK MANAGEMENT */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Recent User Feedback
              </h2>
              <p className="text-[11px] text-slate-400">
                Filter and inspect genuine feedback responses ({totalFeedbacks}{" "}
                total)
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center space-x-2 flex-wrap text-xs">
              {/* Type filter */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                <Filter className="w-3 h-3 text-slate-500 ml-1" />
                <select
                  value={feedbackTypeFilter}
                  onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="GENERAL">General</option>
                  <option value="BUG">Bug Reports</option>
                  <option value="FEATURE">Feature Requests</option>
                </select>
              </div>

              {/* Rating filter */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                <select
                  value={feedbackRatingFilter}
                  onChange={(e) => setFeedbackRatingFilter(e.target.value)}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Ratings</option>
                  <option value="5">5 ⭐</option>
                  <option value="4">4 ⭐</option>
                  <option value="3">3 ⭐</option>
                  <option value="2">2 ⭐</option>
                  <option value="1">1 ⭐</option>
                </select>
              </div>
            </div>
          </div>

          {feedbacks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No feedback matches the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                >
                  {/* Card top */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      {/* Rating stars */}
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              fb.rating >= s
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Type badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          fb.type === "BUG"
                            ? "bg-rose-950/60 text-rose-300 border-rose-500/30"
                            : fb.type === "FEATURE"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                              : "bg-indigo-950/60 text-indigo-300 border-indigo-500/30"
                        }`}
                      >
                        {fb.type}
                      </span>

                      {/* Display permission badge */}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          fb.displayPermission
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-800/80 text-slate-500 border-slate-700"
                        }`}
                      >
                        {fb.displayPermission ? "Public Consent" : "Private"}
                      </span>
                    </div>

                    {/* Submitter & Date */}
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">
                        {fb.name || "Anonymous User"}
                      </span>
                      {fb.role && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {fb.role}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(fb.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Message body */}
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {fb.message}
                  </p>

                  {/* Links / Screenshot attachment */}
                  {(fb.profileUrl || fb.screenshotUrl) && (
                    <div className="pt-1 flex items-center space-x-3 text-xs">
                      {fb.profileUrl && (
                        <a
                          href={fb.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition text-[11px] underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Profile Link</span>
                        </a>
                      )}

                      {fb.screenshotUrl && (
                        <button
                          onClick={() =>
                            setActiveScreenshotModal(fb.screenshotUrl)
                          }
                          className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 transition text-[11px] cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>View Screenshot</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6. RECENT ACTIVITY EVENT STREAM */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Live Activity Event Stream
            </h2>
            <p className="text-[11px] text-slate-400">
              Most recent anonymous analytics events logged
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Session</th>
                  <th className="pb-2">Feature / Detail</th>
                  <th className="pb-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentEvents.map((ev, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2 text-indigo-300 font-bold">
                      {ev.eventType}
                    </td>
                    <td className="py-2 text-slate-400">{ev.sessionId}</td>
                    <td className="py-2 text-slate-300">{ev.feature}</td>
                    <td className="py-2 text-right text-slate-500 text-[10px]">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Screenshot lightbox modal */}
      {activeScreenshotModal && (
        <div
          onClick={() => setActiveScreenshotModal(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl p-2"
          >
            <button
              onClick={() => setActiveScreenshotModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={activeScreenshotModal}
              alt="Screenshot full preview"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
