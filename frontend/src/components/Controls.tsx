import React, { useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { useTraceStore } from "../store/useTraceStore";

export const Controls: React.FC = () => {
  const {
    traceResult,
    currentStepIndex,
    isPlaying,
    playbackSpeed,
    stepForward,
    stepBackward,
    goToStep,
    togglePlay,
    setPlaybackSpeed,
    error,
  } = useTraceStore();

  const totalSteps = traceResult?.steps.length || 0;

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || !traceResult) return;

    const intervalMs = Math.max(250, 1000 / playbackSpeed);
    const timer = setInterval(() => {
      stepForward();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, traceResult, stepForward]);

  if (!traceResult) return null;

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 px-6 py-3 flex flex-col gap-2 z-20 shrink-0">
      {error && (
        <div className="flex items-center space-x-2 bg-red-950/50 border border-red-500/40 rounded-lg px-3 py-1.5 text-xs text-red-300 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* Left: Step navigation buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => goToStep(0)}
            disabled={currentStepIndex === 0}
            title="First Step"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={stepBackward}
            disabled={currentStepIndex === 0}
            title="Previous Step"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            disabled={currentStepIndex >= totalSteps - 1}
            title="Next Step"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => goToStep(totalSteps - 1)}
            disabled={currentStepIndex >= totalSteps - 1}
            title="Last Step"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Interactive Scrubber Slider */}
        <div className="flex-1 flex items-center space-x-3 max-w-xl">
          <span className="text-xs font-mono font-medium text-slate-400 whitespace-nowrap">
            Step {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStepIndex}
            onChange={(e) => goToStep(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />
        </div>

        {/* Right: Playback Speed */}
        <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
          <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {[0.5, 1, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                playbackSpeed === speed
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
