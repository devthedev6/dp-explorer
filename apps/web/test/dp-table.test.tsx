import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ExecutionFrame } from "@dp-explorer/playback";
import { EventType, toStateKey } from "@dp-explorer/core";

import { DPTable } from "../src/dp-table";

describe("DPTable", () => {
  it("renders a generic 1D table with computed, unknown, and active cells", () => {
    const frame = createFrame({
      dimensions: [4],
      stateVariables: ["i"],
      dpSnapshot: new Map([
        [toStateKey([0]), 0],
        [toStateKey([1]), 1]
      ]),
      highlightedCells: [{ state: toStateKey([1]), role: "active" }]
    });

    const html = renderToStaticMarkup(<DPTable frame={frame} />);

    expect(html).toContain('data-state="0"');
    expect(html).toContain('data-state="1"');
    expect(html).toContain('data-state="2"');
    expect(html).toContain('data-state="3"');
    expect(html).toContain('data-status="computed"');
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('data-role="active"');
    expect(html).toContain(">?</td>");
  });

  it("renders a generic 2D table and marks dependency cells from the frame", () => {
    const frame = createFrame({
      dimensions: [2, 3],
      stateVariables: ["i", "j"],
      dpSnapshot: new Map([
        [toStateKey([0, 0]), 0],
        [toStateKey([1, 2]), 5]
      ]),
      highlightedCells: [
        { state: toStateKey([1, 2]), role: "active" },
        { state: toStateKey([0, 0]), role: "dependency" }
      ]
    });

    const html = renderToStaticMarkup(<DPTable frame={frame} />);

    expect(html).toContain("i\\j");
    expect(html).toContain('data-state="0,0"');
    expect(html).toContain('data-state="1,2"');
    expect(html).toContain('data-role="active"');
    expect(html).toContain('data-role="dependency"');
    expect(html).toContain('aria-label="1,2: 5"');
  });
});

function createFrame({
  dimensions,
  stateVariables,
  dpSnapshot,
  highlightedCells
}: {
  readonly dimensions: readonly number[];
  readonly stateVariables: readonly string[];
  readonly dpSnapshot: ReadonlyMap<ReturnType<typeof toStateKey>, number>;
  readonly highlightedCells: ExecutionFrame["highlightedCells"];
}): ExecutionFrame {
  return {
    frameIndex: 0,
    currentEvent: {
      id: 0,
      type: EventType.Call,
      state: toStateKey([0]),
      depth: 0,
      parentId: null
    },
    table: {
      dimensions,
      stateVariables
    },
    dpSnapshot,
    callStack: [],
    recursionTree: null,
    activeNodeId: null,
    highlightedCells,
    resolvedDependencies: [],
    isFirst: true,
    isLast: false,
    totalFrames: 1
  };
}
