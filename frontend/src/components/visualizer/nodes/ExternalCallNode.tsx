import React from "react";
import { Database, Globe, ArrowRight, Zap } from "lucide-react";

interface ExternalCallNodeProps {
  data: {
    kind: string; // "db" or "api"
    action: string;
    target: string;
    payload?: any;
    result?: any;
    durationMs: number;
  };
}

export const ExternalCallNode: React.FC<ExternalCallNodeProps> = ({ data }) => {
  const isDb = data.kind === "db";

  return (
    <div
      className={`rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95 ${
        isDb
          ? "border-emerald-500/60 bg-emerald-950/40 shadow-emerald-950/30"
          : "border-sky-500/60 bg-sky-950/40 shadow-sky-950/30"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          {isDb ? (
            <Database className="w-4 h-4 text-emerald-400" />
          ) : (
            <Globe className="w-4 h-4 text-sky-400" />
          )}
          <span
            className={`font-mono text-xs font-bold uppercase tracking-wider ${
              isDb ? "text-emerald-300" : "text-sky-300"
            }`}
          >
            {isDb ? "Mock Database Event" : "Mock API Request"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/80 text-amber-300 border border-amber-500/30">
            <Zap className="w-2.5 h-2.5" />
            <span>{data.durationMs} ms</span>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Action + Target */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
              isDb
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
            }`}
          >
            {data.action}
          </span>
          <span className="text-slate-300 truncate font-semibold">
            {data.target}
          </span>
        </div>

        {/* Payload / Query */}
        {data.payload && (
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2 font-mono text-[11px] text-slate-300 max-h-20 overflow-y-auto">
            <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">
              Payload / Query:
            </span>
            <pre className="whitespace-pre-wrap">
              {typeof data.payload === "string"
                ? data.payload
                : JSON.stringify(data.payload, null, 2)}
            </pre>
          </div>
        )}

        {/* Result */}
        {data.result && (
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-emerald-400 bg-slate-900/80 rounded px-2 py-1 border border-emerald-900/50">
            <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="text-slate-400">Response:</span>
            <span className="truncate">
              {typeof data.result === "string"
                ? data.result
                : JSON.stringify(data.result)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
