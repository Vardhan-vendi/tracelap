import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Link2 } from "lucide-react";

interface VariableNodeProps {
  data: {
    name: string;
    typeName: string;
    valueRepr: string;
    isChanged: boolean;
    isPointer: boolean;
    objectId?: string | null;
  };
}

export const VariableNode: React.FC<VariableNodeProps> = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeTheme = (type: string) => {
    switch (type.toLowerCase()) {
      case "int":
      case "float":
        return {
          bg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50",
          valBg: "bg-emerald-950/90 border-emerald-500/40 text-emerald-300",
        };
      case "str":
        return {
          bg: "bg-amber-950/80 text-amber-300 border-amber-500/50",
          valBg: "bg-amber-950/90 border-amber-500/40 text-amber-300",
        };
      case "bool":
        return {
          bg: "bg-purple-950/80 text-purple-300 border-purple-500/50",
          valBg: "bg-purple-950/90 border-purple-500/40 text-purple-300",
        };
      case "list":
      case "dict":
      case "set":
      case "tuple":
        return {
          bg: "bg-cyan-950/80 text-cyan-300 border-cyan-500/50",
          valBg: "bg-cyan-950/90 border-cyan-500/40 text-cyan-300",
        };
      default:
        return {
          bg: "bg-indigo-950/80 text-indigo-300 border-indigo-500/50",
          valBg: "bg-indigo-950/90 border-indigo-500/40 text-indigo-300",
        };
    }
  };

  const theme = getTypeTheme(data.typeName);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-lg border px-3 py-2 bg-slate-900/95 backdrop-blur transition-all duration-200 shadow-md ${
        data.isChanged
          ? "border-pink-500 ring-2 ring-pink-500/40 scale-[1.02] shadow-pink-500/20"
          : "border-slate-700/80 hover:border-slate-500"
      }`}
    >
      {/* Variable Name & Type Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <span className="font-mono text-xs font-bold text-slate-100">
            {data.name}
          </span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded border font-mono font-semibold ${theme.bg}`}
          >
            {data.typeName}
          </span>
        </div>

        {data.isChanged && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse">
            updated
          </span>
        )}
      </div>

      {/* Small Square Value Box */}
      <div className="mt-1.5 flex items-center justify-between">
        <div
          className={`px-2 py-1 rounded border font-mono text-xs font-semibold shadow-inner truncate max-w-[210px] ${theme.valBg}`}
        >
          {data.isPointer ? (
            <div className="flex items-center space-x-1.5">
              <span className="truncate">{data.valueRepr}</span>
              <Link2 className="w-3 h-3 text-cyan-400 shrink-0 inline" />
            </div>
          ) : (
            <span>{data.valueRepr}</span>
          )}
        </div>

        {data.isPointer && (
          <span className="text-[10px] font-mono text-cyan-400/80 font-bold ml-1">
            &rarr; heap
          </span>
        )}
      </div>

      {/* Interactive Tooltip on Hover */}
      {isHovered && (
        <div className="absolute left-0 bottom-full mb-1 z-50 w-64 p-2 rounded-lg bg-slate-950 border border-slate-700 shadow-2xl text-[11px] font-sans text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="font-bold text-xs text-indigo-300 font-mono mb-0.5">
            Variable: {data.name}
          </div>
          <div className="text-slate-400 text-[10px] mb-1">
            Type: <span className="text-slate-200 font-mono">{data.typeName}</span>
            {data.objectId && (
              <span className="ml-1 text-cyan-400">
                (heap id: @{data.objectId.slice(-4)})
              </span>
            )}
          </div>
          <div className="text-slate-300 text-[10px] leading-relaxed">
            {data.isPointer
              ? `Points to a compound ${data.typeName} object stored on the heap. Mutating this object will reflect everywhere it is referenced.`
              : `Stores primitive value ${data.valueRepr} directly in the local stack frame memory.`}
          </div>
        </div>
      )}

      {/* Connection Handle to Heap Node */}
      {data.isPointer && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 shadow-sm"
        />
      )}
    </div>
  );
};
