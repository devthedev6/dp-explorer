import { EventType } from "@dp-explorer/core";
import type { PlaybackFrame, PropagationExecutionFrame } from "@dp-explorer/playback";

import "./frame-details.css";

export interface FrameDetailsProps {
  readonly frame: PlaybackFrame;
}

export function FrameDetails({ frame }: FrameDetailsProps) {
  return (
    <section className="frame-details" aria-label="Current execution frame">
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

      {isPropagationFrame(frame) ? (
        <PropagationDetails frame={frame} />
      ) : (
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
      )}
    </section>
  );
}

function PropagationDetails({ frame }: { readonly frame: PropagationExecutionFrame }) {
  const event = frame.currentEvent;

  return (
    <section>
      <h2>Propagation event</h2>
      <dl className="frame-details-nested">
        <div>
          <dt>Processed state</dt>
          <dd data-testid="processed-state">{frame.processedState ?? "N/A"}</dd>
        </div>
        <div>
          <dt>Source state</dt>
          <dd data-testid="propagation-source">
            {"source" in event ? event.source : (frame.activeTransition?.source ?? "N/A")}
          </dd>
        </div>
        <div>
          <dt>Target state</dt>
          <dd data-testid="propagation-target">
            {"target" in event ? event.target : (frame.activeTransition?.target ?? "N/A")}
          </dd>
        </div>
        <div>
          <dt>Previous value</dt>
          <dd data-testid="previous-value">
            {event.type === EventType.PropagationUpdate
              ? formatNullableNumber(event.previousValue)
              : "N/A"}
          </dd>
        </div>
        <div>
          <dt>Contribution</dt>
          <dd data-testid="contribution">
            {"contribution" in event
              ? event.contribution
              : (frame.activeTransition?.contribution ?? "N/A")}
          </dd>
        </div>
        <div>
          <dt>Updated value</dt>
          <dd data-testid="updated-value">
            {event.type === EventType.PropagationUpdate
              ? event.updatedValue
              : (frame.updatedState?.value ?? "N/A")}
          </dd>
        </div>
        <div>
          <dt>Update mode</dt>
          <dd data-testid="update-mode">
            {event.type === EventType.PropagationUpdate ? formatOperation(event.operation) : "N/A"}
          </dd>
        </div>
        <div>
          <dt>Aggregation operation</dt>
          <dd data-testid="aggregation-operation">
            {event.type === EventType.PropagationUpdate && event.operation === "aggregate"
              ? "aggregate"
              : "N/A"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function readCurrentState(frame: PlaybackFrame): string | null {
  const event = frame.currentEvent;
  if ("state" in event) return event.state;
  if ("source" in event) return event.source;
  return null;
}

function formatNullableNumber(value: number | null): string | number {
  return value ?? "N/A";
}

function formatOperation(operation: "initialize" | "aggregate"): string {
  return operation === "initialize" ? "initialized" : "aggregated";
}

function isPropagationFrame(frame: PlaybackFrame): frame is PropagationExecutionFrame {
  return "processedState" in frame;
}
