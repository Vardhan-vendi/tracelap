import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  RotateCcw,
  ChevronDown,
  Activity,
  Check,
  Menu,
  FolderOpen,
  Download,
  Info,
} from "lucide-react";
import { useTraceStore } from "../store/useTraceStore";
import { FeedbackButton } from "./feedback/FeedbackButton";

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenFeedback?: () => void;
  onOpenAbout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings: _onOpenSettings,
  onOpenFeedback,
  onOpenAbout,
}) => {
  const {
    code,
    setCode,
    isRunning,
    activeTab,
    runOnly,
    runTrace,
    reset,
    language,
    setLanguage,
  } = useTraceStore();

  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isHeaderLogoMounted, setIsHeaderLogoMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsHeaderLogoMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCode(text);
        reset();
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setIsAppMenuOpen(false);
  };

  const handleSaveFile = () => {
    let ext = "py";
    if (language.includes("JavaScript")) ext = "js";
    else if (language.includes("C++")) ext = "cpp";

    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `main.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsAppMenuOpen(false);
  };

  const languages = [
    { name: "Python 3.12", enabled: true, tag: "Active" },
    { name: "JavaScript (ES2024)", enabled: false, tag: "Coming Soon" },
    { name: "C++ (GCC 13)", enabled: false, tag: "Coming Soon" },
  ];

  return (
    <header className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-2.5 sm:px-4 md:px-6 flex items-center justify-between z-40 shrink-0 select-none shadow-md">
      {/* 1. Left: Menu Button & LANGUAGE MODE */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        {/* Top-Left App Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsAppMenuOpen(!isAppMenuOpen);
              setIsLangMenuOpen(false);
            }}
            title="App Menu (Open/Save File, About)"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-slate-100 transition cursor-pointer shadow-sm text-xs font-mono font-semibold"
          >
            <Menu className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Menu</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Menu Dropdown Popover */}
          {isAppMenuOpen && (
            <>
              {/* Tap backdrop to dismiss outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAppMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl bg-slate-950 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in">
                {/* Mobile Brand Info */}
                <div className="flex items-center space-x-2 px-2.5 py-1.5 border-b border-slate-800 mb-1 sm:hidden">
                  <img src="/logo.png" alt="TraceLap" className="h-4 w-auto" />
                  <span className="font-mono font-bold text-xs text-slate-200">TraceLap</span>
                </div>

                <div className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1">
                  File & App
                </div>

              {/* Open File */}
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open File...</span>
                </div>
                <span className="text-[9px] text-slate-500 font-sans">
                  Local
                </span>
              </button>

              {/* Save File */}
              <button
                onClick={handleSaveFile}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save File</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">
                  {language.includes("JavaScript")
                    ? ".js"
                    : language.includes("C++")
                      ? ".cpp"
                      : ".py"}
                </span>
              </button>

              <div className="h-[1px] bg-slate-800 my-1" />

              {/* About & License */}
              <button
                onClick={() => {
                  setIsAppMenuOpen(false);
                  onOpenAbout?.();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  <span>About & License</span>
                </div>
                <span className="text-[9px] text-slate-500 font-sans">MIT</span>
              </button>
            </div>
            </>
          )}
        </div>

        {/* Hidden input to pick local code file */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".py,.js,.jsx,.ts,.tsx,.cpp,.c,.java,.txt"
          onChange={handleOpenFile}
          className="hidden"
          id="header-open-file-input"
        />

        {/* LANGUAGE MODE Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLangMenuOpen(!isLangMenuOpen);
              setIsAppMenuOpen(false);
            }}
            title="Select Programming Language"
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3.5 py-1.5 rounded-xl border-2 border-emerald-500/70 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 transition cursor-pointer shadow-sm"
          >
            <span className="font-mono text-xs font-extrabold text-slate-100 hidden sm:inline">
              {language}
            </span>
            <span className="font-mono text-xs font-extrabold text-slate-100 sm:hidden">
              {language.split(" ")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400 ml-0.5 sm:ml-1" />
          </button>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <>
              {/* Tap backdrop to dismiss outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl bg-slate-950 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in">
                {languages.map((l) => (
                  <button
                    key={l.name}
                    disabled={!l.enabled}
                    onClick={() => {
                      setLanguage(l.name);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition ${
                      l.enabled
                        ? "hover:bg-slate-800 text-slate-200 cursor-pointer"
                        : "opacity-40 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <span>{l.name}</span>
                    {l.enabled ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {l.tag}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Center: TraceLap Brand Logo with Opening Opacity Transition Effect (Desktop / Tablet) */}
      <div className="hidden min-[520px]:flex items-center justify-center shrink-0 sm:shrink mx-1">
        <img
          src="/logo.png"
          alt="TraceLap"
          title="TraceLap"
          className={`h-7 sm:h-8 md:h-9 w-auto object-contain select-none transition-all duration-700 ease-out hover:opacity-95 ${
            isHeaderLogoMounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        />
      </div>

      {/* 3. Right: RUN & TRACE Mode Buttons & Feedback */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
        {/* Subtle Feedback Button */}
        {onOpenFeedback && <FeedbackButton onClick={onOpenFeedback} />}

        {/* RUN Button */}
        <button
          onClick={() => runOnly()}
          disabled={isRunning}
          title="Run Code & View Terminal Output"
          className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 ${
            activeTab === "run"
              ? "bg-[#ffc9c9] text-rose-950 border-rose-400 ring-2 ring-rose-400/40 shadow-rose-950/30 scale-105"
              : "bg-slate-900 border-emerald-500/60 text-emerald-400 hover:bg-emerald-950/50"
          }`}
        >
          <Play
            className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${activeTab === "run" ? "fill-rose-950" : "fill-emerald-400"}`}
          />
          <span>RUN</span>
        </button>

        {/* TRACE Button */}
        <button
          onClick={() => runTrace()}
          disabled={isRunning}
          title="Run Execution Tracer & View Animated Visualizer"
          className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 ${
            activeTab === "trace"
              ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-950/50 scale-105"
              : "bg-slate-900 border-emerald-500/60 text-emerald-400 hover:bg-emerald-950/50"
          }`}
        >
          <Activity className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>TRACE</span>
        </button>

        <div className="w-[1px] h-5 sm:h-6 bg-slate-800 mx-0.5 sm:mx-1" />

        {/* Reset Trace */}
        <button
          onClick={reset}
          title="Reset Trace & Code"
          className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
