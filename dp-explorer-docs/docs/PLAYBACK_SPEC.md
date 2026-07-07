# Playback Engine Specification

The Playback Engine is a **pure, deterministic state machine** over
`(ExecutionTrace, currentIndex)`. Its only responsibility is: given a trace
and an index, produce the correct `ExecutionFrame`.

It has no knowledge of DP algorithms, problem domains, timers, or UI
frameworks. How it is driven — `requestAnimationFrame`, `setInterval`, manual
stepping in tests — is the caller's concern entirely.

## `PlaybackController` Interface

```typescript
interface PlaybackController {
  /**
   * Advance one step. No-op at the last frame.
   * Returns the ExecutionFrame at the new index.
   */
  next(): ExecutionFrame;

  /**
   * Retreat one step. No-op at the first frame.
   * Returns the ExecutionFrame at the new index.
   */
  previous(): ExecutionFrame;

  /**
   * Jump to an arbitrary frame index.
   * Index is clamped to [0, totalFrames − 1].
   * Returns the ExecutionFrame at the clamped index.
   */
  seek(index: number): ExecutionFrame;

  /**
   * Return the ExecutionFrame at the current index without advancing.
   * Equivalent to seek(currentIndex) but does not change state.
   */
  currentFrame(): ExecutionFrame;
}
```

## Factory

```typescript
/**
 * Create a PlaybackController for a given trace, positioned at frame 0.
 */
function createPlaybackController(
  trace: ExecutionTrace,
  options?: { initialIndex?: number }
): PlaybackController;
```

## Behavioral Guarantees

- **Deterministic and idempotent.** `seek(i)` always returns the same
  `ExecutionFrame` for the same trace and the same `i`, regardless of the
  sequence of prior navigation calls.

- **Bounded.** `next()` at the last frame and `previous()` at the first frame
  are no-ops — they return the current frame unchanged without throwing.

- **No side effects.** The controller produces frames; it does not schedule
  timers, emit events, or mutate external state.

## Integration Notes

These are **implementation details**, not architectural contracts. They are
recorded here for convenience only.

### React

A thin hook in `apps/web` owns the controller's lifecycle and drives it with
a timer:

```typescript
// apps/web — implementation detail, not part of packages/playback
function usePlayback(trace: ExecutionTrace): {
  frame: ExecutionFrame;
  controller: PlaybackController;
};
```

The hook:
1. Creates the controller once via `useRef` (stable reference across renders).
2. Manages a `isPlaying` boolean in React state.
3. Runs a `useEffect` with `setInterval` (or `requestAnimationFrame`) that
   calls `controller.next()` and updates the frame in React state on each tick.
4. Exposes `controller` directly so the UI can call `seek`, `next`, and
   `previous` in response to user interaction.

The choice between `setInterval` and `requestAnimationFrame`, the base tick
interval, and the speed multiplier representation are all implementation
decisions owned by `apps/web`.

### Testing

In tests, call `next()`, `previous()`, and `seek()` directly. No timer mocking
is required because the controller owns no timers.
