import React from "react";
import type { TraceStep, FrameSnapshot, HeapObject } from "../../types/trace";
import type { EmbeddedDiagramAnnotations } from "../../utils/diagramAnnotations";
import {
  FloatingCalculationComment,
  FloatingAliasingComment,
  FloatingActionComment,
} from "./HoveringCalculationComment";
import { RecursiveTreeView } from "./RecursiveTreeView";
import { buildRecursiveTreeHierarchy } from "../../utils/treeBuilder";
import {
  Layers,
  Database,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CornerDownLeft,
  Zap,
  Scale,
  CornerDownRight,
  Minimize2,
  Maximize2,
  GitBranch,
  Trash2,
  GripVertical,
} from "lucide-react";

interface MemoryVisualizationProps {
  currentStep: TraceStep | null;
  prevStep: TraceStep | null;
  annotations: EmbeddedDiagramAnnotations;
}

// Distinct color themes for each stack block (frame)
interface StackBlockTheme {
  border: string;
  activeBorder: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  ring: string;
  shadow: string;
}

const STACK_BLOCK_THEMES: StackBlockTheme[] = [
  {
    // Block 0: Indigo / Blue (Default for Global Scope)
    border: "border-indigo-500/20",
    activeBorder: "border-indigo-500/40",
    headerBg: "bg-indigo-950/40",
    headerBorder: "border-indigo-500/20",
    headerText: "text-indigo-200",
    badgeBg: "bg-indigo-950/80",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/30",
    ring: "ring-1 ring-indigo-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 1: Cyan / Light Blue
    border: "border-cyan-500/20",
    activeBorder: "border-cyan-500/40",
    headerBg: "bg-cyan-950/40",
    headerBorder: "border-cyan-500/20",
    headerText: "text-cyan-200",
    badgeBg: "bg-cyan-950/80",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/30",
    ring: "ring-1 ring-cyan-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 2: Purple / Violet
    border: "border-purple-500/20",
    activeBorder: "border-purple-500/40",
    headerBg: "bg-purple-950/40",
    headerBorder: "border-purple-500/20",
    headerText: "text-purple-200",
    badgeBg: "bg-purple-950/80",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    ring: "ring-1 ring-purple-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 3: Emerald / Green
    border: "border-emerald-500/20",
    activeBorder: "border-emerald-500/40",
    headerBg: "bg-emerald-950/40",
    headerBorder: "border-emerald-500/20",
    headerText: "text-emerald-200",
    badgeBg: "bg-emerald-950/80",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    ring: "ring-1 ring-emerald-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 4: Amber / Warm Gold
    border: "border-amber-500/20",
    activeBorder: "border-amber-500/40",
    headerBg: "bg-amber-950/40",
    headerBorder: "border-amber-500/20",
    headerText: "text-amber-200",
    badgeBg: "bg-amber-950/80",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    ring: "ring-1 ring-amber-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 5: Pink / Rose
    border: "border-pink-500/20",
    activeBorder: "border-pink-500/40",
    headerBg: "bg-pink-950/40",
    headerBorder: "border-pink-500/20",
    headerText: "text-pink-200",
    badgeBg: "bg-pink-950/80",
    badgeText: "text-pink-300",
    badgeBorder: "border-pink-500/30",
    ring: "ring-1 ring-pink-500/15",
    shadow: "shadow-slate-950/40",
  },
  {
    // Block 6: Teal
    border: "border-teal-500/20",
    activeBorder: "border-teal-500/40",
    headerBg: "bg-teal-950/40",
    headerBorder: "border-teal-500/20",
    headerText: "text-teal-200",
    badgeBg: "bg-teal-950/80",
    badgeText: "text-teal-300",
    badgeBorder: "border-teal-500/30",
    ring: "ring-1 ring-teal-500/15",
    shadow: "shadow-slate-950/40",
  },
];

// Helper to evaluate recursive expressions (e.g., 2 × factorial(1) -> 2 × 1 = 2)
interface RecursiveEvaluationInfo {
  pendingExpression?: string;
  evaluatedCalculation?: string;
  waitingFor?: string;
}

