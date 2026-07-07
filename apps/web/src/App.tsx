import { useMemo, useState } from "react";
import type { ExecutionFrame } from "@dp-explorer/playback";

import { createFibonacciDemoSession } from "./demo-session";
import { FrameView } from "./frame-view";
import { PlaybackTimeline } from "./playback-timeline";

export function App() {
  const session = useMemo(() => createFibonacciDemoSession(), []);
  const [frame, setFrame] = useState<ExecutionFrame>(() => session.currentFrame());

  return (
    <main>
      <h1>DP Explorer</h1>
      <p>Fibonacci verification shell</p>

      <nav aria-label="Playback controls">
        <button type="button" onClick={() => setFrame(session.previous())} disabled={frame.isFirst}>
          Previous
        </button>
        <button type="button" onClick={() => setFrame(session.next())} disabled={frame.isLast}>
          Next
        </button>
        <button type="button" onClick={() => setFrame(session.reset())} disabled={frame.isFirst}>
          Reset
        </button>
      </nav>

      <FrameView frame={frame} />

      <PlaybackTimeline
        frame={frame}
        onSeek={(index) => setFrame(session.controller.seek(index))}
      />
    </main>
  );
}
