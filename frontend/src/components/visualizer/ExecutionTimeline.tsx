import React from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

interface ExecutionTimelineProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onStepBackward: () => void;
  onStepForward: () => void;
  onTogglePlay: () => void;
  onGoToStep: (step: number) => void;
  onToggleSpeed: () => void;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onStepBackward,
  onStepForward,
  onTogglePlay,
  onGoToStep,
  onToggleSpeed,
}) => {
  if (totalSteps <= 0) return null;

  return (
    <div className="h-12 sm:h-14 border-t border-slate-800 bg-slate-900/90 backdrop-blur px-2.5 sm:px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Step Count */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-200">
          Step {currentStepIndex + 1}{" "}
          <span className="text-slate-500 font-normal">/ {totalSteps}</span>
        </span>
      </div>

      {/* Center: Clean Progress Scrubber */}
      <div className="flex-1 min-w-[60px] max-w-xs sm:max-w-md mx-2 sm:mx-4 flex items-center space-x-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStepIndex}
          onChange={(e) => onGoToStep(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all hover:bg-slate-700"
          title={`Step ${currentStepIndex + 1} of ${totalSteps}`}
        />
      </div>

      {/* Right: Compact Controls */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Back */}
        <button
          onClick={onStepBackward}
          disabled={currentStepIndex === 0 || isPlaying}
          title="Previous Step (Back)"
          className="flex items-center space-x-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition cursor-pointer text-xs font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Auto Play / Pause */}
        <button
          onClick={onTogglePlay}
          title={isPlaying ? "Pause Execution" : "Auto Play Step by Step"}
          className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition cursor-pointer ${
            isPlaying
              ? "bg-amber-600 hover:bg-amber-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Auto</span>
            </>
          )}
        </button>

        {/* Next */}
        <button
          onClick={onStepForward}
          disabled={currentStepIndex >= totalSteps - 1 || isPlaying}
          title="Next Step"
          className="flex items-center space-x-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition cursor-pointer text-xs font-medium"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Playback Speed toggle */}
        <button
          onClick={onToggleSpeed}
          title="Toggle Playback Speed (1x / 2x)"
          className="p-1 sm:p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer text-[10px] font-mono ml-0.5 sm:ml-1"
        >
          {playbackSpeed}x
        </button>
      </div>
    </div>
  );
};