function formatFrameRecursiveEvaluation(
  frame: FrameSnapshot,
  returnedChildren: FrameSnapshot[],
  waitingChildren: FrameSnapshot[]
): RecursiveEvaluationInfo {
  const funcName = frame.function_name;
  const isGlobal =
    funcName === "<module>" || funcName.toLowerCase().includes("global");
  if (isGlobal) return {};

  const callerCode = (frame.caller_code || "").trim();
  const localVars = frame.local_vars || {};
  const nVal = localVars["n"]?.value_repr;

  // 1. If currently waiting for children
  let waitingFor: string | undefined = undefined;
  if (waitingChildren.length > 0) {
    const nextChild = waitingChildren[0];
    const childArgs = Object.values(nextChild.args || {}).join(", ");
    waitingFor = `${nextChild.function_name}(${childArgs || ""})`;
  }

  // 2. Pending expression (e.g. 2 × factorial(1))
  let pendingExpression: string | undefined = undefined;
  if (waitingFor) {
    if (nVal && (callerCode.includes("*") || funcName.toLowerCase().includes("fact"))) {
      pendingExpression = `${nVal} × ${waitingFor}`;
    } else if (callerCode.includes("+") || funcName.toLowerCase().includes("fib")) {
      const returnedVal = returnedChildren.length > 0 ? returnedChildren[0].return_value : "?";
      pendingExpression = `${returnedVal} + ${waitingFor}`;
    } else {
      pendingExpression = `${waitingFor}`;
    }
  }

  // 3. Evaluated calculation after child returns (e.g. 2 × 1 = 2)
  let evaluatedCalculation: string | undefined = undefined;
  if (returnedChildren.length > 0) {
    if (funcName.toLowerCase().includes("fact") || callerCode.includes("*")) {
      const childRet = returnedChildren[0]?.return_value;
      if (nVal && childRet) {
        const product = Number(nVal) * Number(childRet);
        const res = isNaN(product) ? frame.return_value : product;
        evaluatedCalculation = `${nVal} × ${childRet} = ${res || frame.return_value}`;
      }
    } else if (funcName.toLowerCase().includes("fib") || callerCode.includes("+")) {
      if (returnedChildren.length === 1) {
        const val1 = returnedChildren[0]?.return_value;
        evaluatedCalculation = `${val1} + ?`;
      } else if (returnedChildren.length >= 2) {
        const val1 = returnedChildren[0]?.return_value;
        const val2 = returnedChildren[1]?.return_value;
        const sum = Number(val1) + Number(val2);
        const res = isNaN(sum) ? frame.return_value : sum;
        evaluatedCalculation = `${val1} + ${val2} = ${res || frame.return_value}`;
      }
    } else if (frame.return_value) {
      const childParts = returnedChildren.map(c => `${c.function_name}() → ${c.return_value}`).join(", ");
      evaluatedCalculation = `${childParts} => return ${frame.return_value}`;
    }
  }

  return { pendingExpression, evaluatedCalculation, waitingFor };
}

