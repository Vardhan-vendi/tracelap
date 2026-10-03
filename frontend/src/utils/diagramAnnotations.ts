import type { TraceStep } from "../types/trace";

export type StepActionType =
  | "var_assignment"
  | "aliasing"
  | "mutation"
  | "calculation"
  | "fn_def"
  | "fn_call"
  | "fn_return"
  | "condition"
  | "loop"
  | "output"
  | "exception"
  | "general";

export interface ActionTheme {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  bannerBg: string;
  bannerBorder: string;
  cardBg: string;
  caretBorder: string;
  accentText: string;
  iconColor: string;
  ringColor: string;
}

export const ACTION_THEMES: Record<string, ActionTheme> = {
  emerald: {
    name: "emerald",
    badgeBg: "bg-emerald-950/80",
    badgeBorder: "border-emerald-500/50",
    badgeText: "text-emerald-300",
    bannerBg: "bg-emerald-950/25",
    bannerBorder: "border-emerald-500/30",
    cardBg: "bg-emerald-950/40",
    caretBorder: "border-emerald-500/50",
    accentText: "text-emerald-300",
    iconColor: "text-emerald-400",
    ringColor: "ring-emerald-500/30",
  },
  cyan: {
    name: "cyan",
    badgeBg: "bg-cyan-950/80",
    badgeBorder: "border-cyan-500/50",
    badgeText: "text-cyan-300",
    bannerBg: "bg-cyan-950/25",
    bannerBorder: "border-cyan-500/30",
    cardBg: "bg-cyan-950/40",
    caretBorder: "border-cyan-500/50",
    accentText: "text-cyan-300",
    iconColor: "text-cyan-400",
    ringColor: "ring-cyan-500/30",
  },
  amber: {
    name: "amber",
    badgeBg: "bg-amber-950/80",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-300",
    bannerBg: "bg-amber-950/25",
    bannerBorder: "border-amber-500/30",
    cardBg: "bg-amber-950/40",
    caretBorder: "border-amber-500/50",
    accentText: "text-amber-300",
    iconColor: "text-amber-400",
    ringColor: "ring-amber-500/30",
  },
  indigo: {
    name: "indigo",
    badgeBg: "bg-indigo-950/80",
    badgeBorder: "border-indigo-500/50",
    badgeText: "text-indigo-300",
    bannerBg: "bg-indigo-950/25",
    bannerBorder: "border-indigo-500/30",
    cardBg: "bg-indigo-950/40",
    caretBorder: "border-indigo-500/50",
    accentText: "text-indigo-300",
    iconColor: "text-indigo-400",
    ringColor: "ring-indigo-500/30",
  },
  purple: {
    name: "purple",
    badgeBg: "bg-purple-950/80",
    badgeBorder: "border-purple-500/50",
    badgeText: "text-purple-300",
    bannerBg: "bg-purple-950/25",
    bannerBorder: "border-purple-500/30",
    cardBg: "bg-purple-950/40",
    caretBorder: "border-purple-500/50",
    accentText: "text-purple-300",
    iconColor: "text-purple-400",
    ringColor: "ring-purple-500/30",
  },
  pink: {
    name: "pink",
    badgeBg: "bg-pink-950/80",
    badgeBorder: "border-pink-500/50",
    badgeText: "text-pink-300",
    bannerBg: "bg-pink-950/25",
    bannerBorder: "border-pink-500/30",
    cardBg: "bg-pink-950/40",
    caretBorder: "border-pink-500/50",
    accentText: "text-pink-300",
    iconColor: "text-pink-400",
    ringColor: "ring-pink-500/30",
  },
  yellow: {
    name: "yellow",
    badgeBg: "bg-yellow-950/80",
    badgeBorder: "border-yellow-500/50",
    badgeText: "text-yellow-300",
    bannerBg: "bg-yellow-950/25",
    bannerBorder: "border-yellow-500/30",
    cardBg: "bg-yellow-950/40",
    caretBorder: "border-yellow-500/50",
    accentText: "text-yellow-300",
    iconColor: "text-yellow-400",
    ringColor: "ring-yellow-500/30",
  },
  sky: {
    name: "sky",
    badgeBg: "bg-sky-950/80",
    badgeBorder: "border-sky-500/50",
    badgeText: "text-sky-300",
    bannerBg: "bg-sky-950/25",
    bannerBorder: "border-sky-500/30",
    cardBg: "bg-sky-950/40",
    caretBorder: "border-sky-500/50",
    accentText: "text-sky-300",
    iconColor: "text-sky-400",
    ringColor: "ring-sky-500/30",
  },
  rose: {
    name: "rose",
    badgeBg: "bg-rose-950/80",
    badgeBorder: "border-rose-500/50",
    badgeText: "text-rose-300",
    bannerBg: "bg-rose-950/25",
    bannerBorder: "border-rose-500/30",
    cardBg: "bg-rose-950/40",
    caretBorder: "border-rose-500/50",
    accentText: "text-rose-300",
    iconColor: "text-rose-400",
    ringColor: "ring-rose-500/30",
  },
  slate: {
    name: "slate",
    badgeBg: "bg-slate-900/90",
    badgeBorder: "border-slate-700/50",
    badgeText: "text-slate-300",
    bannerBg: "bg-slate-900/30",
    bannerBorder: "border-slate-800",
    cardBg: "bg-slate-900/60",
    caretBorder: "border-slate-700/50",
    accentText: "text-slate-300",
    iconColor: "text-slate-400",
    ringColor: "ring-slate-700/30",
  },
};

