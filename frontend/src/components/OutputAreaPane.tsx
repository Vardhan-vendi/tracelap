import React from "react";
import { useTraceStore } from "../store/useTraceStore";
import {
  Terminal,
  Maximize2,
  Minimize2,
  Copy,
  Trash2,
  Check,
  Play,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { GoArrowSwitch } from "react-icons/go";

export const OutputAreaPane: React.FC = () => {
  const {
    runOutput,
    isRunning,
    runOnly,
    setActiveTab,
    setMobileTab,
    layoutMode,
    setLayoutMode,
    code,
  } = useTraceStore();

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!runOutput) return;
    const text =
      (runOutput.stdout || "") +
      (runOutput.stderr ? "\n" + runOutput.stderr : "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    useTraceStore.setState({ runOutput: null });
  };

  if (layoutMode === "editor-full") {
    return null;
  }

  const isMaximized = layoutMode === "visualizer-full";

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 border-l border-slate-800 select-none overflow-hidden font-sans">
      {/* Pane Header: Exactly as wireframe: COMMAND PROMPT OR OUTPUT AREA */}
      <div className="h-10 sm:h-11 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wide hidden sm:inline">
            COMMAND PROMPT
          </span>
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wide sm:hidden">
            OUTPUT
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono hidden sm:inline">
            ON RUN MODE
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Switch to Code Visualize tab */}
          <button
            onClick={() => {
              setActiveTab("trace");
              setMobileTab("trace");
            }}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition cursor-pointer"
            title="Switch to Code Visualize"
          >
            <GoArrowSwitch className="w-3 h-3" />
            <span className="hidden sm:inline">Switch to Visualize</span>
            <span className="sm:hidden">Visualize</span>
          </button>

          {/* Copy Output */}
          <button
            onClick={handleCopy}
            disabled={!runOutput}
            title="Copy Output"
            className="p-1 sm:p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Clear Output */}
          <button
            onClick={handleClear}
            disabled={!runOutput}
            title="Clear Output"
            className="p-1 sm:p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="hidden md:block w-[1px] h-4 bg-slate-800 mx-0.5" />

          {/* Maximize / Restore button (marked as "maximiz" in SVG wireframe!) - desktop only */}
          <button
            onClick={() =>
              setLayoutMode(isMaximized ? "split" : "visualizer-full")
            }
            title={isMaximized ? "Restore Split View" : "Maximize Output Area"}
            className="hidden md:flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal / Command Prompt Canvas */}
      <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto select-text leading-relaxed">
        {/* Shell Greeting */}
        <div className="text-slate-500 text-[11px] mb-3 select-none">
          TRACELAP Python Interactive Environment [Python 3.12.10 on Windows]
          <br />
          Type code in WORKSPACE and click RUN to execute.
        </div>

        {/* Command Line Prompt */}
        <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-2">
          <span className="text-indigo-400">learner@tracelap:~/workspace$</span>
          <span className="text-slate-200">python main.py</span>
        </div>

        {/* Loading State */}
        {isRunning && (
          <div className="flex items-center space-x-2 text-amber-300 my-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Executing Python program in sandbox...</span>
          </div>
        )}

        {/* If Not Run Yet */}
        {!isRunning && !runOutput && (
          <div className="my-8 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/30">
            <Terminal className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-slate-400 text-xs max-w-sm mb-4">
              Ready to execute. Click{" "}
              <strong className="text-emerald-400">RUN</strong> in the top
              header to run your code and display output here.
            </p>
            <button
              onClick={() => runOnly()}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-emerald-950"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run</span>
            </button>
          </div>
        )}

        {/* Program Standard Output */}
        {!isRunning && runOutput && (
          <div className="space-y-3">
            {runOutput.stdout ? (
              <div className="text-slate-100 whitespace-pre-wrap font-mono pl-1">
                {runOutput.stdout}
              </div>
            ) : (
              !runOutput.stderr && (
                <div className="text-slate-500 italic pl-1">
                  (Program produced no stdout output. Use print(...) to see
                  messages here.)
                </div>
              )
            )}

            {/* Program Error (if any) */}
            {runOutput.stderr && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 font-mono text-xs whitespace-pre-wrap flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-300 mb-1">
                    Execution Error:
                  </div>
                  <div>{runOutput.stderr}</div>
                </div>
              </div>
            )}

            {/* Execution Footer Summary */}
            <div className="pt-3 sm:pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-slate-500 select-none">
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                {runOutput.isSuccess ? (
                  <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Process finished with exit code 0</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Process terminated with error</span>
                  </span>
                )}
                <span>&bull;</span>
                <span>Time: {runOutput.timeMs} ms</span>
                <span>&bull;</span>
                <span>Lines: {code.split("\n").length}</span>
              </div>

              {/* Jump to Visualizer Button */}
              <button
                onClick={() => {
                  setActiveTab("trace");
                  setMobileTab("trace");
                }}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-semibold transition cursor-pointer"
              >
                <span>Inspect in Code Visualize &rarr;</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