export const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({
  currentStep,
  annotations,
}) => {
  const [isHeapCollapsed, setIsHeapCollapsed] = React.useState(false);
  const [userViewMode, setUserViewMode] = React.useState<"tree" | "stack" | null>(null);

  // Responsive Draggable Split between Stack (left) and Heap (right)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [stackPercent, setStackPercent] = React.useState<number>(() => {
    const saved = localStorage.getItem("tracelap_stack_heap_split");
    return saved ? Math.min(85, Math.max(35, Number(saved))) : 68;
  });
  const [isDraggingSplit, setIsDraggingSplit] = React.useState(false);

  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(true);
  };

  React.useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPercent = Math.max(35, Math.min(85, (relativeX / rect.width) * 100));
      setStackPercent(Math.round(newPercent));
      localStorage.setItem("tracelap_stack_heap_split", Math.round(newPercent).toString());
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  // Active stack frames in Python's runtime right now
  const activeFrames = currentStep?.frames || [];
  const activeStackIds = new Set(
    activeFrames.map((f) => f.frame_id || f.call_id)
  );

  // The leaf frame currently executing (top of active stack)
  const activeLeafFrame =
    activeFrames.length > 0 ? activeFrames[activeFrames.length - 1] : null;

  // Render all frames (active + completed/returned) to maintain full traceable history
  const allFrames =
    currentStep?.all_frames && currentStep.all_frames.length > 0
      ? currentStep.all_frames
      : activeFrames;

  const heapEntries = Object.entries(currentStep?.heap || {});

  // Map object ID to variables referencing it
  const objectReferrers: Record<string, string[]> = {};
  allFrames.forEach((frame) => {
    Object.entries(frame.local_vars || {}).forEach(([vName, vSnap]) => {
      if (vSnap.is_pointer && vSnap.object_id) {
        if (!objectReferrers[vSnap.object_id]) {
          objectReferrers[vSnap.object_id] = [];
        }
        if (!objectReferrers[vSnap.object_id].includes(vName)) {
          objectReferrers[vSnap.object_id].push(vName);
        }
      }
    });
  });


  const { roots, hasBranching } = React.useMemo(() => {
    if (!currentStep) return { roots: [], hasBranching: false };
    return buildRecursiveTreeHierarchy(allFrames, currentStep);
  }, [allFrames, currentStep]);

  // If user hasn't explicitly chosen, auto-select "tree" if branching recursion is detected
  const activeViewMode = userViewMode ?? (hasBranching ? "tree" : "stack");

  if (!currentStep) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col md:flex-row items-start w-full gap-3 md:gap-1.5 my-1 select-none relative"
    >
      {/* 1. CALL STACK & TREE (Takes stackPercent e.g. ~68% by default, or 100% when Heap is collapsed) */}
      <div
        style={
          isMobile
            ? { width: "100%" }
            : {
                width: isHeapCollapsed ? "calc(100% - 44px)" : `${stackPercent}%`,
              }
        }
        className="flex flex-col space-y-2.5 rounded-2xl border-2 border-indigo-500/50 bg-slate-900/30 p-2.5 shadow-xl shadow-indigo-950/20 ring-1 ring-indigo-500/20 transition-all duration-150 min-w-0 md:min-w-[280px] w-full"
      >
        {/* Section Header with Frame Count, Mode Toggle & Tree Info */}
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-1.5 flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold tracking-wider text-indigo-300 uppercase min-w-0">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              {activeViewMode === "tree" ? "RECURSIVE CALL TREE" : "CALL STACK TRACE"}
            </span>
            {hasBranching && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/50 shrink-0">
                <span className="hidden sm:inline">BRANCHING RECURSION</span>
                <span className="sm:hidden">BRANCHING</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle: Tree View vs Stack View */}
            <div className="flex items-center space-x-1 border border-indigo-500/40 rounded-lg p-0.5 bg-slate-950/80">
              <button
                onClick={() => setUserViewMode("tree")}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                  activeViewMode === "tree"
                    ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Switch to True Recursive Tree View (Branching Hierarchy)"
              >
                <GitBranch className="w-3 h-3" />
                <span>Tree View</span>
              </button>
              <button
                onClick={() => setUserViewMode("stack")}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                  activeViewMode === "stack"
                    ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Switch to Linear Vertical Stack View"
              >
                <Layers className="w-3 h-3" />
                <span>Stack View</span>
              </button>
            </div>

            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-semibold shadow-sm">
              {activeFrames.length} Active / {allFrames.length} Total
            </span>
          </div>
        </div>

        {/* Render either True Recursive Tree View or Linear Stack View */}
        {activeViewMode === "tree" ? (
          <RecursiveTreeView roots={roots} currentStepIndex={currentStep.step_index} />
        ) : allFrames.length === 0 ? (
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-500 text-center">
            No active stack frames
          </div>
        ) : (
          <div className="space-y-2">
            {allFrames.map((frame: FrameSnapshot, idx: number) => {
              const theme = STACK_BLOCK_THEMES[idx % STACK_BLOCK_THEMES.length];
              const frameId = frame.frame_id || frame.call_id;
              const fnName = frame.function_name || "";
              const isGlobal =
                fnName === "<module>" ||
                fnName.toLowerCase().includes("global");
              const frameTitle = isGlobal
                ? "GLOBAL SCOPE"
                : `${fnName}()`;
              const varEntries = Object.entries(frame.local_vars || {});

              // Find caller / parent frame
              const parentFrame = allFrames.find(
                (p) =>
                  p.frame_id === frame.parent_call_id ||
                  p.call_id === frame.parent_call_id
              );

              // Find children frames called by this frame
              const children = allFrames.filter(
                (c) =>
                  c.parent_call_id === frame.call_id ||
                  c.parent_call_id === frame.frame_id
              );
              const returnedChildren = children.filter(
                (c) => c.return_value != null
              );
              const waitingChildren = children.filter(
                (c) =>
                  activeStackIds.has(c.frame_id || c.call_id) &&
                  c.return_value == null
              );

              // Determine Frame Visual State
              const isActiveOnStack = activeStackIds.has(frameId);
              const isLeaf =
                frameId ===
                (activeLeafFrame?.frame_id || activeLeafFrame?.call_id);

              const isReturningNow =
                isLeaf &&
                (currentStep.event_type === "return" ||
                  (Boolean(currentStep.step_code?.startsWith("return")) &&
                    frame.return_value != null));

              const isReturned = !isActiveOnStack && frame.return_value != null;
              const isWaiting = isActiveOnStack && !isLeaf && !isReturningNow;

              const frameStatus = isReturningNow
                ? "RETURNING"
                : isReturned
                ? "RETURNED"
                : isWaiting
                ? "WAITING"
                : "ACTIVE";

              // Recursive evaluation info for this frame
              const recEval = formatFrameRecursiveEvaluation(
                frame,
                returnedChildren,
                waitingChildren
              );

              // Check embedded frame annotations
              const callAnn =
                frameId && annotations.callByFrame
                  ? annotations.callByFrame[frameId]
                  : undefined;
              const condAnn =
                frameId && annotations.conditionByFrame
                  ? annotations.conditionByFrame[frameId]
                  : undefined;

              // Tree depth calculation for indentation and connectors
              const depthLevel = Math.max(0, frame.depth ?? 0);
              const indentPx = isMobile
                ? Math.min(depthLevel, 3) * 8
                : Math.min(depthLevel, 5) * 16;

              return (
                <React.Fragment key={frameId || idx}>
                  {/* TREE BRANCH GUIDE CONNECTOR (for recursive/child frames) */}
                  {depthLevel > 0 && (
                    <div
                      style={{
                        marginLeft: `${indentPx}px`,
                        maxWidth: indentPx > 0 ? `calc(100% - ${indentPx}px)` : "100%",
                      }}
                      className="w-full flex items-center space-x-1.5 pt-0.5 pb-0.5 text-[10px] font-mono text-indigo-400/90 select-none"
                    >
                      <CornerDownRight className="w-3 h-3 text-indigo-400 stroke-[2.5] shrink-0" />
                      <span className="px-1.5 py-0.2 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 font-bold">
                        Tree Depth {depthLevel}
                      </span>
                      {parentFrame && (
                        <span className="text-slate-500 text-[10px] truncate">
                          ↳ called by {parentFrame.function_name || "caller"}()
                        </span>
                      )}
                    </div>
                  )}

                  {/* ANIMATED GREEN RETURN ARROW (Rendered directly above child frame pointing UPWARD to parent) */}
                  {frame.return_value != null && parentFrame && (
                    <div
                      style={{
                        marginLeft: `${indentPx}px`,
                        maxWidth: indentPx > 0 ? `calc(100% - ${indentPx}px)` : "100%",
                      }}
                      className="w-full relative py-1 flex flex-col items-center justify-center select-none my-0.5"
                    >
                      {/* Upward Connecting Line */}
                      <div className="absolute inset-y-0 w-0.5 bg-emerald-500/40" />

                      {/* Return Badge carrying the return value */}
                      <div
                        className={`relative z-10 flex items-center space-x-2 px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold shadow-md transition-all ${
                          isReturningNow
                            ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/50 return-badge-glow animate-return-arrow"
                            : "bg-slate-950/95 border-emerald-500/50 text-emerald-300 hover:border-emerald-400"
                        }`}
                        title={`Returning value ${frame.return_value} from ${frame.function_name || "function"}() to caller ${parentFrame.function_name || "caller"}()`}
                      >
                        {/* Upward Green Arrow */}
                        <span className="flex items-center space-x-1 text-emerald-400">
                          {isReturningNow ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          )}
                          <ArrowUp className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                        </span>

                        <span className="text-slate-400 text-[10px] font-normal">
                          return
                        </span>
                        <span className="text-emerald-200 font-extrabold text-xs bg-emerald-900/60 px-1.5 py-0.2 rounded border border-emerald-500/40">
                          {frame.return_value}
                        </span>

                        <span className="text-emerald-400/80 text-[10px] font-sans">
                          → to {parentFrame.function_name || "caller"}() [D{Math.max(0, depthLevel - 1)}]
                        </span>

                        {isReturningNow && (
                          <span className="text-[8px] uppercase px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 border border-emerald-400/70 font-sans tracking-wide">
                            unwinding
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STACK FRAME BLOCK */}
                  <div
                    id={isLeaf && (isActiveOnStack || isReturningNow) ? "active-stack-frame" : undefined}
                    data-is-global={isGlobal ? "true" : "false"}
                    style={{
                      marginLeft: `${indentPx}px`,
                      maxWidth: indentPx > 0 ? `calc(100% - ${indentPx}px)` : "100%",
                    }}
                    className={`w-full rounded-xl border transition-all duration-200 shadow-sm ${theme.shadow} ${
                      frameStatus === "RETURNING"
                        ? "border border-emerald-500/40 bg-slate-900/95 ring-1 ring-emerald-500/20 shadow-md opacity-100"
                        : frameStatus === "ACTIVE"
                        ? `${theme.activeBorder} bg-slate-900/90 ${theme.ring} opacity-100 ${
                            isLeaf ? "ring-2 ring-emerald-400/40" : ""
                          }`
                        : frameStatus === "WAITING"
                        ? "border border-amber-500/30 bg-slate-900/70 ring-1 ring-amber-500/15 opacity-100"
                        : frameStatus === "RETURNED"
                        ? "border border-rose-500/35 bg-slate-950/70 ring-1 ring-rose-500/15 opacity-65 hover:opacity-90"
                        : "border-slate-800/70 bg-slate-950/60 opacity-65 hover:opacity-95"
                    }`}
                  >
                    {/* Frame Header (Compact height) */}
                    <div
                      className={`px-2.5 py-1.5 border-b ${
                        frameStatus === "RETURNING"
                          ? "border-emerald-500/20 bg-emerald-950/50"
                          : frameStatus === "WAITING"
                          ? "border-amber-500/20 bg-amber-950/30"
                          : frameStatus === "RETURNED"
                          ? "border-rose-500/20 bg-rose-950/30"
                          : `${theme.headerBorder} ${theme.headerBg}`
                      } flex items-center justify-between rounded-t-[10px] flex-wrap gap-1.5`}>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {depthLevel > 0 && (
                          <span
                            className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border ${
                              frameStatus === "RETURNED"
                                ? "bg-rose-950/90 text-rose-300 border-rose-500/50"
                                : "bg-slate-950/80 text-indigo-300 border-indigo-500/40"
                            }`}
                          >
                            D{depthLevel}
                          </span>
                        )}

                        <span
                          className={`font-mono text-xs font-bold ${
                            frameStatus === "RETURNING"
                              ? "text-emerald-200"
                              : frameStatus === "WAITING"
                              ? "text-amber-200"
                              : frameStatus === "RETURNED"
                              ? "text-rose-200"
                              : theme.headerText
                          }`}
                        >
                          {frameTitle}
                        </span>

                        {/* Visual Status Badges */}
                        {frameStatus === "RETURNING" && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold flex items-center space-x-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                            <span>↩ RETURNING</span>
                          </span>
                        )}

                        {frameStatus === "WAITING" && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 font-bold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                            <span>⏳ WAITING</span>
                          </span>
                        )}

                        {frameStatus === "ACTIVE" && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} font-bold flex items-center space-x-1`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            <span>● ACTIVE</span>
                          </span>
                        )}

                        {frameStatus === "RETURNED" && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 font-bold flex items-center space-x-1 shadow-sm">
                            <Trash2 className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                            <span>DELETED FROM STACK</span>
                          </span>
                        )}

                        {/* Square Box for Call Site / Recursion */}
                        {frame.caller_line_number && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm font-bold flex items-center space-x-1 border shadow-sm ${
                              frame.is_recursion
                                ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-950/40"
                                : "bg-purple-950/80 border-purple-400/80 text-purple-300 shadow-purple-950/30"
                            }`}
                            title={`Called from Line ${frame.caller_line_number}${
                              frame.caller_code ? `: ${frame.caller_code}` : ""
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-xs inline-block shrink-0 ${
                                frame.is_recursion ? "bg-rose-400" : "bg-purple-400"
                              }`}
                            />
                            <span>
                              {frame.is_recursion ? "REC:" : "CALL:"} L{frame.caller_line_number}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Header Return Tag */}
                      {frame.return_value && (
                        <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/50 font-bold flex items-center space-x-1 shadow-sm shrink-0">
                          <CornerDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                          <span>ret {frame.return_value}</span>
                        </span>
                      )}
                    </div>

                    {/* Frame Body (Compact padding: p-2 space-y-1.5) */}
                    <div className="p-2 space-y-1.5">
                      {/* 1. CALLER BLOCK UPDATE: Show Waiting state & Pending Expression */}
                      {frameStatus === "WAITING" && (
                        <div className="p-1.5 px-2 rounded-lg bg-amber-950/30 border border-amber-500/40 font-mono text-[11px] space-y-1 animate-in fade-in duration-150">
                          <div className="text-[9px] font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>WAITING FOR RECURSIVE CHILD</span>
                          </div>
                          {recEval.waitingFor && (
                            <div className="text-slate-300 text-[11px]">
                              waiting for:{" "}
                              <span className="text-amber-200 font-bold">
                                {recEval.waitingFor}
                              </span>
                            </div>
                          )}
                          {recEval.pendingExpression && (
                            <div className="text-slate-400 text-[10px] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                              expression:{" "}
                              <span className="text-amber-300 font-bold">
                                {recEval.pendingExpression}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. CALLER BLOCK UPDATE: Received Return Values & Substituted Calculation */}
                      {returnedChildren.length > 0 && (
                        <div className="p-1.5 px-2 rounded-lg bg-emerald-950/25 border border-emerald-500/40 font-mono text-[11px] space-y-1 animate-in fade-in duration-200">
                          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>RECEIVED RETURN VALUES</span>
                          </div>

                          {/* Each returned child function and value */}
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {returnedChildren.map((child) => (
                              <div
                                key={child.call_id || child.frame_id}
                                className="flex items-center space-x-1 text-slate-200 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800"
                              >
                                <span className="text-purple-300 font-semibold">
                                  {child.function_name}(
                                  {Object.values(child.args || {}).join(", ")})
                                </span>
                                <span className="text-slate-500">→</span>
                                <span className="text-emerald-300 font-extrabold bg-emerald-950 px-1 py-0.2 rounded border border-emerald-500/40">
                                  {child.return_value}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Evaluated Calculation (e.g., 2 × 1 = 2) */}
                          {recEval.evaluatedCalculation && (
                            <div className="text-[11px] pt-1 border-t border-emerald-500/20 text-emerald-200 font-bold flex items-center space-x-1.5">
                              <span className="text-slate-400 text-[9px] uppercase font-sans">
                                evaluation:
                              </span>
                              <span className="bg-slate-950/90 px-1.5 py-0.2 rounded border border-emerald-500/40 text-emerald-300 font-mono">
                                {recEval.evaluatedCalculation}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EMBEDDED: Function Call Transition (Purple) */}
                      {callAnn && (
                        <div className="relative p-1.5 px-2 rounded-lg bg-purple-950/40 border border-purple-500/40 text-[11px] font-mono space-y-1">
                          <div className="absolute -top-1 left-4 w-1.5 h-1.5 bg-slate-950 border-t border-l border-purple-500/40 rotate-45" />
                          <div className="text-[9px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <span>
                              {callAnn.isRecursion || frame.is_recursion
                                ? "RECURSIVE CALL"
                                : "FUNCTION CALL"}
                              : {callAnn.fnName}()
                            </span>
                          </div>

                          {/* Square Box for Calling Line */}
                          {(frame.caller_line_number ||
                            callAnn.callerLineNumber ||
                            callAnn.callerLine) && (
                            <div className="flex items-center space-x-1.5 text-[10px] bg-slate-950/80 border border-purple-500/50 rounded-sm p-1">
                              <span
                                className={`w-2 h-2 rounded-xs shrink-0 ${
                                  callAnn.isRecursion || frame.is_recursion
                                    ? "bg-rose-400"
                                    : "bg-purple-400"
                                }`}
                              />
                              <span
                                className={`font-bold ${
                                  callAnn.isRecursion || frame.is_recursion
                                    ? "text-rose-300"
                                    : "text-purple-300"
                                }`}
                              >
                                {callAnn.isRecursion || frame.is_recursion
                                  ? "Recursion Site:"
                                  : "Call Site:"}
                              </span>
                              {(frame.caller_line_number ||
                                callAnn.callerLineNumber) && (
                                <span className="px-1 py-0.2 bg-purple-950 border border-purple-400 text-purple-200 font-bold rounded-xs">
                                  Line{" "}
                                  {frame.caller_line_number ||
                                    callAnn.callerLineNumber}
                                </span>
                              )}
                              {callAnn.callerLine && (
                                <span className="text-slate-300 truncate">
                                  {callAnn.callerLine}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="text-[10px] text-purple-200/90 pt-0.5">
                            {callAnn.explanation}
                          </div>
                        </div>
                      )}

                      {/* EMBEDDED: Condition Evaluation (Yellow) */}
                      {condAnn && (
                        <div className="relative p-1.5 px-2 rounded-lg bg-yellow-950/30 border border-yellow-500/40 font-mono text-[11px] space-y-0.5">
                          <div className="absolute -top-1 left-4 w-1.5 h-1.5 bg-slate-950 border-t border-l border-yellow-500/40 rotate-45" />
                          <div className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <Scale className="w-2.5 h-2.5 text-yellow-400" />
                            <span>CONDITION EVALUATED</span>
                          </div>
                          {condAnn.operands.map((op) => (
                            <div
                              key={op.name}
                              className="text-slate-300 text-[10px]"
                            >
                              <span className="text-slate-400">{op.name}</span> →{" "}
                              <span className="text-emerald-300 font-semibold">
                                {op.value}
                              </span>
                            </div>
                          ))}
                          <div className="text-slate-300 text-[10px] pt-0.5">
                            condition →{" "}
                            <span className="text-slate-200">
                              {condAnn.substitutedExpr}
                            </span>
                          </div>
                          <div className="text-emerald-400 font-bold text-[10px]">
                            → TRUE
                          </div>
                          <div className="text-yellow-200 text-[10px] font-sans pt-0.5">
                            → {condAnn.branchTaken}
                          </div>
                        </div>
                      )}

                      {/* Variables in Frame (Compact Single-Line Rows) */}
                      <div className="space-y-1 font-mono text-xs">
                        {varEntries.length === 0 ? (
                          <div className="text-[10px] text-slate-500 italic py-0.5 text-center">
                            (no local variables)
                          </div>
                        ) : (
                          varEntries.map(([vName, vSnap]) => {
                            const isTarget =
                              vName === annotations.activeVarName ||
                              vSnap.is_changed;
                            const calc = annotations.calculationByVar
                              ? annotations.calculationByVar[vName]
                              : undefined;
                            const alias = annotations.aliasingByVar
                              ? annotations.aliasingByVar[vName]
                              : undefined;
                            const varAction = annotations.variableActionByVar
                              ? annotations.variableActionByVar[vName]
                              : undefined;

                            return (
                              <div
                                key={vName}
                                className={`relative flex items-center justify-between px-2.5 py-1 rounded-md border transition-all ${
                                  isTarget
                                    ? "bg-slate-900/90 border-emerald-500/50 text-slate-100 ring-1 ring-emerald-500/30 shadow-sm"
                                    : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                                }`}
                              >
                                {/* Left: Variable Name with indicator */}
                                <div className="flex items-center space-x-1.5 min-w-0 max-w-[45%]">
                                  {isTarget ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400 shrink-0" />
                                  ) : (
                                    <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                                  )}
                                  <span className="font-mono text-xs font-bold text-slate-200 truncate">
                                    {vName}
                                  </span>
                                </div>

                                {/* Right: Value Repr + Floating Comment Trigger Pills */}
                                <div className="flex items-center space-x-1.5 min-w-0 justify-end flex-wrap sm:flex-nowrap">
                                  <span className="text-slate-600 text-[10px] shrink-0">
                                    →
                                  </span>

                                  {/* Value or Pointer Badge */}
                                  {vSnap.is_pointer && vSnap.object_id ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center space-x-1 shrink-0">
                                      <span>
                                        {vSnap.type_name === "list"
                                          ? "List"
                                          : vSnap.type_name === "dict"
                                          ? "Dict"
                                          : vSnap.type_name}
                                      </span>
                                      <span className="text-cyan-400/70">
                                        #{vSnap.object_id.slice(-4)}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="font-mono text-xs font-bold text-emerald-300 truncate max-w-[120px] sm:max-w-none">
                                      {vSnap.value_repr}
                                    </span>
                                  )}

                                  {/* Floating Calculation Comment */}
                                  {calc && (
                                    <FloatingCalculationComment
                                      calculation={calc}
                                      isCurrent={Boolean(
                                        calc.isCurrent || isTarget
                                      )}
                                    />
                                  )}

                                  {/* Floating Aliasing Comment */}
                                  {alias && (
                                    <FloatingAliasingComment alias={alias} />
                                  )}

                                  {/* Floating Variable Action Comment */}
                                  {varAction && !calc && !alias && (
                                    <FloatingActionComment
                                      varAction={varAction}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* 3. RETURN STATEMENT HIGHLIGHT (When Returning or Returned) */}
                      {frame.return_value && (
                        <div
                          className={`relative p-1.5 px-2 rounded-lg border text-xs font-mono space-y-0.5 transition-all ${
                            frameStatus === "RETURNING"
                              ? "bg-emerald-950/50 border-emerald-400 text-emerald-200 shadow-sm"
                              : "bg-slate-900/50 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                            <CornerDownLeft className="w-3 h-3 text-emerald-400" />
                            <span>
                              {frameStatus === "RETURNING"
                                ? "EXECUTING RETURN"
                                : "RETURN VALUE"}
                            </span>
                          </div>
                          <div className="text-emerald-200 font-bold text-xs flex items-center space-x-1.5">
                            <span className="text-[11px]">⮐ returns</span>
                            <span className="text-emerald-300 font-extrabold bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/50 text-xs">
                              {frame.return_value}
                            </span>
                            {parentFrame && (
                              <span className="text-slate-400 text-[10px] font-sans font-normal truncate">
                                to {parentFrame.function_name}()
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAGGABLE RESIZER AXIS / SPLITTER BETWEEN STACK AND HEAP */}
      {!isHeapCollapsed && (
        <div
          onMouseDown={handleSplitMouseDown}
          onDoubleClick={() => {
            setStackPercent(68);
            localStorage.setItem("tracelap_stack_heap_split", "68");
          }}
          title="Drag to resize Stack / Heap (Double-click to reset 68/32)"
          className={`no-drag group relative w-2.5 hover:w-3.5 self-stretch min-h-[160px] bg-slate-900/60 hover:bg-cyan-500/40 active:bg-cyan-500 transition-all cursor-col-resize select-none shrink-0 hidden md:flex items-center justify-center rounded-full mx-0.5 z-20 ${
            isDraggingSplit ? "bg-cyan-500 w-3.5 ring-2 ring-cyan-500/50" : ""
          }`}
        >
          {/* Visual Axis Indicator Pill */}
          <div className="w-3.5 h-8 rounded bg-slate-950/90 border border-slate-700 group-hover:border-cyan-400 flex items-center justify-center shadow-md group-hover:scale-110 transition pointer-events-none">
            <GripVertical className="w-2.5 h-2.5 text-slate-400 group-hover:text-cyan-300" />
          </div>

          {/* Tooltip on hover showing current split */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-slate-950 border border-cyan-500/50 text-[9px] font-mono font-bold text-cyan-300 shadow-xl pointer-events-none whitespace-nowrap">
            {stackPercent}% Stack / {100 - stackPercent}% Heap
          </div>
        </div>
      )}

      {/* 2. HEAP MEMORY (Added to the RIGHT of Stack on desktop, below on mobile) */}
      {isHeapCollapsed ? (
        isMobile ? (
          /* Mobile: Slim horizontal bar */
          <div
            onClick={() => setIsHeapCollapsed(false)}
            title="Expand Heap Memory panel"
            className="w-full flex items-center justify-between p-2.5 bg-slate-900/50 hover:bg-slate-900/90 border-2 border-cyan-500/40 rounded-xl cursor-pointer transition-all shadow-md group"
          >
            <div className="flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
              <span className="text-[11px] font-mono font-bold text-cyan-300 tracking-wider">
                HEAP MEMORY ({heapEntries.length} {heapEntries.length === 1 ? "Obj" : "Objs"})
              </span>
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300" />
          </div>
        ) : (
          /* Desktop: Collapsed slim rail on the right */
          <div
            onClick={() => setIsHeapCollapsed(false)}
            title="Expand Heap Memory panel"
            className="no-drag w-9 shrink-0 self-stretch min-h-[160px] flex flex-col items-center py-3 bg-slate-900/50 hover:bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl cursor-pointer transition-all shadow-lg shadow-cyan-950/20 group"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400 mb-2 group-hover:scale-110 transition" />
            <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-cyan-300 mb-3" />
            <div className="flex-1 flex items-center justify-center">
              <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-mono font-bold text-cyan-300/80 tracking-widest uppercase group-hover:text-cyan-200">
                HEAP MEMORY ({heapEntries.length})
              </span>
            </div>
          </div>
        )
      ) : (
        /* Expanded Heap on the right (desktop) or below (mobile) */
        <div
          style={
            isMobile
              ? { width: "100%" }
              : { width: `calc(${100 - stackPercent}% - 14px)` }
          }
          className="flex flex-col space-y-2 rounded-2xl border-2 border-cyan-500/50 bg-slate-900/30 p-2.5 shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/20 transition-all duration-150 min-w-0 md:min-w-[200px] w-full"
        >
          {/* Section Header with Object Count & Minimize Button */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 flex-wrap gap-1">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase min-w-0">
              <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">HEAP MEMORY</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold shadow-sm">
                {heapEntries.length} {heapEntries.length === 1 ? "Obj" : "Objs"}
              </span>
              <button
                onClick={() => setIsHeapCollapsed(true)}
                title="Collapse Heap to give Call Stack 100% width"
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Heap Content: 0 allocations vs objects */}
          {heapEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center rounded-xl border border-dashed border-cyan-500/20 bg-slate-950/40 min-h-[140px] space-y-1.5">
              <div className="w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shadow-sm">
                <Database className="w-3.5 h-3.5 text-cyan-400/80" />
              </div>
              <span className="font-mono text-xs font-bold text-cyan-300">
                0 Allocations
              </span>
              <p className="text-[10px] text-slate-400 font-sans max-w-[210px] leading-relaxed">
                All variables currently live on Call Stack. Objects (lists, dicts, instances) will appear here.
              </p>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-slate-700/60">
                Auto-Managed
              </span>
            </div>
          ) : (
            /* Heap Objects list */
            <div className="space-y-2">
            {heapEntries.map(([objId, obj]: [string, HeapObject]) => {
              const referrers = objectReferrers[objId] || [];
              const mutationAnn = annotations.mutationByObjectId
                ? annotations.mutationByObjectId[objId]
                : undefined;
              const isMutated = Boolean(
                mutationAnn || objId === annotations.activeObjectId
              );
              const objLabel = `${
                obj.type_name === "list"
                  ? "List"
                  : obj.type_name === "dict"
                  ? "Dict"
                  : obj.type_name
              } #${objId.slice(-4)}`;

              return (
                <div
                  key={objId}
                  className={`rounded-xl border transition-all duration-200 ${
                    isMutated
                      ? "border-amber-500/50 bg-slate-900/70 shadow-sm ring-1 ring-amber-500/30"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  {/* Object Header */}
                  <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      <span className="font-bold text-slate-200">
                        {objLabel}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {obj.type_name}
                      </span>
                    </div>

                    {/* Referrers badge */}
                    {referrers.length > 0 && (
                      <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-400">
                        <span className="text-slate-500">ref:</span>
                        <span className="text-cyan-300 font-semibold truncate max-w-[80px]">
                          {referrers.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Object Value Content */}
                  <div className="p-2 space-y-1.5">
                    {/* Live Representation */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 font-mono text-xs text-slate-200 break-all leading-relaxed">
                      {obj.repr_value}
                    </div>

                    {/* EMBEDDED: In-Place Mutation Breakdown (Amber Speech Bubble) */}
                    {mutationAnn && (
                      <div className="relative p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 font-mono text-xs space-y-1">
                        <div className="absolute -top-1 left-4 w-1.5 h-1.5 bg-slate-950 border-t border-l border-amber-500/40 rotate-45" />
                        <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>⚡ {mutationAnn.methodName}</span>
                        </div>

                        {/* Before / After */}
                        <div className="space-y-0.5 my-0.5 text-[10px]">
                          <div className="text-slate-400">
                            <span className="text-slate-500 text-[8px] uppercase">
                              BEFORE:{" "}
                            </span>
                            {mutationAnn.beforeValue}
                          </div>
                          <div className="text-amber-400 text-center text-[9px] font-bold">
                            ↓ {mutationAnn.methodName}
                          </div>
                          <div className="text-amber-300 font-semibold">
                            <span className="text-amber-500 text-[8px] uppercase">
                              AFTER:{" "}
                            </span>
                            {mutationAnn.afterValue}
                          </div>
                        </div>

                        {/* Explanation */}
                        <p className="text-[10px] text-slate-200 font-sans leading-relaxed border-t border-slate-800/80 pt-1">
                          {mutationAnn.explanation}
                        </p>
                      </div>
                    )}

                    {/* Shared reference notice if multiple referrers */}
                    {referrers.length >= 2 && !mutationAnn && (
                      <div className="flex items-center space-x-1 text-[10px] text-cyan-300 font-sans">
                        <ArrowRight className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          Shared: <strong className="font-mono text-cyan-200">{referrers.join(" & ")}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
