import React from "react";
import { X, Sparkles, Cpu, Cloud, Key, Check } from "lucide-react";
import { useTraceStore } from "../store/useTraceStore";

interface ModalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalSettings: React.FC<ModalSettingsProps> = ({ isOpen, onClose }) => {
  const { aiProvider, setAiProvider, apiKey, setApiKey } = useTraceStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                AI Explainer Configuration
              </h2>
              <p className="text-[11px] text-slate-400">
                Select your explanation model provider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Active Provider
            </label>

            {/* Option 1: Rule-Based Explainer */}
            <div
              onClick={() => setAiProvider("rule_based")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                aiProvider === "rule_based"
                  ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-100">
                    Rule-Based Explainer
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    $0 / 100% Offline
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Zero latency, guaranteed ground truth. Analyzes variable changes and execution events deterministically.
                </p>
              </div>
              {aiProvider === "rule_based" && (
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
              )}
            </div>

            {/* Option 2: Groq Cloud API */}
            <div
              onClick={() => setAiProvider("groq")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                aiProvider === "groq"
                  ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-500/30 text-sky-400 mt-0.5">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-100">
                    Groq Free Tier (Llama 3.1)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    Cloud API
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  High-speed LLM inferences using free API keys from console.groq.com.
                </p>
              </div>
              {aiProvider === "groq" && (
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
              )}
            </div>

            {/* Option 3: Ollama Local */}
            <div
              onClick={() => setAiProvider("ollama")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                aiProvider === "ollama"
                  ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-400 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-100">
                    Ollama (Local Server)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Self-Hosted
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Connects to http://localhost:11434 if you have Ollama running locally.
                </p>
              </div>
              {aiProvider === "ollama" && (
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
              )}
            </div>
          </div>

          {/* API Key input if Groq selected */}
          {aiProvider === "groq" && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Groq API Key</span>
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">
                Stored in memory only for this session. Get a free key at console.groq.com.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 px-4 sm:px-6 py-3 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
