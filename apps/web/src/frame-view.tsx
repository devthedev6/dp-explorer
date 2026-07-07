import type { ExecutionFrame } from "@dp-explorer/playback";

export interface FrameViewProps {
  readonly frame: ExecutionFrame;
}

/**
 * Minimal frame renderer for the shell milestone.
 *
 * It consumes only `ExecutionFrame` data and never reads the underlying trace.
 */
export function FrameView({ frame }: FrameViewProps) {
  return (
    <section aria-label="Current execution frame">
      <dl>
        <div>
          <dt>Current frame</dt>
          <dd data-testid="frame-position">
            {frame.frameIndex + 1} / {frame.totalFrames}
          </dd>
        </div>
        <div>
          <dt>Current event</dt>
          <dd data-testid="event-type">{frame.currentEvent.type}</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd data-testid="current-state">{readCurrentState(frame) ?? "N/A"}</dd>
        </div>
      </dl>

      <section>
        <h2>Call stack</h2>
        <ul data-testid="call-stack">
          {frame.callStack.length === 0 ? (
            <li>Empty</li>
          ) : (
            frame.callStack.map((state, index) => <li key={`${state}-${index}`}>{state}</li>)
          )}
        </ul>
      </section>

      <section>
        <h2>DP snapshot</h2>
        <pre data-testid="dp-snapshot">
          {JSON.stringify(Object.fromEntries(frame.dpSnapshot.entries()), null, 2)}
        </pre>
      </section>
    </section>
  );
}

function readCurrentState(frame: ExecutionFrame): string | null {
  return "state" in frame.currentEvent ? frame.currentEvent.state : null;
}
