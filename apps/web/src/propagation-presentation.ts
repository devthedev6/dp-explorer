import { EventType } from "@dp-explorer/core";
import type { TraceEventId } from "@dp-explorer/core";
import type { PlaybackFrame, PropagationExecutionFrame } from "@dp-explorer/playback";

export type PropagationEventTone = "seed" | "process" | "transition" | "update" | "complete";

export interface PropagationEventPresentation {
  readonly label: string;
  readonly summary: string;
  readonly tone: PropagationEventTone;
  readonly processId: TraceEventId | null;
}

export function getPropagationEventPresentation(
  frame: PropagationExecutionFrame
): PropagationEventPresentation {
  const event = frame.currentEvent;

  switch (event.type) {
    case EventType.PropagationSeed:
      return {
        label: "Seed value",
        summary: `State ${event.state} starts with value ${event.value}.`,
        tone: "seed",
        processId: null
      };
    case EventType.PropagationProcess:
      return {
        label: "Process state",
        summary: `State ${event.state} is distributing value ${event.value}.`,
        tone: "process",
        processId: event.id
      };
    case EventType.PropagationTransition:
      return {
        label: "Send contribution",
        summary: `State ${event.source} sends contribution ${event.contribution} to ${event.target}.`,
        tone: "transition",
        processId: event.processId
      };
    case EventType.PropagationUpdate:
      return {
        label: event.operation === "initialize" ? "Initialize target" : "Aggregate contribution",
        summary:
          event.operation === "initialize"
            ? `State ${event.target} receives its first value from ${event.source}.`
            : `State ${event.target} combines an existing value with the new contribution.`,
        tone: "update",
        processId: event.processId
      };
    case EventType.PropagationComplete:
      return {
        label: "Finish processing",
        summary: `State ${event.state} has emitted its scheduled contributions.`,
        tone: "complete",
        processId: event.processId
      };
    case EventType.Complete:
      return {
        label: "Execution complete",
        summary: `The propagation execution answer is ${event.answer}.`,
        tone: "complete",
        processId: null
      };
  }
}

export function formatPropagationLifecycle(processId: TraceEventId | null): string | null {
  return processId === null ? null : `Processing cycle #${processId}`;
}

export function formatPropagationValue(value: number | null): string {
  return value === null ? "No prior value" : String(value);
}

export function isPropagationFrame(frame: PlaybackFrame): frame is PropagationExecutionFrame {
  return "processedState" in frame;
}
