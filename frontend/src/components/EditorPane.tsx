import React, { useRef, useEffect, useState, Suspense } from "react";
import { useTraceStore } from "../store/useTraceStore";
import { Code2, Maximize2, Minimize2 } from "lucide-react";

const MonacoEditor = React.lazy(async () => {
  const [{ setupMonaco }, mod] = await Promise.all([
    import("../utils/monacoConfig"),
    import("@monaco-editor/react"),
  ]);
  setupMonaco();
  return { default: mod.default };
});

const EditorPlaceholder: React.FC = () => (
  <div className="h-full w-full bg-[#090d16] p-4 flex flex-col font-mono text-xs text-slate-500 select-none">
    <div className="flex items-center space-x-2 text-indigo-400 mb-3 text-[11px] font-bold tracking-wider uppercase">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      <span>Coding Workspace Ready</span>
    </div>
    <div className="space-y-1 opacity-70">
      <div className="flex space-x-3">
        <span className="text-slate-600 w-4">1</span>
        <span className="text-emerald-400/70">
          # Write or paste any Python code here
        </span>
      </div>
      <div className="flex space-x-3">
        <span className="text-slate-600 w-4">2</span>
        <span className="text-slate-400">fruits = ["apple", "banana"]</span>
      </div>
      <div className="flex space-x-3">
        <span className="text-slate-600 w-4">3</span>
        <span className="text-slate-400">basket = fruits</span>
      </div>
      <div className="flex space-x-3">
        <span className="text-slate-600 w-4">4</span>
        <span className="text-slate-400">basket.append("cherry")</span>
      </div>
    </div>
  </div>
);

