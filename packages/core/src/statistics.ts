/**
 * Running counts derived by scanning trace events.
 *
 * Statistics are intentionally not part of `ExecutionFrame`; the visualization
 * layer asks for them on demand so playback remains a deterministic state
 * machine over trace position.
 */
export interface ExecutionStatistics {
  readonly callCount: number;
  readonly memoHitCount: number;
  readonly baseCaseCount: number;
  readonly readCount: number;
  readonly transitionCount: number;
  readonly writeCount: number;
  readonly returnCount: number;
}

/**
 * Identifies the frame range used to derive a statistics snapshot.
 */
export interface StatisticsScope {
  readonly upToIndex: number;
}
