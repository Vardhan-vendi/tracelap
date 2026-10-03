import React, { useCallback, useEffect, useState } from "react";
import { useTraceStore } from "../store/useTraceStore";
import { GripVertical } from "lucide-react";

export const AdjustableAxis: React.FC = () => {
  const { splitPercent, setSplitPercent, layoutMode } = useTraceStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const totalWidth = window.innerWidth;
      const newPercent = Math.max(
        20,
        Math.min(80, (e.clientX / totalWidth) * 100),
      );
      setSplitPercent(Math.round(newPercent));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setSplitPercent]);

  // If in full screen mode on either pane, the divider shouldn't show
  if (layoutMode !== "split") {
    return null;
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={() => setSplitPercent(50)}
      title="ADJUSTABLE AXIS — Drag to resize panels (Double-click to reset 50/50)"
      className={`hidden md:flex group relative w-2 hover:w-2.5 bg-slate-900 hover:bg-indigo-600 transition-all cursor-col-resize select-none shrink-0 z-30 items-center justify-center border-x border-slate-800 ${
        isDragging ? "bg-indigo-600 w-2.5 ring-2 ring-indigo-500/50" : ""
      }`}
    >
      {/* Visual Axis Indicator Pill */}
      <div className="w-4 h-8 rounded bg-slate-950/80 border border-slate-700 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:border-indigo-400 transition pointer-events-none">
        <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-indigo-300" />
      </div>

      {/* Hover Tooltip showing ADJUSTABLE AXIS label from wireframe */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-slate-950 border border-emerald-500/50 text-[10px] font-mono font-bold text-emerald-300 shadow-xl pointer-events-none whitespace-nowrap">
        ({splitPercent}% / {100 - splitPercent}%)
      </div>
    </div>
  );
};
