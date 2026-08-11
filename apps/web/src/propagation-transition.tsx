import type { PlaybackFrame, PropagationExecutionFrame } from "@dp-explorer/playback";

import "./propagation-transition.css";

export interface PropagationTransitionViewProps {
  readonly frame: PlaybackFrame;
}

export function PropagationTransitionView({ frame }: PropagationTransitionViewProps) {
  if (!isPropagationFrame(frame)) {
    return null;
  }

  const transition = frame.activeTransition;

  return (
    <section aria-label="Propagation transition" className="propagation-transition-panel">
      <h2>Propagation transition</h2>
      {transition === null ? (
        <p data-testid="propagation-transition-empty">No active transition</p>
      ) : (
        <div
          className="propagation-transition-edge"
          data-testid="propagation-transition-edge"
          data-active="true"
        >
          <span className="propagation-transition-state" data-testid="transition-source">
            {transition.source}
          </span>
          <span className="propagation-transition-arrow" aria-hidden="true">
            -&gt;
          </span>
          <span className="propagation-transition-state" data-testid="transition-target">
            {transition.target}
          </span>
          <span
            className="propagation-transition-contribution"
            data-testid="transition-contribution"
          >
            contribution {transition.contribution}
          </span>
        </div>
      )}
    </section>
  );
}

function isPropagationFrame(frame: PlaybackFrame): frame is PropagationExecutionFrame {
  return "processedState" in frame;
}
