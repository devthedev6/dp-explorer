import { EventType } from "@dp-explorer/core";
import type { PlaybackFrame, PropagationExecutionFrame } from "@dp-explorer/playback";

import {
  formatPropagationLifecycle,
  formatPropagationValue,
  getPropagationEventPresentation,
  isPropagationFrame
} from "./propagation-presentation";
import "./frame-details.css";

export interface FrameDetailsProps {
  readonly frame: PlaybackFrame;
}

export function FrameDetails({ frame }: FrameDetailsProps) {
  const propagationPresentation = isPropagationFrame(frame)
    ? getPropagationEventPresentation(frame)
    : null;

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
          <dd data-testid="event-type" data-event-tone={propagationPresentation?.tone}>
            {propagationPresentation?.label ?? frame.currentEvent.type}
          </dd>
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
  const presentation = getPropagationEventPresentation(frame);
  const lifecycle = formatPropagationLifecycle(presentation.processId);

  return (
    <section className="propagation-details">
      <h2>Propagation event</h2>
      <div
        className="propagation-event-summary"
        data-event-tone={presentation.tone}
        data-testid="propagation-event-summary"
      >
        <span>{presentation.label}</span>
        <p>{presentation.summary}</p>
        {lifecycle && <strong data-testid="propagation-process-lifecycle">{lifecycle}</strong>}
      </div>
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
              ? "Not specified by frame"
              : "N/A"}
          </dd>
        </div>
      </dl>
      {event.type === EventType.PropagationUpdate && <PropagationUpdateEquation frame={frame} />}
    </section>
  );
}

function PropagationUpdateEquation({ frame }: { readonly frame: PropagationExecutionFrame }) {
  const event = frame.currentEvent;

  if (event.type !== EventType.PropagationUpdate) {
    return null;
  }

  const isInitialization = event.operation === "initialize";

  return (
    <div
      className="propagation-update-equation"
      data-mode={event.operation}
      data-testid="propagation-update-equation"
    >
      <span className="propagation-equation-term">
        <span>{isInitialization ? "Previous value" : "Previous"}</span>
        <strong data-testid="equation-previous">
          {formatPropagationValue(event.previousValue)}
        </strong>
      </span>
      <span className="propagation-equation-operator" aria-hidden="true">
        {isInitialization ? "-&gt;" : "+"}
      </span>
      <span className="propagation-equation-term">
        <span>{isInitialization ? "Contribution" : "Contribution"}</span>
        <strong data-testid="equation-contribution">{event.contribution}</strong>
      </span>
      {!isInitialization && (
        <span className="propagation-equation-operator" aria-hidden="true">
          -&gt;
        </span>
      )}
      <span className="propagation-equation-term propagation-equation-term--result">
        <span>Updated value</span>
        <strong data-testid="equation-result">{event.updatedValue}</strong>
      </span>
    </div>
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
  return operation === "initialize" ? "Initialization" : "Aggregation";
}
