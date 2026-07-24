import type { ExecutionTrace, PropagationExecutionTrace } from "@dp-explorer/core";

import { buildExecutionFrame, buildPropagationExecutionFrame } from "./frame-builder";
import type { ExecutionFrame, PlaybackFrame, PropagationExecutionFrame } from "./frame";
import type {
  PlaybackController,
  PlaybackControllerOptions,
  PlaybackTrace
} from "./playback-state";

/**
 * Create a deterministic playback controller for an immutable execution trace.
 *
 * The controller owns only the current frame index. It does not execute
 * algorithms, schedule timers, or mutate the trace.
 */
export function createPlaybackController(
  trace: ExecutionTrace,
  options?: PlaybackControllerOptions
): PlaybackController<ExecutionFrame>;
export function createPlaybackController(
  trace: PropagationExecutionTrace,
  options?: PlaybackControllerOptions
): PlaybackController<PropagationExecutionFrame>;
export function createPlaybackController(
  trace: PlaybackTrace,
  options: PlaybackControllerOptions = {}
): PlaybackController<PlaybackFrame> {
  if (trace.events.length === 0) {
    throw new Error("Cannot create a PlaybackController for an empty ExecutionTrace.");
  }

  let currentIndex = clampFrameIndex(options.initialIndex ?? 0, trace.events.length);

  const frameAt = (index: number): PlaybackFrame =>
    trace.mode === "propagation"
      ? buildPropagationExecutionFrame(trace, index)
      : buildExecutionFrame(trace, index);

  return Object.freeze({
    next: () => {
      currentIndex = clampFrameIndex(currentIndex + 1, trace.events.length);
      return frameAt(currentIndex);
    },
    previous: () => {
      currentIndex = clampFrameIndex(currentIndex - 1, trace.events.length);
      return frameAt(currentIndex);
    },
    seek: (index: number) => {
      currentIndex = clampFrameIndex(index, trace.events.length);
      return frameAt(currentIndex);
    },
    currentFrame: () => frameAt(currentIndex)
  });
}

function clampFrameIndex(index: number, totalFrames: number): number {
  if (Number.isNaN(index)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(index), 0), totalFrames - 1);
}
