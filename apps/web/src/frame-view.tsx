import type { ExecutionFrame, PlaybackFrame } from "@dp-explorer/playback";

import { DPTable } from "./dp-table";
import { getPropagationEventPresentation, isPropagationFrame } from "./propagation-presentation";
import { PropagationTransitionView } from "./propagation-transition";
import { RecursionTreeView } from "./recursion-tree";

export interface FrameViewProps {
  readonly frame: PlaybackFrame;
}

/**
 * Minimal frame renderer for the shell milestone.
 *
 * It consumes only playback frame data and never reads the underlying trace.
 */
export function FrameView({ frame }: FrameViewProps) {
  const propagationPresentation = isPropagationFrame(frame)
    ? getPropagationEventPresentation(frame)
    : null;

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
          <dd data-testid="event-type">
            {propagationPresentation?.label ?? frame.currentEvent.type}
          </dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd data-testid="current-state">{readCurrentState(frame) ?? "N/A"}</dd>
        </div>
      </dl>

      <section>
        <h2>Call stack</h2>
        <ul data-testid="call-stack">
          {isFunctionalFrame(frame) && frame.callStack.length === 0 ? (
            <li>Empty</li>
          ) : isFunctionalFrame(frame) ? (
            frame.callStack.map((state, index) => <li key={`${state}-${index}`}>{state}</li>)
          ) : (
            <li>Not available for propagation</li>
          )}
        </ul>
      </section>

      <section>{isFunctionalFrame(frame) ? <RecursionTreeView frame={frame} /> : null}</section>

      <section>
        <PropagationTransitionView frame={frame} />
      </section>

      <section>
        <DPTable frame={frame} />
      </section>
    </section>
  );
}

function readCurrentState(frame: PlaybackFrame): string | null {
  const event = frame.currentEvent;
  if ("state" in event) return event.state;
  if ("source" in event) return event.source;
  return null;
}

function isFunctionalFrame(frame: PlaybackFrame): frame is ExecutionFrame {
  return "callStack" in frame;
}
