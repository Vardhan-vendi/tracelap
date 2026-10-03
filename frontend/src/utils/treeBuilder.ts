import type { FrameSnapshot, TraceStep } from "../types/trace";

export interface RecursiveTreeNodeData {
  id: string;
  frame: FrameSnapshot;
  functionName: string;
  depth: number;
  parentId: string | null;
  children: RecursiveTreeNodeData[];
  args: Record<string, string>;
  returnValue?: string | null;
  isLeaf: boolean;
  isActive: boolean;
  isReturningNow: boolean;
  isReturned: boolean;
  isWaiting: boolean;
  waitingFor?: string;
  pendingExpression?: string;
  evaluatedCalculation?: string;
  returnedChildren: FrameSnapshot[];
}

export function detectBranchingRecursion(allFrames: FrameSnapshot[]): boolean {
  const childCountByParent: Record<string, number> = {};
  for (const f of allFrames) {
    const pId = f.parent_call_id;
    if (pId) {
      childCountByParent[pId] = (childCountByParent[pId] || 0) + 1;
      if (childCountByParent[pId] > 1) {
        return true;
      }
    }
  }
  return false;
}

export function formatNodeEvaluation(
  frame: FrameSnapshot,
  returnedChildren: FrameSnapshot[],
  waitingChildren: FrameSnapshot[]
): {
  waitingFor?: string;
  pendingExpression?: string;
  evaluatedCalculation?: string;
} {
  const funcName = frame.function_name;
  const isGlobal =
    funcName === "<module>" || funcName.toLowerCase().includes("global");
  if (isGlobal) return {};

  const callerCode = (frame.caller_code || "").trim();
  const localVars = frame.local_vars || {};
  const nVal = localVars["n"]?.value_repr || (frame.args && frame.args["n"]);

  // 1. If currently waiting for a child
  let waitingFor: string | undefined = undefined;
  if (waitingChildren.length > 0) {
    const nextChild = waitingChildren[0];
    const childArgs = Object.values(nextChild.args || {}).join(", ");
    waitingFor = `${nextChild.function_name}(${childArgs || ""})`;
  }

  // 2. Pending expression (e.g. 2 × factorial(1) or fib(1) + ?)
  let pendingExpression: string | undefined = undefined;
  if (waitingFor) {
    if (
      nVal &&
      (callerCode.includes("*") || funcName.toLowerCase().includes("fact"))
    ) {
      pendingExpression = `${nVal} × ${waitingFor}`;
    } else if (
      callerCode.includes("+") ||
      funcName.toLowerCase().includes("fib")
    ) {
      const returnedVal =
        returnedChildren.length > 0
          ? returnedChildren[0].return_value
          : "?";
      pendingExpression = `${returnedVal} + ${waitingFor}`;
    } else {
      pendingExpression = `${waitingFor}`;
    }
  }

  // 3. Evaluated calculation after child returns (e.g. 1 + 0 = 1 or 2 × 1 = 2)
  let evaluatedCalculation: string | undefined = undefined;
  if (returnedChildren.length > 0) {
    if (funcName.toLowerCase().includes("fact") || callerCode.includes("*")) {
      const childRet = returnedChildren[0]?.return_value;
      if (nVal && childRet) {
        const product = Number(nVal) * Number(childRet);
        const res = isNaN(product) ? frame.return_value : product;
        evaluatedCalculation = `${nVal} × ${childRet} = ${
          res || frame.return_value
        }`;
      }
    } else if (
      funcName.toLowerCase().includes("fib") ||
      callerCode.includes("+")
    ) {
      if (returnedChildren.length === 1) {
        const val1 = returnedChildren[0]?.return_value;
        evaluatedCalculation = `${val1} + ?`;
      } else if (returnedChildren.length >= 2) {
        const val1 = returnedChildren[0]?.return_value;
        const val2 = returnedChildren[1]?.return_value;
        const sum = Number(val1) + Number(val2);
        const res = isNaN(sum) ? frame.return_value : sum;
        evaluatedCalculation = `${val1} + ${val2} = ${
          res || frame.return_value
        }`;
      }
    } else if (frame.return_value) {
      const childParts = returnedChildren
        .map((c) => `${c.function_name}() → ${c.return_value}`)
        .join(", ");
      evaluatedCalculation = `${childParts} => return ${frame.return_value}`;
    }
  }

  return { waitingFor, pendingExpression, evaluatedCalculation };
}

