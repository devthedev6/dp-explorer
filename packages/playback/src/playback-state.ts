import type { ExecutionTrace } from "@dp-explorer/core";

import type { ExecutionFrame } from "./frame";

/**
 * Immutable state owned by a playback controller or caller.
 *
 * It joins the trace, current index, and current frame without timers,
 * transport status, UI lifecycle, or visualization concerns.
 */
export interface PlaybackState {
  readonly trace: ExecutionTrace;
  readonly currentIndex: number;
  readonly frame: ExecutionFrame;
}

/**
 * Construction options for a playback controller.
 */
export interface PlaybackControllerOptions {
  readonly initialIndex?: number;
}

/**
 * Pure navigation contract over an execution trace.
 */
export interface PlaybackController {
  next(): ExecutionFrame;
  previous(): ExecutionFrame;
  seek(index: number): ExecutionFrame;
  currentFrame(): ExecutionFrame;
}
