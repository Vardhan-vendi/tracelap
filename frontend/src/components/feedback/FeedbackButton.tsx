import React from "react";
import { MessageSquarePlus } from "lucide-react";

interface FeedbackButtonProps {
  onClick: () => void;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      type="button"
      title="Share feedback or report an issue"
      className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-indigo-500/60 text-slate-300 hover:text-indigo-300 font-mono text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
    >
      <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
};
