import React from "react";
import type { FrameSnapshot } from "../../types/trace";
import type { RecursiveTreeNodeData } from "../../utils/treeBuilder";
import {
  ArrowUp,
  CheckCircle2,
  CornerDownLeft,
  Trash2,
} from "lucide-react";

interface RecursiveTreeViewProps {
  roots: RecursiveTreeNodeData[];
  currentStepIndex: number;
}

// Color palettes for tree nodes by depth or index (dim, muted borders so content stands out)
const TREE_NODE_THEMES = [
  {
    border: "border-indigo-500/20",
    activeBorder: "border border-indigo-500/40 ring-1 ring-indigo-500/15",
    headerBg: "bg-indigo-950/40",
    headerBorder: "border-indigo-500/20",
    headerText: "text-indigo-200",
    badgeBg: "bg-indigo-950/80",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/30",
    shadow: "shadow-slate-950/40",
  },
  {
    border: "border-cyan-500/20",
    activeBorder: "border border-cyan-500/40 ring-1 ring-cyan-500/15",
    headerBg: "bg-cyan-950/40",
    headerBorder: "border-cyan-500/20",
    headerText: "text-cyan-200",
    badgeBg: "bg-cyan-950/80",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/30",
    shadow: "shadow-slate-950/40",
  },
  {
    border: "border-purple-500/20",
    activeBorder: "border border-purple-500/40 ring-1 ring-purple-500/15",
    headerBg: "bg-purple-950/40",
    headerBorder: "border-purple-500/20",
    headerText: "text-purple-200",
    badgeBg: "bg-purple-950/80",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    shadow: "shadow-slate-950/40",
  },
  {
    border: "border-emerald-500/20",
    activeBorder: "border border-emerald-500/40 ring-1 ring-emerald-500/15",
    headerBg: "bg-emerald-950/40",
    headerBorder: "border-emerald-500/20",
    headerText: "text-emerald-200",
    badgeBg: "bg-emerald-950/80",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    shadow: "shadow-slate-950/40",
  },
  {
    border: "border-amber-500/20",
    activeBorder: "border border-amber-500/40 ring-1 ring-amber-500/15",
    headerBg: "bg-amber-950/40",
    headerBorder: "border-amber-500/20",
    headerText: "text-amber-200",
    badgeBg: "bg-amber-950/80",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    shadow: "shadow-slate-950/40",
  },
  {
    border: "border-rose-500/20",
    activeBorder: "border border-rose-500/40 ring-1 ring-rose-500/15",
    headerBg: "bg-rose-950/40",
    headerBorder: "border-rose-500/20",
    headerText: "text-rose-200",
    badgeBg: "bg-rose-950/80",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/30",
    shadow: "shadow-slate-950/40",
  },
];

interface TreeNodeCardProps {
  node: RecursiveTreeNodeData;
  theme: typeof TREE_NODE_THEMES[0];
}