export function buildRecursiveTreeHierarchy(
  allFrames: FrameSnapshot[],
  currentStep: TraceStep | null
): { roots: RecursiveTreeNodeData[]; hasBranching: boolean } {
  if (!allFrames || allFrames.length === 0) {
    return { roots: [], hasBranching: false };
  }

  const activeFrames = currentStep?.frames || [];
  const activeStackIds = new Set(
    activeFrames.map((f) => f.frame_id || f.call_id)
  );
  const activeLeafFrame =
    activeFrames.length > 0 ? activeFrames[activeFrames.length - 1] : null;
  const leafId = activeLeafFrame?.frame_id || activeLeafFrame?.call_id;

  const hasBranching = detectBranchingRecursion(allFrames);

  // Map each frame ID to its snapshot
  const frameMap = new Map<string, FrameSnapshot>();
  allFrames.forEach((f) => {
    const id = f.frame_id || f.call_id || "";
    if (id) frameMap.set(id, f);
  });

  // Group children by parent_call_id
  const childrenMap = new Map<string, FrameSnapshot[]>();
  allFrames.forEach((f) => {
    const pId = f.parent_call_id || "";
    if (!childrenMap.has(pId)) {
      childrenMap.set(pId, []);
    }
    childrenMap.get(pId)!.push(f);
  });

  // Identify roots:
  // If there's a Global Scope / <module> frame, its children are the recursive root(s).
  // Otherwise, any frame with no parent or whose parent is not in allFrames is a root.
  const globalFrame = allFrames.find(
    (f) =>
      f.function_name === "<module>" ||
      f.function_name.toLowerCase().includes("global")
  );
  const globalId = globalFrame ? globalFrame.frame_id || globalFrame.call_id : null;

  let rootSnapshots: FrameSnapshot[] = [];
  if (globalId && childrenMap.has(globalId) && childrenMap.get(globalId)!.length > 0) {
    rootSnapshots = childrenMap.get(globalId)!;
  } else {
    rootSnapshots = allFrames.filter((f) => {
      const isGlobal =
        f.function_name === "<module>" ||
        f.function_name.toLowerCase().includes("global");
      if (isGlobal && allFrames.length > 1) return false;
      return !f.parent_call_id || !frameMap.has(f.parent_call_id);
    });
  }

  // If still empty, use first frame
  if (rootSnapshots.length === 0 && allFrames.length > 0) {
    rootSnapshots = [allFrames[0]];
  }

  function buildNode(frame: FrameSnapshot): RecursiveTreeNodeData {
    const id = frame.frame_id || frame.call_id || "";
    const directChildrenSnaps = childrenMap.get(id) || [];

    const returnedChildren = directChildrenSnaps.filter(
      (c) => c.return_value != null
    );
    const waitingChildren = directChildrenSnaps.filter(
      (c) => activeStackIds.has(c.frame_id || c.call_id) && c.return_value == null
    );

    const isActive = activeStackIds.has(id);
    const isLeaf = id === leafId;
    const isReturningNow =
      isLeaf &&
      (currentStep?.event_type === "return" ||
        (Boolean(currentStep?.step_code?.startsWith("return")) &&
          frame.return_value != null));
    const isReturned = !isActive && frame.return_value != null;
    const isWaiting = isActive && !isLeaf && !isReturningNow;

    const evaluation = formatNodeEvaluation(
      frame,
      returnedChildren,
      waitingChildren
    );

    const childrenNodes = directChildrenSnaps.map((childSnap) =>
      buildNode(childSnap)
    );

    return {
      id,
      frame,
      functionName: frame.function_name,
      depth: frame.depth ?? 0,
      parentId: frame.parent_call_id || null,
      children: childrenNodes,
      args: frame.args || {},
      returnValue: frame.return_value,
      isLeaf,
      isActive,
      isReturningNow,
      isReturned,
      isWaiting,
      waitingFor: evaluation.waitingFor,
      pendingExpression: evaluation.pendingExpression,
      evaluatedCalculation: evaluation.evaluatedCalculation,
      returnedChildren,
    };
  }

  const roots = rootSnapshots.map((rootSnap) => buildNode(rootSnap));
  return { roots, hasBranching };
}
