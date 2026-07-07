import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ExecutionFrame, RecursionNode } from "@dp-explorer/playback";
import { EventType, toStateKey } from "@dp-explorer/core";

import { RecursionTreeView } from "../src/recursion-tree";

describe("RecursionTreeView", () => {
  it("hides the panel when the frame has no recursion tree", () => {
    const frame = createFrame({
      recursionTree: null,
      activeNodeId: null
    });

    const html = renderToStaticMarkup(<RecursionTreeView frame={frame} />);

    expect(html).toBe("");
  });

  it("renders nested nodes from the frame recursion tree", () => {
    const frame = createFrame({
      recursionTree: {
        rootId: 0,
        nodes: new Map([
          [0, openNode({ callEventId: 0, parentCallId: null, state: toStateKey([4]) })],
          [1, completedNode({ callEventId: 1, parentCallId: 0, state: toStateKey([3]), value: 2 })],
          [2, openNode({ callEventId: 2, parentCallId: 0, state: toStateKey([2]) })]
        ])
      },
      activeNodeId: 2
    });

    const html = renderToStaticMarkup(<RecursionTreeView frame={frame} />);

    expect(html).toContain('data-testid="recursion-tree"');
    expect(html).toContain('data-node-id="0"');
    expect(html).toContain('data-node-id="1"');
    expect(html).toContain('data-node-id="2"');
    expect(html).toContain('data-state="4"');
    expect(html).toContain('data-state="3"');
    expect(html).toContain('data-state="2"');
  });

  it("marks the active node, active branch, and completed nodes", () => {
    const frame = createFrame({
      recursionTree: {
        rootId: 0,
        nodes: new Map([
          [0, openNode({ callEventId: 0, parentCallId: null, state: toStateKey([4]) })],
          [1, completedNode({ callEventId: 1, parentCallId: 0, state: toStateKey([3]), value: 2 })],
          [2, openNode({ callEventId: 2, parentCallId: 0, state: toStateKey([2]) })]
        ])
      },
      activeNodeId: 2
    });

    const html = renderToStaticMarkup(<RecursionTreeView frame={frame} />);

    expect(html).toContain(
      'data-node-id="0" data-state="4" data-active="false" data-active-branch="true"'
    );
    expect(html).toContain(
      'data-node-id="1" data-state="3" data-active="false" data-active-branch="false" data-completed="true"'
    );
    expect(html).toContain(
      'data-node-id="2" data-state="2" data-active="true" data-active-branch="true"'
    );
    expect(html).toContain("return: 2");
  });
});

function createFrame({
  recursionTree,
  activeNodeId
}: {
  readonly recursionTree: ExecutionFrame["recursionTree"];
  readonly activeNodeId: ExecutionFrame["activeNodeId"];
}): ExecutionFrame {
  return {
    frameIndex: 0,
    currentEvent: {
      id: 0,
      type: EventType.Call,
      state: toStateKey([4]),
      depth: 0,
      parentId: null
    },
    table: {
      dimensions: [5],
      stateVariables: ["i"]
    },
    dpSnapshot: new Map(),
    callStack: [],
    recursionTree,
    activeNodeId,
    highlightedCells: [],
    resolvedDependencies: [],
    isFirst: true,
    isLast: false,
    totalFrames: 1
  };
}

function openNode({
  callEventId,
  parentCallId,
  state
}: Pick<RecursionNode, "callEventId" | "parentCallId" | "state">): RecursionNode {
  return {
    callEventId,
    parentCallId,
    state,
    outcome: null,
    terminalEventId: null,
    value: null
  };
}

function completedNode({
  callEventId,
  parentCallId,
  state,
  value
}: Pick<RecursionNode, "callEventId" | "parentCallId" | "state" | "value">): RecursionNode {
  return {
    callEventId,
    parentCallId,
    state,
    outcome: "return",
    terminalEventId: callEventId + 10,
    value
  };
}
