import React, { useState } from "react";
import type {
  CalculationStep,
  AliasingAnnotation,
  VariableActionAnnotation,
} from "../../utils/diagramAnnotations";
import { Calculator, Pin, Sparkles, Link2, X } from "lucide-react";

// ==========================================
// 1. FLOATING CALCULATION COMMENT (Popover)
// ==========================================
interface FloatingCalculationCommentProps {
  calculation: CalculationStep;
  isCurrent?: boolean;
}

export const FloatingCalculationComment: React.FC<FloatingCalculationCommentProps> = ({
  calculation,
  isCurrent = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Floating popover only appears on hover or pin - never disturbs DOM flow!
  const showComment = isHovered || isPinned;

  return (
    <div className="relative inline-block">
      {/* Sleek Trigger Pill */}
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className={`px-2 py-0.5 rounded-md border text-[11px] font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
          isCurrent
            ? "bg-indigo-950/80 border-indigo-400/60 text-indigo-200 ring-1 ring-indigo-500/40 shadow-sm"
            : "bg-slate-900/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:text-slate-100"
        }`}
        title="Hover to view step-by-step calculation breakdown (click to pin)"
      >
        <Calculator
          className={`w-3 h-3 shrink-0 ${
            isCurrent ? "text-indigo-400" : "text-slate-400"
          }`}
        />
        <span className="font-semibold text-slate-200 truncate max-w-[130px]">
          {calculation.expressionWithValues}
        </span>
        <span className="text-slate-500">=</span>
        <span className="font-bold text-emerald-300 shrink-0">
          {calculation.result}
        </span>
      </button>

      {/* Floating Hovering Popover Card (Absolute Overlay on desktop, clean bottom sheet on mobile) */}
      {showComment && (
        <>
          {/* Subtle mobile backdrop to tap-to-dismiss */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(false);
              setIsHovered(false);
            }}
          />

          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed left-3 right-3 bottom-16 sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:absolute sm:w-80 sm:max-w-sm z-50 max-h-[70vh] overflow-y-auto bg-slate-950/98 backdrop-blur-md border border-indigo-500/60 rounded-xl p-3 shadow-2xl shadow-indigo-950/80 text-xs font-mono transition-all animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Top Speech Bubble Pointer Caret (desktop only) */}
            <div className="hidden sm:block absolute -top-1.5 right-6 w-3 h-3 bg-slate-950 border-t border-l border-indigo-500/60 rotate-45" />

            {/* Comment Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
              <div className="flex items-center space-x-1.5 text-indigo-300 font-bold text-[10px] tracking-wider uppercase">
                <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                <span>STEP-BY-STEP CALCULATION</span>
              </div>
              <div className="flex items-center space-x-1">
                {isCurrent && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(!isPinned);
                  }}
                  title={isPinned ? "Unpin comment" : "Pin comment open"}
                  className={`hidden sm:inline-flex p-1 rounded hover:bg-slate-800 transition ${
                    isPinned ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(false);
                    setIsHovered(false);
                  }}
                  className="sm:hidden p-1 rounded hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Input Operands */}
          <div className="space-y-1 mb-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-sans font-semibold">
              Input Operands:
            </div>
            <div className="space-y-0.5 text-[11px]">
              {calculation.operands.map((op) => (
                <div
                  key={op.name}
                  className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800/60"
                >
                  <span className="text-slate-400">{op.name}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-300 font-semibold">
                      {op.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Evaluation Flow */}
          <div className="space-y-1 my-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-sans font-semibold">
              Evaluation Flow:
            </div>

            {/* Formula with Variable Names */}
            <div className="text-[11px] text-slate-400 px-2 py-0.5 bg-slate-900/40 rounded border border-slate-800/40 text-center">
              {calculation.expressionWithNames}
            </div>

            {/* Arrow */}
            <div className="text-center text-indigo-400 text-[10px] select-none">
              ↓ substitute operands
            </div>

            {/* Formula with Substituted Values */}
            <div className="text-xs text-center font-bold text-indigo-200 bg-slate-900/90 py-1 px-2 rounded border border-indigo-500/40">
              {calculation.expressionWithValues}
            </div>

            {/* Intermediate Steps if any */}
            {calculation.intermediateSteps?.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="text-center text-indigo-400 text-[10px] select-none">
                  ↓ intermediate
                </div>
                <div className="text-xs text-center text-slate-300 bg-slate-900/60 py-0.5 px-2 rounded border border-slate-800">
                  {step}
                </div>
              </React.Fragment>
            ))}

            {/* Final Assignment Arrow */}
            <div className="text-center text-emerald-400 text-[10px] select-none">
              ↓ final assigned value
            </div>

            {/* Result Box */}
            <div className="text-xs text-center font-bold text-emerald-300 bg-emerald-950/50 py-1.5 px-2 rounded border border-emerald-500/40 shadow-sm flex items-center justify-center space-x-2">
              <span className="text-slate-300">{calculation.targetVar}</span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-200 text-sm">
                {calculation.result}
              </span>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

// Backwards-compatible export
export const HoveringCalculationComment = FloatingCalculationComment;

// ==========================================
// 2. FLOATING ALIASING COMMENT (Popover)
// ==========================================
interface FloatingAliasingCommentProps {
  alias: AliasingAnnotation;
}

export const FloatingAliasingComment: React.FC<FloatingAliasingCommentProps> = ({
  alias,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const showComment = isHovered || isPinned;

  return (
    <div className="relative inline-block">
      {/* Sleek Trigger Pill */}
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className="px-2 py-0.5 rounded-md border text-[11px] font-mono flex items-center space-x-1.5 transition-all cursor-pointer bg-cyan-950/80 border-cyan-500/50 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-900/80"
        title="Hover to view shared reference (aliasing) explanation"
      >
        <Link2 className="w-3 h-3 text-cyan-400" />
        <span className="font-semibold text-cyan-200">
          Ref #{alias.objectId.slice(-4)}
        </span>
      </button>

      {/* Floating Popover (desktop popover, mobile bottom sheet) */}
      {showComment && (
        <>
          {/* Subtle mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(false);
              setIsHovered(false);
            }}
          />

          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed left-3 right-3 bottom-16 sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:absolute sm:w-80 sm:max-w-sm z-50 max-h-[70vh] overflow-y-auto bg-slate-950/98 backdrop-blur-md border border-cyan-500/60 rounded-xl p-3 shadow-2xl shadow-cyan-950/80 text-xs font-mono transition-all animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Top Caret Pointer (desktop only) */}
            <div className="hidden sm:block absolute -top-1.5 right-6 w-3 h-3 bg-slate-950 border-t border-l border-cyan-500/60 rotate-45" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-[10px] tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>SHARED REFERENCE (ALIASING)</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(!isPinned);
                  }}
                  className={`hidden sm:inline-flex p-1 rounded hover:bg-slate-800 transition ${
                    isPinned ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={isPinned ? "Unpin comment" : "Pin comment open"}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(false);
                    setIsHovered(false);
                  }}
                  className="sm:hidden p-1 rounded hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Reference Tree */}
            <div className="text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg p-2 leading-snug">
              <div>{alias.sourceVar} ───────────┐</div>
              <div className="text-cyan-300 font-semibold">
                {alias.targetVar} ───────────┴──▶ {alias.objectType} #{alias.objectId.slice(-4)}
              </div>
            </div>

            {/* Explanation Text */}
            <p className="text-[11px] text-cyan-200/90 font-sans pt-2 leading-relaxed">
              {alias.explanation}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 3. FLOATING ACTION COMMENT (Popover)
// ==========================================
interface FloatingActionCommentProps {
  varAction: VariableActionAnnotation;
}

export const FloatingActionComment: React.FC<FloatingActionCommentProps> = ({
  varAction,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const showComment = isHovered || isPinned;

  return (
    <div className="relative inline-block">
      {/* Sleek Trigger Pill */}
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className={`px-2 py-0.5 rounded-md border text-[10px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${varAction.theme.cardBg} ${varAction.theme.badgeBorder} ${varAction.theme.badgeText} ring-1 ${varAction.theme.ringColor}`}
        title="Hover to view variable action explanation"
      >
        <Sparkles className={`w-3 h-3 shrink-0 ${varAction.theme.iconColor}`} />
        <span className="font-semibold truncate max-w-[110px]">
          {varAction.actionType === "var_assignment" ? "Assigned" : "Updated"}
        </span>
      </button>

      {/* Floating Popover (desktop popover, mobile bottom sheet) */}
      {showComment && (
        <>
          {/* Subtle mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(false);
              setIsHovered(false);
            }}
          />

          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed left-3 right-3 bottom-16 sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:absolute sm:w-72 sm:max-w-sm z-50 max-h-[70vh] overflow-y-auto bg-slate-950/98 backdrop-blur-md border ${varAction.theme.badgeBorder} rounded-xl p-2.5 shadow-2xl text-xs font-mono transition-all animate-in fade-in zoom-in-95 duration-150`}
          >
            {/* Top Caret Pointer (desktop only) */}
            <div
              className={`hidden sm:block absolute -top-1.5 right-6 w-3 h-3 bg-slate-950 border-t border-l ${varAction.theme.badgeBorder} rotate-45`}
            />

            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold tracking-wider uppercase">
                <Sparkles className={`w-3 h-3 ${varAction.theme.iconColor}`} />
                <span className={varAction.theme.accentText}>VARIABLE ACTION</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(!isPinned);
                  }}
                  className={`hidden sm:inline-flex p-0.5 rounded hover:bg-slate-800 transition ${
                    isPinned ? "text-slate-200" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={isPinned ? "Unpin comment" : "Pin comment open"}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned(false);
                    setIsHovered(false);
                  }}
                  className="sm:hidden p-1 rounded hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-200 font-sans leading-relaxed">
              {varAction.comment}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
