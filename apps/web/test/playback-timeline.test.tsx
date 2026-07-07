import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventType, toStateKey } from "@dp-explorer/core";
import type { ExecutionFrame } from "@dp-explorer/playback";

import { PlaybackTimeline } from "../src/playback-timeline";

describe("PlaybackTimeline", () => {
  it("renders total frame count and current frame position", () => {
    render(
      <PlaybackTimeline frame={createFrame({ frameIndex: 2, totalFrames: 8 })} onSeek={vi.fn()} />
    );

    expect(screen.getByTestId("timeline-position")).toHaveTextContent("3 / 8");
  });

  it("sets slider min, max, and value from the frame", () => {
    const { container } = render(
      <PlaybackTimeline frame={createFrame({ frameIndex: 3, totalFrames: 10 })} onSeek={vi.fn()} />
    );

    const slider = container.querySelector<HTMLInputElement>("input[type='range']");

    expect(slider).not.toBeNull();
    expect(slider!.min).toBe("0");
    expect(slider!.max).toBe("9");
    expect(slider!.value).toBe("3");
  });

  it("calls onSeek with the selected frame index when the slider changes", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <PlaybackTimeline frame={createFrame({ frameIndex: 0, totalFrames: 6 })} onSeek={onSeek} />
    );

    const slider = container.querySelector<HTMLInputElement>("input[type='range']")!;

    fireEvent.change(slider, { target: { value: "4" } });

    expect(onSeek).toHaveBeenCalledWith(4);
  });

  it("updates the displayed position and slider value when the frame changes", () => {
    const { container, rerender } = render(
      <PlaybackTimeline frame={createFrame({ frameIndex: 0, totalFrames: 6 })} onSeek={vi.fn()} />
    );

    rerender(
      <PlaybackTimeline frame={createFrame({ frameIndex: 4, totalFrames: 6 })} onSeek={vi.fn()} />
    );

    const slider = container.querySelector<HTMLInputElement>("input[type='range']")!;

    expect(screen.getByTestId("timeline-position")).toHaveTextContent("5 / 6");
    expect(slider.value).toBe("4");
  });
});

function createFrame({
  frameIndex,
  totalFrames
}: {
  readonly frameIndex: number;
  readonly totalFrames: number;
}): ExecutionFrame {
  return {
    frameIndex,
    currentEvent: {
      id: frameIndex,
      type: EventType.Call,
      state: toStateKey([frameIndex]),
      depth: 0,
      parentId: null
    },
    table: {
      dimensions: [totalFrames],
      stateVariables: ["i"]
    },
    dpSnapshot: new Map(),
    callStack: [],
    recursionTree: null,
    activeNodeId: null,
    highlightedCells: [],
    resolvedDependencies: [],
    isFirst: frameIndex === 0,
    isLast: frameIndex === totalFrames - 1,
    totalFrames
  };
}
