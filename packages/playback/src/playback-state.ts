import type { ExecutionTrace } from "@dp-explorer/core";

import type { ExecutionFrame } from "./frame";

/**
 * User-facing playback transport status.
 *
 * Timing belongs to callers such as the web app; this status only describes
 * whether the current navigation state is advancing automatically.
 */
export type PlaybackStatus = "playing" | "paused";

/**
 * Immutable state owned by a playback controller or caller.
 *
 * It joins the trace, current frame, and navigation preferences without
 * executing algorithms or knowing any visualization framework.
 */
export interface PlaybackState {
  readonly trace: ExecutionTrace;
  readonly currentIndex: number;
  readonly frame: ExecutionFrame;
  readonly status: PlaybackStatus;
  readonly speed: number;
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
