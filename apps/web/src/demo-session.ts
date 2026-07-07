import { runTopDown } from "@dp-explorer/core";
import type { ExecutionFrame, PlaybackController } from "@dp-explorer/playback";
import { createPlaybackController } from "@dp-explorer/playback";
import { fibonacciSpec } from "@dp-explorer/templates";

export interface DemoSession {
  readonly controller: PlaybackController;
  currentFrame(): ExecutionFrame;
  next(): ExecutionFrame;
  previous(): ExecutionFrame;
  reset(): ExecutionFrame;
}

/**
 * Compose the architecture pipeline for the minimal web shell.
 *
 * This module orchestrates packages; it does not implement DP logic, trace
 * replay, or frame derivation.
 */
export function createFibonacciDemoSession(n = 5): DemoSession {
  const trace = runTopDown(fibonacciSpec, { n });
  const controller = createPlaybackController(trace);

  return Object.freeze({
    controller,
    currentFrame: () => controller.currentFrame(),
    next: () => controller.next(),
    previous: () => controller.previous(),
    reset: () => controller.seek(0)
  });
}
