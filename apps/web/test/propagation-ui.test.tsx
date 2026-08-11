import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventType, toStateKey, type PropagationExecutionTrace } from "@dp-explorer/core";
import { createPlaybackController, type PlaybackFrame } from "@dp-explorer/playback";

import { DPTable } from "../src/dp-table";
import { FrameDetails } from "../src/frame-details";
import { PlaybackTimeline } from "../src/playback-timeline";
import { PropagationTransitionView } from "../src/propagation-transition";

describe("propagation frame UI", () => {
  it("renders propagation dpSnapshot cells with source and updated target highlights", () => {
    const controller = createPlaybackController(createPropagationTrace());
    const frame = controller.seek(3);

    const html = renderToStaticMarkup(<DPTable frame={frame} />);

    expect(html).toContain('data-state="0"');
    expect(html).toContain('data-state="1"');
    expect(html).toContain('data-role="active"');
    expect(html).toContain('data-role="updated"');
    expect(html).toContain('aria-label="0: 1"');
    expect(html).toContain('aria-label="1: 1"');
  });

  it("renders an active propagation transition from the current frame", () => {
    const controller = createPlaybackController(createPropagationTrace());
    const frame = controller.seek(2);

    render(<PropagationTransitionView frame={frame} />);

    expect(screen.getByTestId("propagation-transition-edge")).toHaveAttribute(
      "data-active",
      "true"
    );
    expect(screen.getByTestId("transition-source")).toHaveTextContent("0");
    expect(screen.getByTestId("transition-target")).toHaveTextContent("1");
    expect(screen.getByTestId("transition-contribution")).toHaveTextContent("1");
  });

  it("renders propagation update details for initialization events", () => {
    const controller = createPlaybackController(createPropagationTrace());
    const frame = controller.seek(3);

    render(<FrameDetails frame={frame} />);

    expect(screen.getByTestId("propagation-source")).toHaveTextContent("0");
    expect(screen.getByTestId("propagation-target")).toHaveTextContent("1");
    expect(screen.getByTestId("previous-value")).toHaveTextContent("N/A");
    expect(screen.getByTestId("contribution")).toHaveTextContent("1");
    expect(screen.getByTestId("updated-value")).toHaveTextContent("1");
    expect(screen.getByTestId("update-mode")).toHaveTextContent("initialized");
    expect(screen.getByTestId("aggregation-operation")).toHaveTextContent("N/A");
  });

  it("renders propagation update details for aggregation events", () => {
    const controller = createPlaybackController(createPropagationTrace());
    const frame = controller.seek(6);

    render(<FrameDetails frame={frame} />);

    expect(screen.getByTestId("propagation-source")).toHaveTextContent("0");
    expect(screen.getByTestId("propagation-target")).toHaveTextContent("1");
    expect(screen.getByTestId("previous-value")).toHaveTextContent("1");
    expect(screen.getByTestId("contribution")).toHaveTextContent("2");
    expect(screen.getByTestId("updated-value")).toHaveTextContent("3");
    expect(screen.getByTestId("update-mode")).toHaveTextContent("aggregated");
    expect(screen.getByTestId("aggregation-operation")).toHaveTextContent("aggregate");
  });

  it("seeks over propagation frames without re-running DP in React", () => {
    const controller = createPlaybackController(createPropagationTrace());
    const onSeek = vi.fn((index: number) => {
      controller.seek(index);
    });

    render(<PlaybackTimeline frame={controller.currentFrame()} onSeek={onSeek} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "6" } });

    expect(onSeek).toHaveBeenCalledWith(6);
    const currentFrame = controller.currentFrame();
    expect(currentFrame.currentEvent.type).toBe(EventType.PropagationUpdate);
    expect(currentFrame.dpSnapshot.get(toStateKey([1]))).toBe(3);
  });

  it("continues to render functional playback frames through the shared timeline", () => {
    const frame: PlaybackFrame = {
      frameIndex: 1,
      currentEvent: {
        id: 1,
        type: EventType.Write,
        state: toStateKey([1]),
        value: 1
      },
      table: {
        dimensions: [2],
        stateVariables: ["i"]
      },
      dpSnapshot: new Map([[toStateKey([1]), 1]]),
      callStack: [],
      recursionTree: null,
      activeNodeId: null,
      highlightedCells: [{ state: toStateKey([1]), role: "active" }],
      resolvedDependencies: [],
      isFirst: false,
      isLast: true,
      totalFrames: 2
    };

    render(<PlaybackTimeline frame={frame} onSeek={vi.fn()} />);

    expect(screen.getByTestId("timeline-position")).toHaveTextContent("2 / 2");
  });
});

function createPropagationTrace(): PropagationExecutionTrace {
  return {
    problemId: "propagation-test",
    mode: "propagation",
    input: {},
    stateVariables: ["i"],
    dimensions: [3],
    events: [
      {
        id: 0,
        type: EventType.PropagationSeed,
        state: toStateKey([0]),
        value: 1
      },
      {
        id: 1,
        type: EventType.PropagationProcess,
        state: toStateKey([0]),
        value: 1
      },
      {
        id: 2,
        type: EventType.PropagationTransition,
        processId: 1,
        source: toStateKey([0]),
        target: toStateKey([1]),
        contribution: 1
      },
      {
        id: 3,
        type: EventType.PropagationUpdate,
        processId: 1,
        source: toStateKey([0]),
        target: toStateKey([1]),
        previousValue: null,
        contribution: 1,
        updatedValue: 1,
        operation: "initialize"
      },
      {
        id: 4,
        type: EventType.PropagationTransition,
        processId: 1,
        source: toStateKey([0]),
        target: toStateKey([1]),
        contribution: 2
      },
      {
        id: 5,
        type: EventType.PropagationTransition,
        processId: 1,
        source: toStateKey([0]),
        target: toStateKey([1]),
        contribution: 2
      },
      {
        id: 6,
        type: EventType.PropagationUpdate,
        processId: 1,
        source: toStateKey([0]),
        target: toStateKey([1]),
        previousValue: 1,
        contribution: 2,
        updatedValue: 3,
        operation: "aggregate"
      },
      {
        id: 7,
        type: EventType.Complete,
        answer: 3
      }
    ]
  };
}