export const EditorPane: React.FC = () => {
  const {
    code,
    setCode,
    traceResult,
    currentStepIndex,
    isPlaying,
    layoutMode,
    setLayoutMode,
    splitPercent,
    activeTab,
    mobileTab,
  } = useTraceStore();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any>([]);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentStep = traceResult?.steps[currentStepIndex] || null;
  const currentLine = currentStep?.line_number || null;

  // Identify caller line and recursion
  const frames = currentStep?.frames || [];
  const topFrame = frames.length > 0 ? frames[frames.length - 1] : null;
  const parentFrame = frames.length > 1 ? frames[frames.length - 2] : null;

  const callerLine =
    currentStep?.caller_line_number ||
    topFrame?.caller_line_number ||
    (parentFrame ? parentFrame.line_number : null);

  const isRecursion =
    Boolean(currentStep?.is_recursion || topFrame?.is_recursion) ||
    Boolean(
      topFrame &&
      frames
        .slice(0, -1)
        .some((f) => f.function_name === topFrame.function_name),
    );

  const activeFnName = topFrame?.function_name || "function";

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define custom theme colors
    monaco.editor.defineTheme("codeflow-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#090d16",
        "editor.lineHighlightBackground": "#1e1b4b20",
        "editorGutter.background": "#090d16",
      },
    });
    monaco.editor.setTheme("codeflow-dark");
  };

  // Sync active line highlight and caller line square box with execution step
  useEffect(() => {
    if (!editorRef.current) return;

    const decorations: any[] = [];

    // 1. Current executing line decoration (Blue/Indigo solid stripe)
    if (currentLine) {
      editorRef.current.revealLineInCenterIfOutsideViewport(currentLine);

      decorations.push({
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "bg-indigo-500/25 border-l-4 border-indigo-500",
          glyphMarginClassName: "bg-indigo-500 rounded-full",
          hoverMessage: {
            value: `**Executing Line ${currentLine}**: Currently executing statement.`,
          },
        },
      });
    }

    // 2. Caller line / Recursion call line (Prominent SQUARE BOX)
    if (callerLine) {
      const labelText = isRecursion
        ? `  ⮑ [RECURSION CALL SITE: calls ${activeFnName}()]`
        : `  ⮑ [CALL SITE: calls ${activeFnName}()]`;

      decorations.push({
        range: {
          startLineNumber: callerLine,
          startColumn: 1,
          endLineNumber: callerLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: isRecursion
            ? "recursion-square-box"
            : "caller-line-square-box",
          glyphMarginClassName: isRecursion
            ? "recursion-glyph-square"
            : "caller-glyph-square",
          after: {
            content: labelText,
            inlineClassName: isRecursion
              ? "recursion-call-label"
              : "caller-call-label",
          },
          hoverMessage: {
            value: isRecursion
              ? `**🔁 Recursion Call Site (Line ${callerLine})**: This line invoked '${activeFnName}()' recursively.`
              : `**⮑ Call Site (Line ${callerLine})**: This line called '${activeFnName}()'.`,
          },
        },
      });
    }

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations,
    );
  }, [currentLine, callerLine, isRecursion, activeFnName]);

  // In track mode, when visualizer-full is clicked, keep code editor visible on the left at 30% width!
  if (layoutMode === "visualizer-full" && activeTab !== "trace") {
    return null;
  }

  const isTraceFullScreen =
    layoutMode === "visualizer-full" && activeTab === "trace";
  const widthStyle = isMobile
    ? { width: "100%" }
    : layoutMode === "editor-full"
      ? { width: "100%" }
      : isTraceFullScreen
        ? { width: "30%", minWidth: "280px" }
        : { width: `${splitPercent}%` };

  return (
    <div
      style={widthStyle}
      className={`h-full flex-col bg-slate-950 border-r border-slate-800 shrink-0 select-none overflow-hidden transition-all duration-200 ${
        isMobile && mobileTab !== "code" ? "hidden" : "flex"
      }`}
    >
      {/* Pane Header: CODING WORKSPACE */}
      <div className="h-10 sm:h-11 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between bg-slate-900/90 backdrop-blur select-none shrink-0">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-mono tracking-wider">WORKSPACE</span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {isPlaying && (
            <span className="flex items-center space-x-1.5 text-[10px] font-mono text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="hidden sm:inline">Tracing Active</span>
              <span className="sm:hidden">Active</span>
            </span>
          )}

          {/* Full Screen Track View Indicator */}
          {isTraceFullScreen && (
            <span className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/50 px-2 py-0.5 rounded shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>LINE TRACK (30%)</span>
            </span>
          )}

          {/* Recursion / Call Site Indicator Badge */}
          {callerLine && isRecursion && (
            <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 border border-rose-500 px-1.5 sm:px-2 py-0.5 rounded shadow-sm shadow-rose-950/50 max-w-[120px] sm:max-w-none truncate">
              <span className="w-2 h-2 bg-rose-400 rounded-xs inline-block shrink-0 shadow-sm" />
              <span>Line {callerLine}</span>
            </span>
          )}
          {callerLine && !isRecursion && frames.length > 1 && (
            <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 border border-purple-500/60 px-1.5 sm:px-2 py-0.5 rounded shadow-sm max-w-[120px] sm:max-w-none truncate">
              <span className="w-2 h-2 bg-purple-400 rounded-xs inline-block shrink-0 shadow-sm" />
              <span>Line {callerLine}</span>
            </span>
          )}

          {/* Quick toggle screen division marked as maximize (desktop only) */}
          <div className="hidden md:flex items-center space-x-1 border border-slate-800 rounded bg-slate-950 px-1 py-0.5">
            {layoutMode !== "split" ? (
              <button
                onClick={() => setLayoutMode("split")}
                title="Restore Half Screen (50/50 Split)"
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer text-xs"
              >
                <Minimize2 className="w-3.5 h-3.5 text-green-500" />
              </button>
            ) : (
              <button
                onClick={() => setLayoutMode("editor-full")}
                title="Expand Editor Full Screen"
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer text-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-green-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<EditorPlaceholder />}>
          <MonacoEditor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(val?: string) => setCode(val || "")}
            onMount={handleEditorDidMount}
            loading={<EditorPlaceholder />}
            options={{
              fontSize: isMobile ? 12.5 : 13.5,
              fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              lineNumbersMinChars: isMobile ? 2 : 3,
              glyphMargin: !isMobile,
              automaticLayout: true,
              renderLineHighlight: "all",
              readOnly: isPlaying,
              tabSize: 4,
              padding: { top: isMobile ? 8 : 12 },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};
