import React, { useState } from "react";
import { Sparkles, Terminal, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useTraceStore } from "../store/useTraceStore";

export const CaptionBox: React.FC = () => {
  const { traceResult, currentStepIndex } = useTraceStore();
  const [showConsole, setShowConsole] = useState(false);

  const currentStep = traceResult?.steps[currentStepIndex] || null;
  if (!currentStep) return null;

  const getEventBadge = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "call":
        return { label: "FUNCTION CALL", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
      case "return":
        return { label: "FUNCTION RETURN", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "exception":
        return { label: "EXCEPTION", color: "bg-red-500/20 text-red-300 border-red-500/40" };
      case "external":
        return { label: "EXTERNAL SYSTEM", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" };
      default:
        return { label: `LINE ${currentStep.line_number}`, color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  const badge = getEventBadge(currentStep.event_type);
  const mem = currentStep.memory;
  const memDeltaFormatted =
    mem.delta_bytes > 0
      ? `+${mem.delta_bytes} B`
      : mem.delta_bytes < 0
      ? `${mem.delta_bytes} B`
      : "0 B";

  return (
    <div className="bg-slate-900/90 border-t border-slate-800 px-6 py-2.5 z-20 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: AI Caption */}
        <div className="flex-1 flex items-start space-x-3">
          <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 mt-0.5 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono tracking-wider ${badge.color}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-100 leading-snug">
              {currentStep.caption || "Executing instruction..."}
            </p>
          </div>
        </div>

        {/* Right: Memory telemetry & Terminal toggle */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{(mem.current_bytes / 1024).toFixed(1)} KB</span>
            <span className={mem.delta_bytes > 0 ? "text-pink-400" : "text-slate-500"}>
              ({memDeltaFormatted})
            </span>
          </div>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>stdout</span>
            {showConsole ? (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal Drawer */}
      {showConsole && (
        <div className="mt-2.5 rounded-lg bg-black/80 border border-slate-800 p-3 font-mono text-xs text-emerald-400 max-h-32 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
            Program Standard Output
          </div>
          {currentStep.stdout ? (
            <pre className="whitespace-pre-wrap">{currentStep.stdout}</pre>
          ) : (
            <span className="text-slate-600 italic">(no output yet)</span>
          )}
          {currentStep.stderr && (
            <div className="mt-2 text-red-400 border-t border-slate-800 pt-1">
              <span className="text-[10px] uppercase font-bold text-red-500 block mb-0.5">
                stderr / Error:
              </span>
              <pre className="whitespace-pre-wrap">{currentStep.stderr}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
