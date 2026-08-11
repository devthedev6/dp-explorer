import type { PlaybackFrame } from "@dp-explorer/playback";

import {
  formatPropagationLifecycle,
  getPropagationEventPresentation,
  isPropagationFrame
} from "./propagation-presentation";
import "./propagation-transition.css";

export interface PropagationTransitionViewProps {
  readonly frame: PlaybackFrame;
}

export function PropagationTransitionView({ frame }: PropagationTransitionViewProps) {
  if (!isPropagationFrame(frame)) {
    return null;
  }

  const transition = frame.activeTransition;
  const updatedState = frame.updatedState;
  const presentation = getPropagationEventPresentation(frame);
  const lifecycle = formatPropagationLifecycle(presentation.processId);

  return (
    <section
      aria-label="Propagation transition"
      className="propagation-transition-panel"
      data-event-tone={presentation.tone}
    >
      <div className="propagation-transition-header">
        <div>
          <h2>Propagation flow</h2>
          <p data-testid="propagation-transition-summary">{presentation.summary}</p>
        </div>
        <span className="propagation-event-badge" data-testid="propagation-event-badge">
          {presentation.label}
        </span>
      </div>
      {lifecycle && (
        <span className="propagation-lifecycle" data-testid="propagation-lifecycle">
          {lifecycle}
        </span>
      )}
      {transition === null ? (
        <div className="propagation-transition-empty" data-testid="propagation-transition-empty">
          <span>Processing state</span>
          <strong>{frame.processedState ?? "N/A"}</strong>
        </div>
      ) : (
        <div
          className="propagation-transition-edge"
          data-testid="propagation-transition-edge"
          data-active="true"
        >
          <div className="propagation-transition-state propagation-transition-state--source">
            <span>Source</span>
            <strong data-testid="transition-source">{transition.source}</strong>
          </div>
          <span className="propagation-transition-arrow" aria-hidden="true">
            -&gt;
          </span>
          <div
            className="propagation-transition-state propagation-transition-state--target"
            data-updated={updatedState?.state === transition.target ? "true" : "false"}
          >
            <span>{updatedState?.state === transition.target ? "Updated target" : "Target"}</span>
            <strong data-testid="transition-target">{transition.target}</strong>
          </div>
          <span
            className="propagation-transition-contribution"
            data-testid="transition-contribution"
          >
            Contribution <strong>{transition.contribution}</strong>
          </span>
          {updatedState?.state === transition.target && (
            <span
              className="propagation-transition-updated"
              data-testid="transition-updated-target"
            >
              Resulting value <strong>{updatedState.value}</strong>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