export interface StepActionInfo {
  actionType: StepActionType;
  theme: ActionTheme;
  badgeLabel: string;
  headline: string;
  floatingComment: string;
  fullExplanation: string;
  targetVar?: string;
  targetObjectId?: string;
  targetFrameId?: string;
}

export interface VariableActionAnnotation {
  targetVar: string;
  actionType: StepActionType;
  theme: ActionTheme;
  comment: string;
  isPointer?: boolean;
  objectId?: string;
}

export interface CalculationStep {
  operands: Array<{ name: string; value: string }>;
  expressionWithNames: string;
  expressionWithValues: string;
  result: string;
  targetVar: string;
  intermediateSteps?: string[];
  isCurrent?: boolean;
}

export interface ConditionAnnotation {
  conditionExpr: string;
  operands: Array<{ name: string; value: string }>;
  substitutedExpr: string;
  isTrue: boolean;
  branchTaken: string;
}

export interface AliasingAnnotation {
  targetVar: string;
  sourceVar: string;
  objectId: string;
  objectType: string;
  explanation: string;
}

export interface MutationAnnotation {
  objectId: string;
  objectType: string;
  methodName: string;
  beforeValue: string;
  afterValue: string;
  referencingVars: string[];
  explanation: string;
}

export interface FunctionCallAnnotation {
  callerLine?: string;
  callerLineNumber?: number;
  isRecursion?: boolean;
  fnName: string;
  args: Record<string, string>;
  explanation: string;
}

export interface ReturnAnnotation {
  expression: string;
  calculatedSteps?: string[];
  returnValue: string;
  callerVar?: string;
}

export interface EmbeddedDiagramAnnotations {
  stepAction?: StepActionInfo;
  variableActionByVar?: Record<string, VariableActionAnnotation>;
  calculationByVar?: Record<string, CalculationStep>;
  aliasingByVar?: Record<string, AliasingAnnotation>;
  conditionByFrame?: Record<string, ConditionAnnotation>;
  mutationByObjectId?: Record<string, MutationAnnotation>;
  callByFrame?: Record<string, FunctionCallAnnotation>;
  returnByFrame?: Record<string, ReturnAnnotation>;
  activeVarName?: string;
  activeFrameId?: string;
  activeObjectId?: string;
}

