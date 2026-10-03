import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { TraceStep, FrameSnapshot } from "../types/trace";

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export function buildGraphFromStep(step: TraceStep | null): GraphData {
  if (!step) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Determine frames to render:
  // Use all_frames (which tracks active frames + completed/dull historical frames)
  // Fallback to step.frames if all_frames is empty.
  const rawFrames: FrameSnapshot[] =
    step.all_frames && step.all_frames.length > 0 ? step.all_frames : step.frames;

  // Detect if this is a recursive or tree-like call hierarchy
  const hasTreeCalls = rawFrames.some((f) => Boolean(f.parent_call_id));

  // Layout coordinates:
  // Left column (X: 50): Stack & Call Frames
  // Right column (X: 480): Heap Objects (Lists, Dicts, Custom Objects, Trees)
  let currentY = 50;

  // Track frame positions for tree edges
  const frameYPositions: Record<string, number> = {};

  // 1. Render Call Stack & Frames
  rawFrames.forEach((frame, frameIdx) => {
    const callKey = frame.call_id || frame.frame_id;
    const frameNodeId = `frame_${callKey}`;
    const isActive = frame.is_active !== false;

    // Indent recursive / child calls slightly to show tree hierarchy
    const indentX = hasTreeCalls ? 50 + Math.min(frame.depth, 4) * 24 : 50;
    const frameWidth = hasTreeCalls ? 320 : 330;

    const varEntries = Object.entries(frame.local_vars || {});
    const varCount = varEntries.length;

    // Only render inner variable cards if frame is active or has variables
    const showVariables = isActive && varCount > 0;
    const varBlockHeight = showVariables ? varCount * 58 : 0;
    const argsCount = frame.args ? Object.keys(frame.args).length : 0;
    const argsHeight = argsCount > 0 ? 32 : 0;
    const returnHeight = frame.return_value ? 34 : 0;

    const frameHeight = Math.max(85, 65 + argsHeight + returnHeight + varBlockHeight);

    frameYPositions[callKey] = currentY;

    // Call Frame Container Node
    nodes.push({
      id: frameNodeId,
      type: "frameNode",
      position: { x: indentX, y: currentY },
      data: {
        functionName: frame.function_name,
        depth: frame.depth,
        lineNumber: frame.line_number,
        returnValue: frame.return_value,
        isTop: isActive && frameIdx === rawFrames.length - 1,
        isActive: isActive,
        args: frame.args,
        callId: frame.call_id,
        parentCallId: frame.parent_call_id,
      },
      style: {
        width: frameWidth,
        minHeight: frameHeight,
        zIndex: isActive ? 5 : 1,
      },
    });

    // If this is a child call with a parent call, draw tree edge connecting parent to child!
    if (frame.parent_call_id && frameYPositions[frame.parent_call_id] !== undefined) {
      const parentNodeId = `frame_${frame.parent_call_id}`;
      edges.push({
        id: `tree_edge_${parentNodeId}_to_${frameNodeId}`,
        source: parentNodeId,
        target: frameNodeId,
        animated: isActive,
        style: {
          stroke: isActive ? "#6366f1" : "#64748b",
          strokeWidth: isActive ? 2.5 : 1.5,
          strokeDasharray: isActive ? undefined : "4 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? "#6366f1" : "#64748b",
        },
        label: frame.return_value ? `⮐ ${frame.return_value}` : "call",
        labelStyle: {
          fill: frame.return_value ? "#34d399" : "#a5b4fc",
          fontSize: 10,
          fontWeight: 700,
        },
      });
    }

    // Render Variables within the frame (if active)
    if (showVariables) {
      let varYOffset = 48 + argsHeight;
      varEntries.forEach(([varName, varSnap]) => {
        const varNodeId = `var_${callKey}_${varName}`;

        nodes.push({
          id: varNodeId,
          type: "variableNode",
          position: { x: indentX + 16, y: currentY + varYOffset },
          data: {
            name: varSnap.name,
            typeName: varSnap.type_name,
            valueRepr: varSnap.value_repr,
            isChanged: varSnap.is_changed,
            isPointer: varSnap.is_pointer,
            objectId: varSnap.object_id,
          },
          style: {
            width: frameWidth - 32,
            zIndex: isActive ? 10 : 2,
          },
        });

        // Linkage: If variable points to a heap object, create a clean directed arrow
        if (varSnap.is_pointer && varSnap.object_id && step.heap[varSnap.object_id]) {
          const targetHeapId = `heap_${varSnap.object_id}`;
          edges.push({
            id: `edge_${varNodeId}_to_${targetHeapId}`,
            source: varNodeId,
            target: targetHeapId,
            animated: varSnap.is_changed,
            style: {
              stroke: varSnap.is_changed ? "#ec4899" : "#06b6d4",
              strokeWidth: varSnap.is_changed ? 2.5 : 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: varSnap.is_changed ? "#ec4899" : "#06b6d4",
            },
          });
        }

        varYOffset += 58;
      });
    }

    currentY += frameHeight + 32;
  });

  // 2. Render Heap Objects (Right Column, X: 480)
  let heapY = 50;
  const heapEntries = Object.entries(step.heap);

  heapEntries.forEach(([objId, heapObj]) => {
    const heapNodeId = `heap_${objId}`;
    nodes.push({
      id: heapNodeId,
      type: "heapObjectNode",
      position: { x: 480, y: heapY },
      data: {
        objectId: objId,
        typeName: heapObj.type_name,
        reprValue: heapObj.repr_value,
        elements: heapObj.elements,
        keyValues: heapObj.key_values,
        attributes: heapObj.attributes,
        isTreeNode: heapObj.is_tree_node,
      },
      style: {
        width: 320,
        zIndex: 5,
      },
    });

    // Detect internal object linkages (e.g. tree nodes pointing to left/right children)
    if (heapObj.attributes) {
      Object.entries(heapObj.attributes).forEach(([attrName, attrVal]) => {
        if (attrVal && attrVal.is_ref && attrVal.object_id && step.heap[attrVal.object_id]) {
          const childHeapId = `heap_${attrVal.object_id}`;
          edges.push({
            id: `edge_${heapNodeId}_attr_${attrName}_to_${childHeapId}`,
            source: heapNodeId,
            target: childHeapId,
            animated: true,
            style: {
              stroke: "#a855f7",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#a855f7",
            },
            label: `.${attrName}`,
            labelStyle: { fill: "#c084fc", fontSize: 10, fontWeight: 700 },
          });
        }
      });
    }

    // Detect nested list/tuple element linkages
    if (heapObj.elements) {
      heapObj.elements.forEach((el, elIdx) => {
        if (el && el.is_ref && el.object_id && step.heap[el.object_id]) {
          const childHeapId = `heap_${el.object_id}`;
          edges.push({
            id: `edge_${heapNodeId}_el_${elIdx}_to_${childHeapId}`,
            source: heapNodeId,
            target: childHeapId,
            animated: false,
            style: {
              stroke: "#06b6d4",
              strokeWidth: 1.8,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#06b6d4",
            },
            label: `[${elIdx}]`,
            labelStyle: { fill: "#38bdf8", fontSize: 10, fontWeight: 600 },
          });
        }
      });
    }

    heapY += 170;
  });

  // 3. Render External System Call Node (Mock DB / API)
  if (step.external_call) {
    const extId = `ext_${step.step_index}`;
    nodes.push({
      id: extId,
      type: "externalCallNode",
      position: { x: 280, y: Math.max(currentY, heapY) + 30 },
      data: {
        kind: step.external_call.kind,
        action: step.external_call.action,
        target: step.external_call.target,
        payload: step.external_call.payload,
        result: step.external_call.result,
        durationMs: step.external_call.duration_ms,
      },
      style: {
        width: 360,
        zIndex: 10,
      },
    });
  }

  return { nodes, edges };
}
