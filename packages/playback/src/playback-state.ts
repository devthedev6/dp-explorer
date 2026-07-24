import type { ExecutionTrace, PropagationExecutionTrace } from "@dp-explorer/core";

import type { ExecutionFrame, PlaybackFrame } from "./frame";

export type PlaybackTrace = ExecutionTrace | PropagationExecutionTrace;

/**
 * Immutable state owned by a playback controller or caller.
 *
 * It joins the trace, current index, and current frame without timers,
 * transport status, UI lifecycle, or visualization concerns.
 */
export interface PlaybackState<
  Trace extends PlaybackTrace = ExecutionTrace,
  Frame extends PlaybackFrame = ExecutionFrame
> {
  readonly trace: Trace;
  readonly currentIndex: number;
  readonly frame: Frame;
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
export interface PlaybackController<Frame extends PlaybackFrame = ExecutionFrame> {
  next(): Frame;
  previous(): Frame;
  seek(index: number): Frame;
  currentFrame(): Frame;
}
