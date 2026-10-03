import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useTraceStore } from "../../store/useTraceStore";
import { MemoryVisualization } from "./MemoryVisualization";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { extractDiagramAnnotations } from "../../utils/diagramAnnotations";
import {
  Maximize2,
  Minimize2,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
} from "lucide-react";

export const VisualizerPane: React.FC = () => {
  const {
    traceResult,
    currentStepIndex,
    isRunning,
    isPlaying,
    togglePlay,
    runTrace,
    stepForward,
    stepBackward,
    goToStep,
    layoutMode,
    setLayoutMode,
    setActiveTab,
    setMobileTab,
    error,
    playbackSpeed,
    setPlaybackSpeed,
  } = useTraceStore();

  // Auto-advance step when auto-playing
  useEffect(() => {
    if (!isPlaying || !traceResult) return;

    const intervalMs = Math.max(250, 1000 / playbackSpeed);
    const timer = setInterval(() => {
      if (currentStepIndex >= traceResult.steps.length - 1) {
        togglePlay(); // stop when reaching last step
      } else {
        stepForward();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isPlaying,
    playbackSpeed,
    traceResult,
    currentStepIndex,
    stepForward,
    togglePlay,
  ]);

  const currentStep = useMemo(() => {
    if (!traceResult || !traceResult.steps.length) return null;
    return traceResult.steps[currentStepIndex] || null;
  }, [traceResult, currentStepIndex]);

  const prevStep = useMemo(() => {
    if (!traceResult || currentStepIndex <= 0) return null;
    return traceResult.steps[currentStepIndex - 1] || null;
  }, [traceResult, currentStepIndex]);

  // Extract embedded in-diagram annotations & calculations
  const annotations = useMemo(() => {
    return extractDiagramAnnotations(
      currentStep,
      prevStep,
      traceResult?.steps,
      currentStepIndex,
    );
  }, [currentStep, prevStep, traceResult, currentStepIndex]);

  // Visualizer Pan and Zoom Canvas Navigation state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isPointerDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    panX: number;
    panY: number;
  }>({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Double click anywhere on empty canvas background resets pan & zoom
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='button'], .no-drag",
        )
      ) {
        return;
      }
      handleResetView();
    },
    [handleResetView],
  );

  // Mouse wheel zoom centered around mouse cursor (Ctrl / Meta + Wheel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom((prevZoom) => {
          const nextZoom = Math.min(
            2.0,
            Math.max(0.4, Math.round(prevZoom * factor * 100) / 100),
          );
          if (nextZoom === prevZoom) return prevZoom;

          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          setPan((prevPan) => {
            const contentX = (mouseX - prevPan.x) / prevZoom;
            const contentY = (mouseY - prevPan.y) / prevZoom;
            return {
              x: Math.round(mouseX - contentX * nextZoom),
              y: Math.round(mouseY - contentY * nextZoom),
            };
          });

          return nextZoom;
        });
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Free 2D Pan / Drag navigation
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.button !== 1) return;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='button'], .no-drag",
        )
      ) {
        return;
      }

      isPointerDownRef.current = true;
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan.x, pan.y],
  );

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPointerDownRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        setIsDragging(true);
      }

      setPan({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy),
      });
    };

    const handleGlobalMouseUp = () => {
      isPointerDownRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Touch drag navigation for mobile screens
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='button'], .no-drag",
        )
      ) {
        return;
      }
      isPointerDownRef.current = true;
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan.x, pan.y],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isPointerDownRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;

      // On mobile at 100% zoom (zoom === 1), allow normal smooth vertical scrolling without canvas displacement
      if (typeof window !== "undefined" && window.innerWidth < 768 && zoom === 1) {
        return;
      }

      if (!isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        setIsDragging(true);
      }

      setPan({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy),
      });
    },
    [isDragging, zoom],
  );

  const handleTouchEnd = useCallback(() => {
    isPointerDownRef.current = false;
    setIsDragging(false);
  }, []);

  // Auto-scroll to follow active stack frame both UP and DOWN seamlessly
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // If at step 0 or rewound to start, smoothly scroll to top
      if (currentStepIndex === 0) {
        if (container.scrollTop > 0) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      const activeEl = document.getElementById("active-stack-frame");
      if (!activeEl) {
        if (container.scrollTop > 0) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      // If the active frame is Global Scope (the root), scroll all the way to top
      const isGlobalScope = activeEl.getAttribute("data-is-global") === "true";
      if (isGlobalScope) {
        if (container.scrollTop > 0) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      // Top difference: negative means activeEl's top is cut off ABOVE the visible viewport
      const topDiff = elRect.top - containerRect.top;
      // Bottom difference: positive means activeEl's bottom extends BELOW the visible viewport
      const bottomDiff = elRect.bottom - containerRect.bottom;

      if (topDiff < 16) {
        // Active frame is scrolled above the visible area -> scroll UP smoothly
        const newScrollTop = Math.max(0, container.scrollTop + topDiff - 24);
        container.scrollTo({ top: newScrollTop, behavior: "smooth" });
      } else if (bottomDiff > -16) {
        // Active frame is scrolled below the visible area -> scroll DOWN smoothly
        const newScrollTop = container.scrollTop + bottomDiff + 28;
        container.scrollTo({ top: newScrollTop, behavior: "smooth" });
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [currentStepIndex, traceResult]);

  if (layoutMode === "editor-full") {
    return null;
  }

  const isLastStep =
    Boolean(traceResult && traceResult.steps.length > 0) &&
    currentStepIndex === (traceResult?.steps.length ?? 0) - 1;

  const isCurrentStepException =
    currentStep?.event_type === "exception" || Boolean(currentStep?.stderr);

  const isError = Boolean(
    (!traceResult || traceResult.steps.length === 0
      ? Boolean(error || traceResult?.error)
      : false) ||
    isCurrentStepException ||
    (isLastStep && Boolean(traceResult?.error || currentStep?.stderr)),
  );

  const errorMessage =
    currentStep?.stderr || traceResult?.error || error || "Execution stopped.";

  const isCompleted =
    Boolean(traceResult && traceResult.steps.length > 0) &&
    isLastStep &&
    !isError;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 border-l border-slate-800 relative select-none font-sans overflow-hidden">
      {/* 1. HEADER: Minimal & Clean */}
      <div className="h-10 sm:h-11 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wide hidden sm:inline">
            CODE VISUALIZE
          </span>
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wide hidden min-[380px]:inline sm:hidden">
            VISUALIZE
          </span>

          {/* Clean minimal status indicator */}
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            {isRunning ? (
              <span className="flex items-center space-x-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Tracing...</span>
              </span>
            ) : isPlaying ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>● Trace Active</span>
              </span>
            ) : isCompleted ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </span>
            ) : traceResult ? (
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>● Paused</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>● Ready</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Zoom and Pan Navigation Controls */}
          {Boolean(traceResult) && (
            <div className="flex items-center space-x-0.5 border border-slate-800 rounded-md bg-slate-950/80 px-1 py-0.5 shadow-sm">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.4}
                title="Zoom Out (Ctrl + Scroll Down)"
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <ZoomOut className="w-3 h-3" />
              </button>

              <button
                onClick={handleResetView}
                title="Click to reset Zoom (100%) and Pan"
                className="px-1 sm:px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-300 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer min-w-[34px] sm:min-w-[38px] text-center"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2.0}
                title="Zoom In (Ctrl + Scroll Up)"
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <ZoomIn className="w-3 h-3" />
              </button>

              {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                <button
                  onClick={handleResetView}
                  title="Reset View (Center & 100%)"
                  className="p-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer border-l border-slate-800 pl-1 ml-0.5"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Switch to Terminal / Output Area */}
          <button
            onClick={() => {
              setActiveTab("run");
              setMobileTab("output");
            }}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            title="Switch to Command Prompt or Output Area"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Output</span>
          </button>

          {/* Screen division maximize / full screen button - desktop only */}
          <div className="hidden md:flex items-center space-x-1 border border-slate-800 rounded bg-slate-950 px-1 py-0.5">
            {layoutMode === "visualizer-full" ? (
              <button
                onClick={() => setLayoutMode("split")}
                title="Restore Normal Split (50/50)"
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 p-0.5 cursor-pointer text-xs"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">split</span>
              </button>
            ) : (
              <button
                onClick={() => setLayoutMode("visualizer-full")}
                title="Full Screen Track View (Left: Line-by-Line Code Track, Right: Visualization & Minimized Heap)"
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer text-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-green-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BODY: Empty State, Error State, or Clean Visualization */}
      {!traceResult ? (
        /* EMPTY STATE: Clean and informative */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400 shadow-lg">
            <Play className="w-5 h-5 fill-indigo-400 ml-0.5" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-1">
            READY TO TRACE
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            Run your program to visualize:
          </p>
          <div className="text-xs text-slate-400 text-left font-mono space-y-1.5 mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800 max-w-xs w-full">
            <div className="flex items-center space-x-2">
              <span className="text-indigo-400">•</span>
              <span>Variables</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-indigo-400">•</span>
              <span>Functions</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-indigo-400">•</span>
              <span>Stack frames</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-indigo-400">•</span>
              <span>Objects &amp; References</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-indigo-400">•</span>
              <span>Output</span>
            </div>
          </div>
          <button
            onClick={() => runTrace()}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunning ? "Tracing..." : "Trace"}</span>
          </button>
        </div>
      ) : (
        /* ACTIVE VISUALIZATION AREA */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* STICKY TOP EXPLANATION BAR:
              Stays pinned and visible clearly at the top while Call Stack scrolls underneath */}
          {(isError ||
            (currentStep && currentStep.step_code) ||
            annotations.stepAction) && (
            <div className="shrink-0 px-4 pt-3 pb-2.5 bg-slate-950/95 backdrop-blur-md border-b border-indigo-500/20 z-20 space-y-2 shadow-lg shadow-slate-950/40">
              {/* Error Banner if execution failed */}
              {isError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 space-y-1.5 text-left">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      EXECUTION STOPPED — Line {currentStep?.line_number || 1}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-rose-200">
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Current Line Focus Banner */}
              {currentStep && currentStep.step_code && (
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between font-mono text-xs shadow-sm">
                  <div className="flex items-center space-x-2 overflow-hidden truncate">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 shrink-0">
                      LINE {currentStep.line_number}
                    </span>
                    <span className="text-indigo-200 font-semibold truncate">
                      {currentStep.step_code}
                    </span>
                  </div>

                  {currentStep.stdout && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0 ml-2 max-w-[120px] sm:max-w-none truncate">
                      stdout: {currentStep.stdout.trim()}
                    </span>
                  )}
                </div>
              )}

              {/* Step Action Floating Comment Banner */}
              {annotations.stepAction && (
                <div
                  className={`relative px-3.5 py-2.5 rounded-xl border ${annotations.stepAction.theme.bannerBg} ${annotations.stepAction.theme.bannerBorder} transition-all shadow-sm`}
                >
                  {/* Speech Bubble Pointer Caret (pointing up toward the code line) */}
                  <div
                    className={`absolute -top-1.5 left-7 w-3 h-3 bg-slate-950 border-t border-l ${annotations.stepAction.theme.caretBorder} rotate-45`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {/* Action Pill + Headline */}
                    <div className="flex items-center space-x-2 overflow-hidden font-mono min-w-0">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${annotations.stepAction.theme.badgeBg} ${annotations.stepAction.theme.badgeBorder} ${annotations.stepAction.theme.badgeText} shrink-0`}
                      >
                        {annotations.stepAction.badgeLabel}
                      </span>
                      <span className="font-semibold text-slate-100 truncate">
                        {annotations.stepAction.headline}
                      </span>
                    </div>

                    {/* Floating Speech-Bubble message */}
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${annotations.stepAction.theme.iconColor}`}
                      />
                      <span
                        className={`text-[11px] font-sans font-medium ${annotations.stepAction.theme.accentText} truncate`}
                      >
                        {annotations.stepAction.floatingComment}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scrollable & Pannable Visual Workspace */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            className={`flex-1 overflow-auto p-2 sm:p-4 relative select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* 2D Zoom & Pan Transform Stage */}
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                transformOrigin: "top left",
                transition: isDragging ? "none" : "transform 0.06s ease-out",
                minWidth: "100%",
                width: "100%",
              }}
              className="space-y-3 pb-8 w-full"
            >
              {/* EMBEDDED DIAGRAM: CALL STACK & HEAP / OBJECTS */}
              <MemoryVisualization
                currentStep={currentStep}
                prevStep={prevStep}
                annotations={annotations}
              />
            </div>
          </div>

          {/* Floating Canvas Navigation Hint Badge */}
          <div className="absolute bottom-16 right-4 pointer-events-none z-20 hidden md:flex items-center space-x-1.5 text-[10px] font-mono text-slate-500 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full border border-slate-800/80 shadow-md">
            <Move className="w-3 h-3 text-indigo-400/80" />
            <span>Drag to pan • Ctrl + wheel to zoom</span>
            {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
              <span className="text-indigo-300 font-semibold pl-1 border-l border-slate-700/80">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>

          {/* 3. EXECUTION TIMELINE / CONTROLS (Fixed Bottom) */}
          <ExecutionTimeline
            currentStepIndex={currentStepIndex}
            totalSteps={traceResult.steps.length}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onStepBackward={stepBackward}
            onStepForward={stepForward}
            onTogglePlay={togglePlay}
            onGoToStep={goToStep}
            onToggleSpeed={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
          />
        </div>
      )}
    </div>
  );
};
