import React, { useState, useEffect } from "react";
import {
  X,
  Code2,
  User,
  ShieldCheck,
  Mail,
  ExternalLink,
  Sparkles,
  Layers,
  Cpu,
  GitBranch,
  Terminal,
  Database,
  Binary,
  CheckCircle,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"about" | "features" | "author" | "license">("about");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
    >
      {/* Centered Popup Window */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[88dvh] max-h-[88vh] ring-1 ring-white/10"
      >
        {/* Window Title Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 text-white shadow-md shadow-indigo-900/40">
              <Code2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
                  TRACELAP
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  v1.0.0
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Interactive Programming & Execution Flow Visualizer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 sm:px-6 pt-2 shrink-0 overflow-x-auto space-x-1">
          <button
            onClick={() => setActiveTab("about")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "about"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "features"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Visualizer Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("author")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "author"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Author & Contact</span>
          </button>
          <button
            onClick={() => setActiveTab("license")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "license"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>License</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/20 space-y-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Watch Your Code Come Alive</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>TRACELAP</strong> bridges the gap between writing lines of source code and developing an intuitive mental model of how computers actually execute programs in memory.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Why TRACELAP?
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                      <Binary className="w-4 h-4" />
                      <span>Zero Guesswork</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Students no longer have to guess what variables hold or where pointers point. Every reference is drawn explicitly.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                      <Terminal className="w-4 h-4" />
                      <span>Deterministic Ground Truth</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Powered by an in-process AST and Python runtime tracer (<code className="text-emerald-300">sys.settrace</code>), ensuring 100% accurate state without LLM hallucination.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-200">Technology Architecture:</h4>
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Python 3.12</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">FastAPI</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">React 19</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">TypeScript</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Tailwind CSS v4</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Monaco Editor</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">SQLite (WAL)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Zustand</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES */}
          {activeTab === "features" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 mt-0.5 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100">Stack Frames & Memory Heap</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Displays active stack frames, local variables, and heap objects with pointer links. Easily inspect list mutations, dictionary updates, and object references.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-pink-950/80 border border-pink-500/30 text-pink-400 mt-0.5 shrink-0">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100">Recursive Execution Trees</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Automatically builds an interactive, branching tree view for recursive algorithms like Fibonacci, Factorial, and tree traversals with return value annotations.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-400 mt-0.5 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100">Step-by-Step VCR Controls</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Step forward, step backward, or auto-play execution with adjustable playback speeds (0.5x, 1x, 2x) and instant scrub bar navigation.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mt-0.5 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100">Database & API Event Capture</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Emulates database queries and HTTP requests, rendering real-time timeline event cards alongside memory changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTHOR & CONTACT */}
          {activeTab === "author" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200">Team & Authors:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Vardhan Vendi */}
                  <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-indigo-950/50 shrink-0">
                      V
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5 truncate">
                        <span>Vardhan Vendi</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono shrink-0">
                          Creator
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate">
                        Core Engine & Backend Architecture
                      </p>
                    </div>
                  </div>

                  {/* Chaitanya Sai Deepthi */}
                  <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-purple-950/50 shrink-0">
                      C
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5 truncate">
                        <span>Chaitanya Sai Deepthi</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono shrink-0">
                          Team Member
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate">
                        UI/UX Design & Frontend Architecture
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-200">About the Project:</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We built TRACELAP to solve a major challenge when learning programming: visualizing memory mutations, pointers, recursion trees, and call stack lifecycles in real time without cognitive overload.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200">GitHub Profiles & Links:</h4>
                <div className="space-y-1.5">
                  <a
                    href="https://github.com/Vardhan-vendi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-indigo-300 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 fill-slate-400" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <span className="font-mono text-xs">Vardhan Vendi: @Vardhan-vendi</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="https://github.com/chaitanyasaideepthi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-purple-300 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 fill-slate-400" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <span className="font-mono text-xs">Chaitanya Sai Deepthi: @chaitanyasaideepthi</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="https://github.com/Vardhan-vendi/code-learner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-indigo-300 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs">Repository: Vardhan-vendi/code-learner</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>Have questions or suggestions? Click <strong>💬 Feedback</strong> in the top header!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LICENSE */}
          {activeTab === "license" && (
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>Open Source — Free for All Use</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                <div className="font-bold text-slate-100 text-xs border-b border-slate-800 pb-1 font-sans">
                  The MIT License (MIT)
                </div>
                <p className="text-slate-400">Copyright (c) 2026 Vardhan Vendi &amp; Chaitanya Sai Deepthi</p>
                <p className="leading-relaxed text-slate-400">
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the "Software"), to deal
                  in the Software without restriction, including without limitation the rights
                  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                  copies of the Software, and to permit persons to whom the Software is
                  furnished to do so, subject to the following conditions:
                </p>
                <p className="leading-relaxed text-slate-400">
                  The above copyright notice and this permission notice shall be included in all
                  copies or substantial portions of the Software.
                </p>
                <p className="leading-relaxed text-slate-400">
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                  SOFTWARE.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Window Footer */}
        <div className="border-t border-slate-800 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-950/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Esc</kbd> or click outside to dismiss
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-indigo-950/50"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
