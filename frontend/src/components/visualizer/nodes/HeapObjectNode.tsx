import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Box, GitFork, Link2 } from "lucide-react";

interface HeapObjectNodeProps {
  data: {
    objectId: string;
    typeName: string;
    reprValue: string;
    elements?: Array<{ type: string; value: string; object_id?: string; is_ref?: boolean }>;
    keyValues?: Record<string, { type: string; value: string; object_id?: string; is_ref?: boolean }>;
    attributes?: Record<string, { type: string; value: string; object_id?: string; is_ref?: boolean }>;
    isTreeNode?: boolean;
  };
}

export const HeapObjectNode: React.FC<HeapObjectNodeProps> = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isTree = data.isTreeNode || Boolean(
    data.attributes && ("val" in data.attributes || "value" in data.attributes) &&
    ("left" in data.attributes || "right" in data.attributes || "next" in data.attributes)
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-xl border bg-slate-900/95 shadow-xl p-3 min-w-[240px] max-w-[340px] backdrop-blur transition-all duration-200 ${
        isTree
          ? "border-purple-500/60 shadow-purple-950/30 ring-1 ring-purple-500/30"
          : "border-cyan-500/50 shadow-cyan-950/20"
      }`}
    >
      {/* Target Handle from Stack Variable */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 shadow-sm"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center space-x-2">
          {isTree ? (
            <GitFork className="w-4 h-4 text-purple-400" />
          ) : (
            <Box className="w-4 h-4 text-cyan-400" />
          )}
          <span
            className={`font-mono text-xs font-bold ${
              isTree ? "text-purple-300" : "text-cyan-300"
            }`}
          >
            {data.typeName}
          </span>
          {isTree && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
              Tree Node
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          id: @{data.objectId.slice(-4)}
        </span>
      </div>

      {/* 1. List / Tuple / Set elements as simple small square boxes */}
      {data.elements && data.elements.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Items ({data.elements.length})</span>
            <span className="text-[9px] text-slate-500 font-normal">0-indexed</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {data.elements.map((el, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center min-w-[42px] px-2 py-1 rounded-md bg-slate-950 border border-slate-700/80 shadow-sm"
              >
                <span className="text-[8px] font-mono text-slate-500 font-bold">[{i}]</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    el.is_ref ? "text-cyan-300" : "text-emerald-300"
                  }`}
                >
                  {el.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Dict / Key-Value Pairs as small square boxes */}
      {data.keyValues && Object.keys(data.keyValues).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase font-bold text-slate-400">
            Key-Value Map
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {Object.entries(data.keyValues).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-slate-950 border border-slate-700/80 text-xs font-mono shadow-sm"
              >
                <span className="text-amber-300 font-bold">{k}:</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 ${
                    v.is_ref ? "text-cyan-300" : "text-emerald-300"
                  }`}
                >
                  {v.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Custom Class Instance Attributes / Tree Nodes */}
      {data.attributes && Object.keys(data.attributes).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase font-bold text-slate-400">
            Attributes
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {Object.entries(data.attributes).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-slate-950 border border-slate-700/80 text-xs font-mono shadow-sm"
              >
                <span className="text-indigo-300 font-bold">.{k} =</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 flex items-center space-x-1 ${
                    v.is_ref ? "text-cyan-300" : "text-emerald-300"
                  }`}
                >
                  <span>{v.value}</span>
                  {v.is_ref && <Link2 className="w-2.5 h-2.5 text-cyan-400 inline ml-1" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback raw preview if empty */}
      {!data.elements?.length &&
        !Object.keys(data.keyValues || {}).length &&
        !Object.keys(data.attributes || {}).length && (
          <div className="text-xs font-mono text-slate-300 px-2 py-1 rounded bg-slate-950 border border-slate-800 truncate">
            {data.reprValue}
          </div>
        )}

      {/* Interactive Tooltip on Hover */}
      {isHovered && (
        <div className="absolute left-0 bottom-full mb-1 z-50 w-64 p-2.5 rounded-lg bg-slate-950 border border-cyan-500/40 shadow-2xl text-[11px] font-sans text-slate-200 pointer-events-none animate-in fade-in duration-150">
          <div className="font-bold text-xs text-cyan-300 font-mono mb-1">
            Heap Object: {data.typeName}
          </div>
          <div className="text-[10px] text-slate-400 mb-1">
            Memory Address: <span className="font-mono text-slate-200">id: @{data.objectId.slice(-4)}</span>
          </div>
          <div className="text-slate-300 text-[10px] leading-relaxed">
            Allocated on the heap. Multiple stack variables or parent structures can point to this identical object in memory.
          </div>
        </div>
      )}

      {/* Source Handle for outgoing references to other heap objects (e.g. tree children) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 shadow-sm"
      />
    </div>
  );
};