const TreeNodeCard: React.FC<TreeNodeCardProps> = ({ node, theme }) => {
  const { frame } = node;
  const isGlobal =
    node.functionName === "<module>" ||
    node.functionName.toLowerCase().includes("global");
  const argsString = Object.values(node.args).join(", ");
  const cardTitle = isGlobal
    ? "GLOBAL SCOPE"
    : `${node.functionName}(${argsString})`;

  const varEntries = Object.entries(frame.local_vars || {});

  return (
    <div
      id={node.isLeaf && (node.isActive || node.isReturningNow) ? "active-stack-frame" : undefined}
      data-is-global={node.depth === 0 ? "true" : "false"}
      className={`w-[260px] min-w-[240px] max-w-[280px] shrink-0 rounded-xl border transition-all duration-300 shadow-sm ${
        theme.shadow
      } ${
        node.isReturningNow
          ? "border border-emerald-500/40 bg-slate-900/95 ring-1 ring-emerald-500/20 shadow-md opacity-100 scale-[1.02]"
          : node.isLeaf && node.isActive
          ? `${theme.activeBorder} bg-slate-900/95 opacity-100 scale-[1.02]`
          : node.isWaiting
          ? "border border-amber-500/30 bg-slate-900/80 ring-1 ring-amber-500/15 opacity-100"
          : node.isReturned
          ? "border border-rose-500/35 bg-slate-950/70 ring-1 ring-rose-500/15 opacity-65 hover:opacity-90"
          : "border-slate-800/70 bg-slate-950/60 opacity-65"
      }`}
    >
      {/* Node Header */}
      <div
        className={`px-2.5 py-1.5 border-b ${
          node.isReturningNow
            ? "border-emerald-500/20 bg-emerald-950/50"
            : node.isWaiting
            ? "border-amber-500/20 bg-amber-950/30"
            : node.isReturned
            ? "border-rose-500/20 bg-rose-950/30"
            : `${theme.headerBorder} ${theme.headerBg}`
        } flex items-center justify-between rounded-t-[10px]`}
      >
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span
            className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border shrink-0 ${
              node.isReturned
                ? "bg-rose-950/90 text-rose-300 border-rose-500/50"
                : "bg-slate-950/90 text-indigo-300 border-indigo-500/40"
            }`}
          >
            D{node.depth}
          </span>
          <span
            className={`font-mono text-xs font-bold truncate ${
              node.isReturningNow
                ? "text-emerald-200"
                : node.isWaiting
                ? "text-amber-200"
                : node.isReturned
                ? "text-rose-200"
                : theme.headerText
            }`}
            title={cardTitle}
          >
            {cardTitle}
          </span>
        </div>

        {/* Status Tag */}
        <div className="shrink-0 ml-1">
          {node.isReturningNow ? (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold flex items-center space-x-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>↩ RET</span>
            </span>
          ) : node.isWaiting ? (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              <span>WAIT</span>
            </span>
          ) : node.isLeaf && node.isActive ? (
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} font-bold flex items-center space-x-1`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>ACTIVE</span>
            </span>
          ) : node.isReturned ? (
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 font-bold flex items-center space-x-1 shadow-sm"
              title="Completed — Deleted from Stack"
            >
              <Trash2 className="w-2.5 h-2.5 text-rose-400 shrink-0" />
              <span>DELETED</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Node Content */}
      <div className="p-2 space-y-1.5 text-left font-mono">
        {/* Waiting State and Expression */}
        {node.isWaiting && (
          <div className="p-1.5 px-2 rounded-lg bg-amber-950/30 border border-amber-500/40 text-[11px] space-y-0.5">
            <div className="text-[9px] font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              <span>WAITING FOR CHILD</span>
            </div>
            {node.waitingFor && (
              <div className="text-slate-300 text-[10px] truncate">
                waiting: <span className="text-amber-200 font-bold">{node.waitingFor}</span>
              </div>
            )}
            {node.pendingExpression && (
              <div className="text-slate-400 text-[10px] bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 truncate">
                expr: <span className="text-amber-300 font-bold">{node.pendingExpression}</span>
              </div>
            )}
          </div>
        )}

        {/* Received Return Values from children */}
        {node.returnedChildren.length > 0 && (
          <div className="p-1.5 px-2 rounded-lg bg-emerald-950/25 border border-emerald-500/40 text-[11px] space-y-1">
            <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>RECEIVED RETURNS</span>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              {node.returnedChildren.map((child: FrameSnapshot) => (
                <div
                  key={child.call_id || child.frame_id}
                  className="flex items-center space-x-1 text-slate-200 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800"
                >
                  <span className="text-purple-300 font-semibold truncate max-w-[90px]">
                    {child.function_name}({Object.values(child.args || {}).join(", ")})
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-300 font-extrabold bg-emerald-950 px-1 py-0.2 rounded border border-emerald-500/40">
                    {child.return_value}
                  </span>
                </div>
              ))}
            </div>

            {/* Evaluated Calculation */}
            {node.evaluatedCalculation && (
              <div className="text-[10px] pt-0.5 border-t border-emerald-500/20 text-emerald-200 font-bold flex items-center space-x-1">
                <span className="text-slate-400 text-[8px] uppercase font-sans">
                  eval:
                </span>
                <span className="bg-slate-950/90 px-1.5 py-0.2 rounded border border-emerald-500/40 text-emerald-300 font-mono truncate">
                  {node.evaluatedCalculation}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Local Variables (e.g. n = 3) */}
        <div className="space-y-0.5 text-xs">
          {varEntries.length === 0 ? (
            <div className="text-[10px] text-slate-500 italic py-0.5 text-center">
              (no local vars)
            </div>
          ) : (
            varEntries.map(([vName, vSnap]) => (
              <div
                key={vName}
                className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800/80 text-[11px]"
              >
                <span className="font-bold text-slate-200">{vName}</span>
                <span className="text-slate-600 text-[10px]">→</span>
                <span className="font-bold text-emerald-300">{vSnap.value_repr}</span>
              </div>
            ))
          )}
        </div>

        {/* Return Value Statement */}
        {node.returnValue && (
          <div
            className={`p-1.5 px-2 rounded-lg border text-xs space-y-0.5 ${
              node.isReturningNow
                ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center space-x-1">
                <CornerDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                <span>returns</span>
              </span>
              <span className="text-emerald-300 font-extrabold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/50 text-xs">
                {node.returnValue}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TreeSubtreeProps {
  node: RecursiveTreeNodeData;
}

const TreeSubtree: React.FC<TreeSubtreeProps> = ({ node }) => {
  const currentThemeIdx = (node.depth || 0) % TREE_NODE_THEMES.length;
  const theme = TREE_NODE_THEMES[currentThemeIdx];
  const children = node.children || [];
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* 1. Parent Node Card */}
      <TreeNodeCard node={node} theme={theme} />

      {/* 2. Children Subtrees with Orthogonal Connectors */}
      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical trunk line coming down from parent node center */}
          <div className="w-0.5 h-5 bg-indigo-500/50" />

          {/* Children row with orthogonal branches */}
          <div className="relative flex justify-center items-start gap-8">
            {children.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === children.length - 1;
              const isSingle = children.length === 1;

              return (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Top Orthogonal Connector Rail */}
                  <div className="relative w-full h-6 flex items-center justify-center">
                    {/* Horizontal rail bar */}
                    {!isSingle && (
                      <div
                        className={`absolute top-0 h-0.5 bg-indigo-500/50 ${
                          isFirst
                            ? "left-1/2 right-0"
                            : isLast
                            ? "left-0 right-1/2"
                            : "left-0 right-0"
                        }`}
                      />
                    )}

                    {/* Vertical drop line into child top center */}
                    <div className="w-0.5 h-full bg-indigo-500/50" />

                    {/* Downward Arrow Head into child card */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[5px] border-t-indigo-400" />

                    {/* ANIMATED GREEN RETURN ARROW (travels from child UP to parent along connector) */}
                    {child.returnValue != null && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 px-2 py-0.2 rounded-full border text-[9px] font-mono font-bold shadow-md transition-all ${
                          child.isReturningNow
                            ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/50 return-badge-glow animate-return-arrow -top-1"
                            : "bg-slate-950/95 border-emerald-500/60 text-emerald-300 top-0.5 opacity-90 hover:opacity-100"
                        }`}
                        title={`Returning value ${child.returnValue} up to ${node.functionName}()`}
                      >
                        <ArrowUp className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                        <span>return {child.returnValue}</span>
                      </div>
                    )}
                  </div>

                  {/* Recursive Child Subtree */}
                  <TreeSubtree node={child} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RecursiveTreeView: React.FC<RecursiveTreeViewProps> = ({
  roots,
}) => {
  if (!roots || roots.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-500 text-center font-mono">
        No recursive tree active
      </div>
    );
  }

  return (
    <div className="tree-viewport w-full overflow-x-auto overflow-y-visible py-4 px-2 select-none">
      <div className="tree-canvas min-w-max flex flex-col items-center space-y-8 mx-auto px-4">
        {roots.map((root, index) => (
          <TreeSubtree key={root.id || index} node={root} />
        ))}
      </div>
    </div>
  );
};
