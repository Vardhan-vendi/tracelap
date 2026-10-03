import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Layers, CheckCircle2, CornerDownLeft, ArrowRight } from "lucide-react";

interface FrameNodeProps {
  data: {
    functionName: string;
    depth: number;
    lineNumber: number;
    returnValue?: string | null;
    isTop: boolean;
    isActive?: boolean;
    args?: Record<string, string>;
    callId?: string;
    parentCallId?: string | null;
  };
}

export const FrameNode: React.FC<FrameNodeProps> = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = data.isActive !== false;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-xl border p-3 transition-all duration-300 ${
        isActive
          ? data.isTop
            ? "bg-slate-900/90 border-indigo-500/30 shadow-md ring-1 ring-indigo-500/15"
            : "bg-slate-900/80 border-indigo-500/20 shadow-sm"
          : "bg-slate-950/60 border-slate-800/70 opacity-65 hover:opacity-90 shadow-sm"
      }`}
      style={{ minHeight: "100%", width: "100%" }}
    >
      {/* Top Handle for Parent Call Tree Edge */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-slate-900 -top-1.5"
      />

      {/* Frame Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center space-x-2">
          <Layers
            className={`w-4 h-4 ${
              isActive ? "text-indigo-400 animate-pulse" : "text-slate-500"
            }`}
          />
          <span
            className={`font-mono text-xs font-bold ${
              isActive ? "text-indigo-300" : "text-slate-400"
            }`}
          >
            {data.functionName}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isActive ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {data.isTop ? "Active (Top)" : "Active"}
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              <CheckCircle2 className="w-2.5 h-2.5 text-slate-400" />
              <span>Completed</span>
            </span>
          )}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            line {data.lineNumber}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
            depth {data.depth}
          </span>
        </div>
      </div>

      {/* 📥 Accepted Arguments (Clear view of input parameters) */}
      {data.args && Object.keys(data.args).length > 0 && (
        <div className="mb-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="text-[9px] uppercase font-bold text-indigo-400/80 mb-1 flex items-center space-x-1">
            <ArrowRight className="w-2.5 h-2.5" />
            <span>Accepted Arguments</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(data.args).map(([argName, argVal]) => (
              <span
                key={argName}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono"
              >
                <span className="text-indigo-300 font-bold">{argName}</span>
                <span className="text-slate-500">=</span>
                <span className="text-emerald-300 font-semibold">{argVal}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ⮐ Returning / Returned Value (Clear view of returned values) */}
      {data.returnValue && (
        <div className="mt-2 text-xs font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-sm">
          <span className="text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
            <CornerDownLeft className="w-3.5 h-3.5 inline mr-1" />
            <span>Returned Value:</span>
          </span>
          <span className="font-extrabold text-emerald-200 px-2 py-0.5 rounded bg-emerald-900/90 border border-emerald-500/40">
            {data.returnValue}
          </span>
        </div>
      )}

      {/* Interactive Tooltip on Hover */}
      {isHovered && (
        <div className="absolute left-0 bottom-full mb-1 z-50 w-72 p-2.5 rounded-lg bg-slate-950 border border-indigo-500/40 shadow-2xl text-[11px] font-sans text-slate-200 pointer-events-none animate-in fade-in duration-150">
          <div className="font-bold text-xs text-indigo-300 font-mono mb-1">
            Function Call: {data.functionName}()
          </div>
          <div className="text-[10px] text-slate-400 mb-1 space-y-0.5">
            <div>
              Status:{" "}
              <strong className={isActive ? "text-emerald-400" : "text-slate-400"}>
                {isActive ? "Currently Active on Stack" : "Completed / Returned"}
              </strong>
            </div>
            <div>
              Call Depth: <span className="text-slate-200 font-mono">{data.depth}</span>
            </div>
            {data.returnValue && (
              <div>
                Final Return:{" "}
                <span className="text-emerald-400 font-mono font-bold">
                  {data.returnValue}
                </span>
              </div>
            )}
          </div>
          <div className="text-slate-300 text-[10px] leading-relaxed border-t border-slate-800 pt-1">
            {isActive
              ? `Execution is currently inside this stack frame. Variables below belong to this function's private local scope.`
              : `This function has already finished execution and returned its value to the caller. Kept in dull state to trace the call hierarchy.`}
          </div>
        </div>
      )}

      {/* Bottom Handle for Child Call Tree Edge */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-slate-900 -bottom-1.5"
      />
    </div>
  );
};
