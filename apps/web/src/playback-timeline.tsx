import type { ExecutionFrame } from "@dp-explorer/playback";

import "./playback-timeline.css";

export interface PlaybackTimelineProps {
  readonly frame: ExecutionFrame;
  readonly onSeek: (frameIndex: number) => void;
}

/**
 * Minimal generic playback timeline.
 *
 * Displays the current frame position and total frame count, and provides a
 * range input to seek to any frame. It is a controlled component: the
 * caller (e.g. `App`) maps the requested index through `PlaybackController.seek`
 * and supplies the resulting frame back as props.
 */
export function PlaybackTimeline({ frame, onSeek }: PlaybackTimelineProps) {
  const lastIndex = frame.totalFrames - 1;

  return (
    <section aria-label="Playback timeline" className="playback-timeline">
      <label className="playback-timeline-label" htmlFor="playback-slider">
        Frame
      </label>

      <input
        id="playback-slider"
        className="playback-timeline-slider"
        type="range"
        min={0}
        max={lastIndex}
        value={frame.frameIndex}
        step={1}
        onChange={(event) => {
          const index = Number.parseInt(event.currentTarget.value, 10);
          if (!Number.isNaN(index)) {
            onSeek(index);
          }
        }}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={frame.frameIndex}
      />

      <output className="playback-timeline-position" data-testid="timeline-position">
        {frame.frameIndex + 1} / {frame.totalFrames}
      </output>
    </section>
  );
}
