export interface VariableSnapshot {
  name: string;
  type_name: string;
  value_repr: string;
  object_id?: string | null;
  is_changed: boolean;
  is_pointer: boolean;
}

export interface FrameSnapshot {
  frame_id: string;
  function_name: string;
  line_number: number;
  depth: number;
  local_vars: Record<string, VariableSnapshot>;
  return_value?: string | null;
  call_id?: string;
  parent_call_id?: string | null;
  caller_line_number?: number | null;
  caller_code?: string | null;
  is_recursion?: boolean;
  is_active?: boolean;
  args?: Record<string, string>;
}

export interface MemorySnapshot {
  current_bytes: number;
  peak_bytes: number;
  delta_bytes: number;
}

export interface ExternalCallEvent {
  kind: "db" | "api" | string;
  action: string;
  target: string;
  payload?: any;
  result?: any;
  duration_ms: number;
}

export interface HeapObject {
  object_id: string;
  type_name: string;
  repr_value: string;
  elements?: Array<{ type: string; value: string; object_id?: string; is_ref?: boolean }>;
  key_values?: Record<string, { type: string; value: string; object_id?: string; is_ref?: boolean }>;
  attributes?: Record<string, { type: string; value: string; object_id?: string; is_ref?: boolean }>;
  is_tree_node?: boolean;
}

export interface TraceStep {
  step_index: number;
  line_number: number;
  event_type: "line" | "call" | "return" | "exception" | "external" | string;
  frames: FrameSnapshot[];
  all_frames?: FrameSnapshot[];
  heap: Record<string, HeapObject>;
  memory: MemorySnapshot;
  stdout: string;
  stderr: string;
  external_call?: ExternalCallEvent | null;
  caption?: string | null;
  step_code?: string;
  caller_line_number?: number | null;
  is_recursion?: boolean;
}

export interface TraceResult {
  success: boolean;
  total_steps: number;
  steps: TraceStep[];
  error?: string | null;
  execution_time_ms: number;
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate";
  code: string;
}
