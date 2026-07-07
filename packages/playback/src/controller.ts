import type { ExecutionTrace } from "@dp-explorer/core";

import { buildExecutionFrame } from "./frame-builder";
import type { ExecutionFrame } from "./frame";
import type { PlaybackController, PlaybackControllerOptions } from "./playback-state";

/**
 * Create a deterministic playback controller for an immutable execution trace.
 *
 * The controller owns only the current frame index. It does not execute
 * algorithms, schedule timers, or mutate the trace.
 */
export function createPlaybackController(
  trace: ExecutionTrace,
  options: PlaybackControllerOptions = {}
): PlaybackController {
  if (trace.events.length === 0) {
    throw new Error("Cannot create a PlaybackController for an empty ExecutionTrace.");
  }

  let currentIndex = clampFrameIndex(options.initialIndex ?? 0, trace.events.length);

  const frameAt = (index: number): ExecutionFrame => buildExecutionFrame(trace, index);

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