function parseCalculationFromStep(step: TraceStep): CalculationStep | null {
  const rawCode = (step.step_code || "").trim();
  if (
    !rawCode.includes("=") ||
    rawCode.includes("==") ||
    rawCode.includes("!=") ||
    rawCode.includes("<=") ||
    rawCode.includes(">=") ||
    rawCode.startsWith("def ") ||
    rawCode.startsWith("if ") ||
    rawCode.startsWith("for ") ||
    rawCode.startsWith("while ")
  ) {
    return null;
  }

  const parts = rawCode.split("=");
  const targetVar = parts[0].trim();
  const rhsExpr = parts.slice(1).join("=").trim();

  // If RHS is just a literal number, string, list or simple identifier, not a calculation
  if (/^[a-zA-Z0-9_'"]+$/.test(rhsExpr) || rhsExpr.startsWith("[") || rhsExpr.startsWith("{")) {
    return null;
  }

  // If RHS is a function invocation (e.g. calculate_total(...), my_func(a, b))
  // NOT a pure arithmetic calculation (allow standard math builtins sum/len/int/float/abs/min/max/round)
  const mathBuiltins = new Set(["sum", "len", "int", "float", "abs", "round", "min", "max", "pow"]);
  const fnCallMatch = rhsExpr.match(/^([a-zA-Z_]\w*)\s*\(.*?\)$/);
  if (fnCallMatch && !mathBuiltins.has(fnCallMatch[1])) {
    return null;
  }

  const frames = step.frames || [];
  const activeFrame = frames[frames.length - 1];
  if (!activeFrame || !activeFrame.local_vars) return null;

  const targetSnap = activeFrame.local_vars[targetVar];
  if (!targetSnap || targetSnap.is_pointer) return null;

  const localVars = activeFrame.local_vars;
  const operands: Array<{ name: string; value: string }> = [];
  let substituted = rhsExpr;
  const intermediateSteps: string[] = [];

  // Special case: sum(...)
  if (rhsExpr.startsWith("sum(") && rhsExpr.endsWith(")")) {
    const innerVar = rhsExpr.slice(4, -1).trim();
    const innerSnap = localVars[innerVar];
    if (innerSnap) {
      operands.push({ name: innerVar, value: innerSnap.value_repr });
      try {
        const cleaned = innerSnap.value_repr.replace(/^\[|\]$/g, "");
        const items = cleaned.split(",").map((s) => s.trim());
        if (items.length > 1) {
          intermediateSteps.push(`= ${items.join(" + ")}`);
        }
      } catch {
        // ignore
      }
    }
  } else if (rhsExpr.startsWith("len(") && rhsExpr.endsWith(")")) {
    const innerVar = rhsExpr.slice(4, -1).trim();
    const innerSnap = localVars[innerVar];
    if (innerSnap) {
      operands.push({ name: innerVar, value: innerSnap.value_repr });
      intermediateSteps.push(`count of items in ${innerVar} = ${targetSnap.value_repr}`);
    }
  } else {
    // General expressions: substitute identifiers with their current values
    for (const [vName, vSnap] of Object.entries(localVars)) {
      if (
        vSnap.type_name === "function" ||
        vSnap.value_repr.startsWith("def ") ||
        vSnap.value_repr.startsWith("<function") ||
        vSnap.value_repr.startsWith("<built-in")
      ) {
        continue;
      }
      if (vName !== targetVar && new RegExp(`\\b${vName}\\b`).test(rhsExpr)) {
        operands.push({ name: vName, value: vSnap.value_repr });
        const regex = new RegExp(`\\b${vName}\\b`, "g");
        substituted = substituted.replace(regex, vSnap.value_repr);
      }
    }
  }

  // Format visual math symbols: * -> ×, / -> ÷
  const cleanSubstituted = substituted.replace(/\*/g, " × ").replace(/\//g, " ÷ ");
  const cleanExpr = rhsExpr.replace(/\*/g, " × ").replace(/\//g, " ÷ ");

  if (operands.length > 0 || intermediateSteps.length > 0) {
    return {
      operands,
      expressionWithNames: cleanExpr,
      expressionWithValues: cleanSubstituted,
      result: targetSnap.value_repr,
      targetVar,
      intermediateSteps: intermediateSteps.length > 0 ? intermediateSteps : undefined,
    };
  }

  return null;
}

/**
 * Analyzes the current step and previous steps to produce in-place,
 * diagram-embedded explanations, floating comments, and color-coded step action metadata.
 */
export function extractDiagramAnnotations(
  currentStep: TraceStep | null,
  prevStep: TraceStep | null,
  allSteps?: TraceStep[],
  currentStepIndex: number = 0
): EmbeddedDiagramAnnotations {
  const result: EmbeddedDiagramAnnotations = {
    calculationByVar: {},
    aliasingByVar: {},
    conditionByFrame: {},
    mutationByObjectId: {},
    callByFrame: {},
    returnByFrame: {},
    variableActionByVar: {},
  };

  if (!currentStep) return result;

  const rawCode = (currentStep.step_code || "").trim();
  const eventType = currentStep.event_type;
  const currentFrames = currentStep.frames || [];
  const activeFrame = currentFrames[currentFrames.length - 1];
  const activeFrameId = activeFrame ? activeFrame.frame_id : undefined;
  result.activeFrameId = activeFrameId;

  // 1. Scan historical steps up to current step to preserve calculation hovering comments
  if (allSteps && allSteps.length > 0) {
    const historicalLimit = Math.min(currentStepIndex, allSteps.length - 1);
    for (let i = 0; i <= historicalLimit; i++) {
      const step = allSteps[i];
      const calc = parseCalculationFromStep(step);
      if (calc) {
        calc.isCurrent = i === currentStepIndex;
        result.calculationByVar![calc.targetVar] = calc;
      }
    }
  }

  // 2. Parse current step calculation if not already present
  const currentCalc = parseCalculationFromStep(currentStep);
  if (currentCalc) {
    currentCalc.isCurrent = true;
    result.calculationByVar![currentCalc.targetVar] = currentCalc;
    result.activeVarName = currentCalc.targetVar;
  }

  // 3. Exception Step Detection
  if (eventType === "exception" || Boolean(currentStep.stderr)) {
    const errText = (currentStep.stderr || "Runtime exception").split("\n")[0];
    result.stepAction = {
      actionType: "exception",
      theme: ACTION_THEMES.rose,
      badgeLabel: "EXCEPTION RAISED",
      headline: `Runtime error on Line ${currentStep.line_number}`,
      floatingComment: `Python stopped: ${errText}`,
      fullExplanation: `An unhandled exception stopped program execution. Check variable values and types at this step.`,
    };
    return result;
  }

  // 4. Console Output / Print Detection
  if (rawCode.startsWith("print(") || (currentStep.stdout && (!prevStep || currentStep.stdout !== prevStep.stdout))) {
    const printedText = (currentStep.stdout || "").trim();
    result.stepAction = {
      actionType: "output",
      theme: ACTION_THEMES.sky,
      badgeLabel: "CONSOLE OUTPUT",
      headline: `Printed to standard output`,
      floatingComment: printedText ? `Outputs "${printedText}" to terminal stdout.` : `Outputs text to console.`,
      fullExplanation: `The print() function evaluated its arguments and streamed the formatted text to stdout.`,
    };
    return result;
  }

  // 5. Function Call Annotation
  if (eventType === "call" && activeFrame && activeFrameId) {
    const fnName = activeFrame.function_name;
    const args = activeFrame.args || {};
    const argsList = Object.entries(args).map(([k, v]) => `${k} = ${v}`);
    const explanation = argsList.length > 0
      ? `Allocated stack frame for '${fnName}()'. Arguments bound: ${argsList.join(", ")}.`
      : `Allocated stack frame for '${fnName}()'.`;

    const isRec = Boolean(activeFrame.is_recursion || currentStep.is_recursion);
    const callerLineCode = activeFrame.caller_code || prevStep?.step_code || undefined;
    const callerLineNum = activeFrame.caller_line_number || currentStep.caller_line_number || undefined;

    result.callByFrame![activeFrameId] = {
      callerLine: callerLineCode,
      callerLineNumber: callerLineNum,
      isRecursion: isRec,
      fnName,
      args,
      explanation,
    };

    result.stepAction = {
      actionType: "fn_call",
      theme: isRec ? ACTION_THEMES.pink : ACTION_THEMES.purple,
      badgeLabel: isRec ? "RECURSIVE CALL" : "FUNCTION CALL",
      headline: isRec ? `Entering recursion '${fnName}()'` : `Entering function '${fnName}()'`,
      floatingComment: isRec && callerLineNum
        ? `Recursively called from Line ${callerLineNum}. Pushed new frame to Call Stack.`
        : `Pushed new frame for '${fnName}()' to Call Stack.`,
      fullExplanation: explanation,
      targetFrameId: activeFrameId,
    };
    return result;
  }

  // 6. Return Statement Annotation
  if ((eventType === "return" || rawCode.startsWith("return")) && activeFrame && activeFrameId) {
    const retVal = activeFrame.return_value || "None";
    let calcSteps: string[] | undefined = undefined;

    if (rawCode.startsWith("return ")) {
      const expr = rawCode.substring(7).trim();
      const localVars = activeFrame.local_vars || {};

      let substituted = expr;
      let hasReplacements = false;
      for (const [vName, vSnap] of Object.entries(localVars)) {
        if (!vSnap.is_pointer && substituted.includes(vName)) {
          const regex = new RegExp(`\\b${vName}\\b`, "g");
          substituted = substituted.replace(regex, vSnap.value_repr);
          hasReplacements = true;
        }
      }

      if (hasReplacements && substituted !== expr) {
        calcSteps = [`${expr}`, `= ${substituted}`, `= ${retVal}`];
      }
    }

    result.returnByFrame![activeFrameId] = {
      expression: rawCode.replace("return", "").trim() || retVal,
      calculatedSteps: calcSteps,
      returnValue: retVal,
    };

    result.stepAction = {
      actionType: "fn_return",
      theme: ACTION_THEMES.pink,
      badgeLabel: "FUNCTION RETURN",
      headline: `Returning value from '${activeFrame.function_name}()'`,
      floatingComment: `Returns value ${retVal} to caller. Frame will be popped from Call Stack.`,
      fullExplanation: `Execution of '${activeFrame.function_name}()' completed. Result value ${retVal} passes to caller.`,
      targetFrameId: activeFrameId,
    };
    return result;
  }

  // 7. Function Definition: def my_func(...)
  if (rawCode.startsWith("def ")) {
    const fnMatch = rawCode.match(/def\s+([a-zA-Z0-9_]+)/);
    const fnName = fnMatch ? fnMatch[1] : "function";
    result.stepAction = {
      actionType: "fn_def",
      theme: ACTION_THEMES.purple,
      badgeLabel: "FUNCTION DEFINED",
      headline: `Defined function '${fnName}()'`,
      floatingComment: `Created function object '${fnName}'. Stored in scope ready to be called.`,
      fullExplanation: `Python compiled '${fnName}()' into a callable function object. The body will not execute until called.`,
    };
    return result;
  }

  // 8. Conditional Annotation (if / elif / else)
  if (rawCode.startsWith("if ") || rawCode.startsWith("elif ") || rawCode.startsWith("else:")) {
    if (activeFrame && activeFrameId) {
      const condExpr = rawCode.replace(/^(if|elif)\s+/, "").replace(/:$/, "").trim();
      const localVars = activeFrame.local_vars || {};
      const operands: Array<{ name: string; value: string }> = [];

      let substituted = condExpr;
      for (const [vName, vSnap] of Object.entries(localVars)) {
        if (condExpr.includes(vName)) {
          operands.push({ name: vName, value: vSnap.value_repr });
          const regex = new RegExp(`\\b${vName}\\b`, "g");
          substituted = substituted.replace(regex, vSnap.value_repr);
        }
      }

      result.conditionByFrame![activeFrameId] = {
        conditionExpr: condExpr,
        operands,
        substitutedExpr: substituted,
        isTrue: true,
        branchTaken: "Condition is TRUE → branch executes",
      };

      result.stepAction = {
        actionType: "condition",
        theme: ACTION_THEMES.yellow,
        badgeLabel: "CONDITION EVALUATED",
        headline: `Evaluating branch: ${condExpr || "branch"}`,
        floatingComment: operands.length > 0
          ? `Condition (${substituted}) evaluated to TRUE. Entering block.`
          : `Branch evaluated to TRUE. Entering block.`,
        fullExplanation: `Python evaluated the boolean expression and selected this code path.`,
        targetFrameId: activeFrameId,
      };
      return result;
    }
  }

  // 9. Loop (for / while)
  if (rawCode.startsWith("for ") || rawCode.startsWith("while ")) {
    result.stepAction = {
      actionType: "loop",
      theme: ACTION_THEMES.indigo,
      badgeLabel: "LOOP ITERATION",
      headline: `Executing loop iteration`,
      floatingComment: `Advancing to the next loop iteration body.`,
      fullExplanation: `Python iterates over sequence items or repeats the loop body while the condition remains true.`,
    };
    return result;
  }

  // 10. Heap Mutation: e.g. "basket.append('cherry')" or list/dict item modification
  if (prevStep) {
    for (const [objId, currObj] of Object.entries(currentStep.heap || {})) {
      const prevObj = prevStep.heap ? prevStep.heap[objId] : null;
      if (prevObj && prevObj.repr_value !== currObj.repr_value) {
        const refs: string[] = [];
        for (const frame of currentStep.frames) {
          for (const [vName, vSnap] of Object.entries(frame.local_vars || {})) {
            if (vSnap.is_pointer && vSnap.object_id === objId && !refs.includes(vName)) {
              refs.push(vName);
            }
          }
        }

        let method = "mutated";
        if (rawCode.includes(".append(")) method = "append(...)";
        else if (rawCode.includes(".extend(")) method = "extend(...)";
        else if (rawCode.includes(".pop(")) method = "pop()";
        else if (rawCode.includes(".remove(")) method = "remove(...)";
        else if (rawCode.includes(".insert(")) method = "insert(...)";
        else if (rawCode.includes("[")) method = "item assignment";

        const isShared = refs.length >= 2;
        const explanation = isShared
          ? `Because ${refs.map((r) => `'${r}'`).join(" and ")} point to this SAME object in heap, both see this update immediately.`
          : `The object is modified in place in heap memory.`;

        result.mutationByObjectId![objId] = {
          objectId: objId,
          objectType: currObj.type_name,
          methodName: method,
          beforeValue: prevObj.repr_value,
          afterValue: currObj.repr_value,
          referencingVars: refs,
          explanation,
        };
        result.activeObjectId = objId;
        if (refs.length > 0) result.activeVarName = refs[0];

        result.stepAction = {
          actionType: "mutation",
          theme: ACTION_THEMES.amber,
          badgeLabel: "IN-PLACE MUTATION",
          headline: `Mutated ${currObj.type_name} #${objId.slice(-4)} (${method})`,
          floatingComment: isShared
            ? `Object mutated in-place. Both ${refs.map((r) => `'${r}'`).join(" & ")} see ${currObj.repr_value}!`
            : `Object mutated in-place on heap: ${currObj.repr_value}.`,
          fullExplanation: explanation,
          targetObjectId: objId,
          targetVar: refs[0],
        };
        return result;
      }
    }
  }

  // 11. Aliasing Assignment: e.g. "basket = fruits"
  if (
    rawCode.includes("=") &&
    !rawCode.includes("==") &&
    !rawCode.includes("+=") &&
    !rawCode.includes("-=") &&
    !rawCode.startsWith("def ")
  ) {
    const parts = rawCode.split("=");
    const lhs = parts[0].trim();
    const rhs = parts[1].trim();

    if (activeFrame) {
      const leftSnap = activeFrame.local_vars[lhs];
      const rightSnap = activeFrame.local_vars[rhs];

      if (
        leftSnap &&
        rightSnap &&
        leftSnap.object_id &&
        leftSnap.object_id === rightSnap.object_id
      ) {
        result.aliasingByVar![lhs] = {
          targetVar: lhs,
          sourceVar: rhs,
          objectId: leftSnap.object_id,
          objectType: leftSnap.type_name,
          explanation: `'${lhs}' does NOT create a new list. It copies the reference and points to the same List #${leftSnap.object_id.slice(-4)} as '${rhs}'.`,
        };
        result.activeVarName = lhs;
        result.activeObjectId = leftSnap.object_id;

        result.stepAction = {
          actionType: "aliasing",
          theme: ACTION_THEMES.cyan,
          badgeLabel: "SHARED REFERENCE (ALIAS)",
          headline: `'${lhs}' aliases '${rhs}' (Same Object)`,
          floatingComment: `Does NOT copy the object! '${lhs}' and '${rhs}' both point to the EXACT SAME object in heap.`,
          fullExplanation: `Python copies pointers/references on assignment. No new container was created in memory.`,
          targetVar: lhs,
          targetObjectId: leftSnap.object_id,
        };

        result.variableActionByVar![lhs] = {
          targetVar: lhs,
          actionType: "aliasing",
          theme: ACTION_THEMES.cyan,
          comment: `References existing ${leftSnap.type_name} #${leftSnap.object_id.slice(-4)} along with '${rhs}'`,
          isPointer: true,
          objectId: leftSnap.object_id,
        };
        return result;
      }
    }
  }

  // 12. Arithmetic Calculation Step (if currentCalc parsed)
  if (currentCalc) {
    result.stepAction = {
      actionType: "calculation",
      theme: ACTION_THEMES.indigo,
      badgeLabel: "CALCULATION",
      headline: `Calculated '${currentCalc.targetVar}' = ${currentCalc.result}`,
      floatingComment: `${currentCalc.expressionWithNames} → ${currentCalc.expressionWithValues} = ${currentCalc.result}`,
      fullExplanation: `Substituted local variable values into expression and computed the arithmetic result.`,
      targetVar: currentCalc.targetVar,
    };

    result.variableActionByVar![currentCalc.targetVar] = {
      targetVar: currentCalc.targetVar,
      actionType: "calculation",
      theme: ACTION_THEMES.indigo,
      comment: `Evaluated: ${currentCalc.expressionWithValues} = ${currentCalc.result}`,
      isPointer: false,
    };
    return result;
  }

  // 13. General Variable Assignment: e.g. "fruits = ['apple', 'banana']" or "x = 10"
  if (
    rawCode.includes("=") &&
    !rawCode.includes("==") &&
    !rawCode.startsWith("def ")
  ) {
    const parts = rawCode.split("=");
    const targetVar = parts[0].trim();

    if (activeFrame && activeFrame.local_vars[targetVar]) {
      const snap = activeFrame.local_vars[targetVar];
      result.activeVarName = targetVar;
      if (snap.object_id) result.activeObjectId = snap.object_id;

      const isPointer = Boolean(snap.is_pointer && snap.object_id);
      const headline = isPointer
        ? `Created ${snap.type_name} object on heap for '${targetVar}'`
        : `Assigned '${targetVar}' = ${snap.value_repr}`;

      const floatingComment = isPointer
        ? `Allocated new ${snap.type_name} #${snap.object_id?.slice(-4)} on heap; '${targetVar}' points to it.`
        : `Variable '${targetVar}' stored on stack with value ${snap.value_repr}.`;

      result.stepAction = {
        actionType: "var_assignment",
        theme: ACTION_THEMES.emerald,
        badgeLabel: isPointer ? "OBJECT ALLOCATED" : "VARIABLE ASSIGNMENT",
        headline,
        floatingComment,
        fullExplanation: `Python evaluated the right-hand side and bound the identifier '${targetVar}' to it.`,
        targetVar,
        targetObjectId: snap.object_id || undefined,
      };

      result.variableActionByVar![targetVar] = {
        targetVar,
        actionType: "var_assignment",
        theme: ACTION_THEMES.emerald,
        comment: floatingComment,
        isPointer,
        objectId: snap.object_id || undefined,
      };
      return result;
    }
  }

  // 14. Fallback: Find changed variable
  if (!result.activeVarName && activeFrame) {
    for (const [vName, vSnap] of Object.entries(activeFrame.local_vars || {})) {
      if (vSnap.is_changed) {
        result.activeVarName = vName;
        result.stepAction = {
          actionType: "var_assignment",
          theme: ACTION_THEMES.emerald,
          badgeLabel: "VARIABLE UPDATED",
          headline: `Updated variable '${vName}'`,
          floatingComment: `'${vName}' updated to ${vSnap.value_repr}.`,
          fullExplanation: `Local variable state updated in active frame.`,
          targetVar: vName,
        };

        result.variableActionByVar![vName] = {
          targetVar: vName,
          actionType: "var_assignment",
          theme: ACTION_THEMES.emerald,
          comment: `'${vName}' updated to ${vSnap.value_repr}`,
          isPointer: vSnap.is_pointer,
          objectId: vSnap.object_id || undefined,
        };
        break;
      }
    }
  }

  // 15. Default Fallback
  if (!result.stepAction) {
    result.stepAction = {
      actionType: "general",
      theme: ACTION_THEMES.slate,
      badgeLabel: "EXECUTED LINE",
      headline: `Executed line ${currentStep.line_number}`,
      floatingComment: `Executed statement: ${rawCode || "(empty)"}`,
      fullExplanation: `Python advanced the program counter to line ${currentStep.line_number}.`,
    };
  }

  return result;
}
