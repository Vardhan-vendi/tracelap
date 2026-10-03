import * as monaco from "monaco-editor/editor/editor.api.js";
import { conf, language } from "monaco-editor/languages/definitions/python/python.js";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";

// Essential editor contributions for editing, shortcuts, search, and indentation
import "monaco-editor/editor/browser/coreCommands.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js";
import "monaco-editor/editor/contrib/folding/browser/folding.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/indentation/browser/indentation.js";
import "monaco-editor/editor/contrib/linesOperations/browser/linesOperations.js";
import "monaco-editor/editor/contrib/wordOperations/browser/wordOperations.js";

import { loader } from "@monaco-editor/react";

let isConfigured = false;

/**
 * Lean Monaco initialization for Python.
 * Replaces the monolithic 13.5MB monaco-editor bundle by registering ONLY:
 * 1. editor.worker (stripping out ts.worker, css.worker, html.worker, json.worker)
 * 2. Python syntax highlighting and Monarch tokenizer (stripping 80+ unused languages)
 */
export function setupMonaco() {
  if (isConfigured) return monaco;

  // Configure worker provider (only editor.worker, zero unused language workers)
  (self as any).MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };

  // Register Python language syntax & configuration
  monaco.languages.register({ id: "python", extensions: [".py"] });
  monaco.languages.setLanguageConfiguration("python", conf);
  monaco.languages.setMonarchTokensProvider("python", language);

  // Configure custom dark theme
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

  loader.config({ monaco });
  isConfigured = true;
  return monaco;
}

export default setupMonaco;
